import os
import geopandas as gpd

# Step 1: Read simplified_final_score_heat2.geojson and extract features where Final_score_4_perc is not 0
def filter_non_zero_scores(input_file, output_file):
    # Read the GeoJSON file
    gdf = gpd.read_file(input_file)
    # Filter features where Final_score_4_perc is not 0
    filtered_gdf = gdf[gdf["Final_score_4_perc"] != 0]
    # Save the filtered result as a new GeoJSON file
    filtered_gdf.to_file(output_file, driver="GeoJSON")
    print(f"Filtered GeoJSON saved to {output_file}")

# Step 2: Iterate through each Buurt in buurt.geojson, extract intersecting features, and save as new GeoJSON files
def extract_features_by_buurt(buurt_file, simplified_file, output_folder):
    # Read buurt and simplified data
    buurt_gdf = gpd.read_file(buurt_file)
    simplified_gdf = gpd.read_file(simplified_file)
    
    # Create output folder
    if not os.path.exists(output_folder):
        os.makedirs(output_folder)
    
    # Iterate through each Buurt
    for index, buurt_row in buurt_gdf.iterrows():
        # Get the geometry of the current Buurt
        buurt_geometry = buurt_row.geometry
        buurt_code = buurt_row["Buurtcode"]  # Assume "Buurtcode" is the unique identifier for Buurt
        
        # Filter simplified data that intersects with the current Buurt
        intersected_gdf = simplified_gdf[simplified_gdf.intersects(buurt_geometry)]
        
        # If there are intersecting features, save as a separate file
        if not intersected_gdf.empty:
            output_path = os.path.join(output_folder, f"{buurt_code}.geojson")
            intersected_gdf.to_file(output_path, driver="GeoJSON")
            print(f"Saved intersected data for {buurt_code} to {output_path}")
        else:
            print(f"No intersected data for {buurt_code}")

# Main program
if __name__ == "__main__":
    # Input file paths
    simplified_file = "simplified_final_score_heat2.geojson"
    buurt_file = "buurt.geojson"
    
    # Output file paths
    filtered_file = "filtered_4_percentage.geojson"
    output_folder = "Buurt_data"
    
    # Execute steps
    filter_non_zero_scores(simplified_file, filtered_file)
    extract_features_by_buurt(buurt_file, simplified_file, output_folder)
