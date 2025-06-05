from tkinter import Tk, filedialog
import duckdb
import random
import shutil
import os
import polars as pl

def get_duckdb_in_path():
    Tk().withdraw()   
    file = filedialog.askopenfilename(filetypes=[("duckdb file", ".duckdb")])
    return file

def get_duckdb_out_path():
    Tk().withdraw()   
    file = filedialog.asksaveasfilename(filetypes=[("duckdb file", ".duckdb")])
    return file

category_df = pl.DataFrame({
    'name': ['location', 'Netherlands', 'Belgium', 'South Holland', 'North Holland', 'Antwerp', 'technology', 'renewable', 'fossil', 'solar', 'wind', 'ccgt'],
    'parent_id': [None, 1, 1, 2, 2, 3, None, 7, 7, 8, 8, 9],
    'level': [-1, 1, 1, 0, 0, 0, -1, 1, 1, 0, 0, 0]
})

recursive_root_leaf_sql = """
    -- https://duckdb.org/docs/stable/sql/query_syntax/with.html#recursive-ctes
    WITH RECURSIVE RootLeafID_unfiltered (
        root_id, leaf_id
    ) AS (
        -- Base case
        SELECT c.id, c.id
            FROM category c
            WHERE c.level = -1
        UNION ALL
        -- Recursive step
        SELECT rl.root_id, c.id
            FROM RootLeafID_unfiltered rl
            JOIN category c ON c.parent_id = rl.leaf_id
            -- will terminate when leaf because no more rows will be added
    ),
    RootLeafID as (
        SELECT rl.* 
            FROM RootLeafID_unfiltered rl
            JOIN category c ON c.id = rl.leaf_id
            WHERE c.level = 0
    )

    SELECT rl.*
        FROM RootLeafID rl
        JOIN category c ON c.id = rl.leaf_id
        ORDER BY rl.root_id, rl.leaf_id
"""


# 1) select in- and output-file
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
    # row by row because otherwise, foreign key on self is violated
    for row in category_df.iter_rows():
        conn.execute("""
            INSERT INTO category (name, parent_id, level)
            VALUES (?, ?, ?)
        """, (row[0], row[1], row[2]))


    # 5) create asset_category table ...
    # 5a) create table
    conn.execute("""
        CREATE TABLE asset_category(
            asset VARCHAR REFERENCES asset(asset),
            root_id INTEGER NOT NULL REFERENCES category(id),
            leaf_id INTEGER NOT NULL REFERENCES category(id),
            PRIMARY KEY (asset, root_id)
        );
    """)

    # 6) randomly add metadata for each asset
    # 6a) select al level-0 category-ids for two category types
    rows = root_leaf_ids = conn.execute(recursive_root_leaf_sql).fetchall()
    
    grouped = {}
    for root_id, leaf_id in rows:
        grouped.setdefault(root_id, []).append(leaf_id)
    
    # 6b) for each row in asset, add a row in asset_metadata with a random L0-category assigned
    assets = conn.execute("SELECT asset FROM asset;").fetchall()
    
    for root_id in grouped.keys():
        current_leave_ids = grouped.get(root_id)
        for (asset,) in assets:
            leaf_id = random.choice(current_leave_ids)
            conn.execute(f"INSERT INTO asset_category VALUES (?, ?, ?);", (asset, root_id, leaf_id))
    

finally:
    # cleanup
    conn.close()
