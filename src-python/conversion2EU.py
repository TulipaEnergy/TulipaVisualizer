#!/usr/bin/env python3
"""
Natural Earth Admin-1 → European provinces (GeoPandas edition, v2.2 – resilient ISO‑2 handling)

Result: the script completes happily whether the NE dump provides `ISO_A2`,
`iso_a2`, or none at all.  Tested on multiple mirrors + Pandas 2.1/2.2.
"""
from pathlib import Path
from typing import Mapping, Optional

import geopandas as gpd
import pandas as pd

# ────────────────────────────────────────────────────────── 0. FILES
OUT_PATH = Path("eu_provinces.geo.json")   # kept for backward compatibility

# ───────────────────────────────────────────────────────── 1. SOURCES
NE_ADMIN1_URL = (
    "https://naturalearth.s3.amazonaws.com/"
    "10m_cultural/ne_10m_admin_1_states_provinces.zip"
)
NE_COUNTRIES_URL = (
    "https://naturalearth.s3.amazonaws.com/"
    "110m_cultural/ne_110m_admin_0_countries.zip"
)

# ──────────────────────────────────────────────────────── 2. PREP COUNTRIES
world = gpd.read_file(NE_COUNTRIES_URL).to_crs(4326)

# --------------------------- 2a. Find ISO‑3 + names (case insensitive)
ISO3_COL = next(c for c in ["iso_a3", "ISO_A3", "ISO_A3_EH", "ADM0_A3"] if c in world)
NAME_COLS = [c for c in [
    "name", "NAME", "NAME_LONG", "SOVEREIGNT", "admin", "ADMIN"
] if c in world]

# --------------------------- 2b. Locate any ISO‑2 column and standardise → iso2
ISO2_CANDIDATES = ["iso_a2", "ISO_A2", "ISO_A2_EH"]
iso2_source: Optional[str] = next((c for c in ISO2_CANDIDATES if c in world), None)

if iso2_source:
    world["iso2"] = world[iso2_source]
else:
    # create empty column as placeholder – we might fill some rows via pycountry
    world["iso2"] = pd.NA

# Europe == continent "Europe" plus Cyprus (flagged as Asia in NE)
europe_mask = (world["CONTINENT"] == "Europe") | (world["NAME"].isin(["Cyprus"]))

cols_to_keep = [ISO3_COL, "iso2", *NAME_COLS, "geometry"]
europe = world.loc[europe_mask, cols_to_keep]

europe["iso2"] = europe["iso2"].astype("string")  # ensure .str works even if all NaN

# --------------------------- 2c. Build ISO sets
EURO_ISO3 = set(europe[ISO3_COL].dropna().str.upper())
EURO_ISO2 = set(europe["iso2"].dropna().str.upper())

# If the NE dump had no iso‑2 column, derive from iso‑3 via pycountry (best‑effort)
if not EURO_ISO2:
    try:
        import pycountry
        EURO_ISO2 = {
            (pc := pycountry.countries.get(alpha_3=code)).alpha_2
            for code in EURO_ISO3
            if pc is not None
        }
    except ModuleNotFoundError:
        EURO_ISO2 = set()  # fallback – spatial filter will still catch everything

# lowercase name set for case‑insensitive comparison later
EURO_NAMES_CI = {
    str(name).casefold()
    for name in pd.concat([europe[c] for c in NAME_COLS])
    if pd.notna(name)
}

# ──────────────────────────────────────────────────────── 3. HELPERS
CANDIDATE_FIELDS = [
    # common property names in province/district layers
    "admin", "ADMIN",
    "adm0_name", "ADM0_NAME", "NAME_0",
    "country", "COUNTRY", "CNTRY_NAME", "COUNTRYAFF", "SOVEREIGNT",
    "iso_a2", "ISO_A2", "iso_3166_2",
    "iso_a3", "ISO_A3", "ADM0_A3",
]

def is_european(props: Mapping) -> bool:
    """Return **True** iff *props* belongs to a European country."""
    for fld in CANDIDATE_FIELDS:
        if fld not in props:
            continue
        val = props.get(fld)
        if not val:
            continue
        val_s = str(val).strip()
        # ISO‑2 → ISO‑3 → names (all case‑insensitive)
        if len(val_s) == 2 and val_s.upper() in EURO_ISO2:
            return True
        if len(val_s) == 3 and val_s.upper() in EURO_ISO3:
            return True
        if val_s.casefold() in EURO_NAMES_CI:
            return True
    return False

# ──────────────────────────────────────────────────────── 4. LOAD PROVINCES
provinces = gpd.read_file(NE_ADMIN1_URL)
provinces = provinces.to_crs(4326) if provinces.crs else provinces.set_crs(4326)

# ─────────────────────────────────────────────── 5. ATTRIBUTE FILTER
if (
    "properties" in provinces.columns
    and provinces["properties"].apply(lambda x: isinstance(x, dict)).all()
):
    mask_attr = provinces["properties"].apply(is_european)
else:
    mask_attr = provinces.apply(is_european, axis=1)

attr_hits = provinces[mask_attr]
rest = provinces[~mask_attr]

# ─────────────────────────────────────────────── 6. SPATIAL FALL‑BACK
proj_crs = 3035  # LAEA Europe – good compromise for continental centroiding
rest_cent = rest.to_crs(proj_crs).centroid.to_crs(4326)
rest_cent_df = gpd.GeoDataFrame(geometry=rest_cent, crs=4326)

rest_joined = gpd.sjoin(
    rest_cent_df,
    europe[[ISO3_COL, "geometry"]],
    how="inner",
    predicate="intersects",  # forgiving near coarse coastlines
    rsuffix="_eu",
)
spat_hits = rest.loc[rest_joined.index]

# ─────────────────────────────────────────────── 7. MERGE & SAVE
european_provinces = pd.concat([attr_hits, spat_hits]).sort_index()

# Select and clean up columns for the final output
cols_to_keep = [
    "name",
    "name_en",
    "iso_a2",
    "iso_a3",
    "adm0_name",
    "type_en",
    "geometry",
]
# Filter for columns that actually exist in the dataframe
existing_cols = [c for c in cols_to_keep if c in european_provinces.columns]
european_provinces = european_provinces[existing_cols]

# Prioritize English name, then drop the redundant column
if "name_en" in european_provinces.columns and "name" in european_provinces.columns:
    european_provinces["name"] = european_provinces["name_en"].fillna(
        european_provinces["name"]
    )
    european_provinces = european_provinces.drop(columns=["name_en"])

european_provinces.to_file(OUT_PATH, driver="GeoJSON")
print(f"✅  {len(european_provinces):,} provinces kept → {OUT_PATH}")
