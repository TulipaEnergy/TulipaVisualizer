from tkinter import Tk, filedialog
import duckdb
import random
import shutil
import os

# 1) user interaction
def get_duckdb_in_path():
    Tk().withdraw()   
    file = filedialog.askopenfilename(filetypes=[("duckdb file", ".duckdb")])
    return file

def get_duckdb_out_path():
    Tk().withdraw()   
    file = filedialog.asksaveasfilename(filetypes=[("duckdb file", ".duckdb")])
    return file


# 2) create a copy of duckdb file
file = get_duckdb_in_path()
out_path = get_duckdb_out_path()
shutil.copy2(file, out_path)

try:
    conn = duckdb.connect(out_path)

    # 3) make asset.asset primary key
    # 3a) fetching schema
    columns = conn.execute("""
        SELECT column_name, data_type
            FROM information_schema.columns
            WHERE table_name = 'asset'
            ORDER BY ordinal_position
    """).fetchall()


    # 3b) creating part of query for CREATE
    cols_with_types = ", ".join(f'"{col[0]}" {col[1]}' for col in columns[1:])

    # 3c) creating part of query for SELECT
    column_list = ", ".join(f'"{col[0]}"' for col in columns)

    # 3e) create table
    create_table_sql = f"""
        CREATE TABLE asset_new (
            asset VARCHAR PRIMARY KEY,
            {cols_with_types}
        )
    """
    conn.execute(create_table_sql)


    # 3f) transfer data to new table
    insert_sql = f"""
        INSERT INTO asset_new ({column_list})
        SELECT {column_list} FROM asset
    """
    conn.execute(insert_sql)

    # 3g) rename table and remove old
    conn.execute(f"DROP TABLE asset")
    conn.execute(f"ALTER TABLE asset_new RENAME TO asset")


    # 4) setup category table (ID, name, parent_ID, level)
    # 4a) auto-generate IDS
    conn.execute("CREATE SEQUENCE PK_category_seq START 1;")

    # 4b) create table
    conn.execute("""
        CREATE TABLE category (
            id INTEGER PRIMARY KEY DEFAULT NEXTVAL('PK_category_seq'),
            name VARCHAR UNIQUE NOT NULL,
            parent_id INTEGER REFERENCES category(id),
            level INTEGER
        );
    """)

    # 4c) insert some example data
    conn.execute("""
        INSERT INTO category (name, parent_id, level) VALUES
            ('Netherlands', NULL, 1),
            ('Belgium', NULL, 1);
        INSERT INTO category (name, parent_id, level) VALUES
            ('South-Holland', 1, 0),
            ('North-Holland', 1, 0),
            ('Antwerp', 2, 0);
    """)


    # 5) create asset_metadata table (asset_id, category_id) (later also things like coordinates and energy carrier type)
    # 5a) create table
    conn.execute("""
        CREATE TABLE asset_metadata(
            asset VARCHAR PRIMARY KEY REFERENCES asset(asset),
            category_id INTEGER NOT NULL REFERENCES category(id)
        );
    """)

    # 6) randomly add metadata for each asset
    # 6a) select al level-0 category-ids
    cat_ids = conn.execute("""
        SELECT id FROM category
            WHERE level = 0;
    """).fetchall()
    
    # 6b) for each row in asset, add a row in asset_metadata with a random L0-category assigned
    assets = conn.execute("SELECT asset FROM asset;").fetchall()
    
    for (asset,) in assets:
        (cat_id,) = random.choice(cat_ids)
        conn.execute(f"INSERT INTO asset_metadata VALUES (?, ?);", (asset, cat_id))


finally:
    # cleanup
    conn.close()
