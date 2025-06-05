import geopandas as gpd

gdf = gpd.read_file("ne_10m_admin_1_states_provinces.shp") # open file
gdf = gdf[["name_en", "geometry"]] # use english names
gdf = gdf.rename(columns={"name_en": "name"})  # cleaner output
gdf.to_file("world_regions.geo.json", driver="GeoJSON") # output file
