import rasterio
from rasterio.warp import calculate_default_transform, reproject, Resampling
import matplotlib.pyplot as plt
import numpy as np
from PIL import Image

input_tif = "thz_class_ENSEMBLE_rcp8p5_2020s.tif"
output_tif = "thz_4326.tif"

# --- 1. Reproject to EPSG:4326 (Your code, unchanged) ---
with rasterio.open(input_tif) as src:
    transform, width, height = calculate_default_transform(
        src.crs, "EPSG:4326", src.width, src.height, *src.bounds
    )
    kwargs = src.meta.copy()
    kwargs.update({
        "crs": "EPSG:4326",
        "transform": transform,
        "width": width,
        "height": height
    })

    with rasterio.open(output_tif, "w", **kwargs) as dst:
        for i in range(1, src.count + 1):
            reproject(
                source=rasterio.band(src, i),
                destination=rasterio.band(dst, i),
                src_transform=src.transform,
                src_crs=src.crs,
                dst_transform=transform,
                dst_crs="EPSG:4326",
                resampling=Resampling.nearest
            )

# --- 2. Convert to PNG using PIL (New, fixed method) ---
print(f"Converting {output_tif} to PNG...")
with rasterio.open(output_tif) as src:
    img_array = src.read(1)
    
    # Get the bounding box to use in your HTML
    # You MUST use these exact bounds in the HTML file
    print("--- IMPORTANT ---")
    print(f"Use these bounds in your HTML: [ [{src.bounds.bottom}, {src.bounds.left}], [{src.bounds.top}, {src.bounds.right}] ]")
    print("-----------------")
    
    # Get the colormap
    cmap = plt.get_cmap('turbo')
    
    # Normalize the data (map 0-max to 0-1)
    nodata = src.nodata
    if nodata is not None:
        img_array = np.ma.masked_equal(img_array, nodata)
    
    min_val = img_array.min()
    max_val = img_array.max()
    
    if max_val == min_val:
        normalized_data = np.zeros(img_array.shape)
    else:
        normalized_data = (img_array - min_val) / (max_val - min_val)
        
    # Apply the colormap -> returns an (H, W, 4) RGBA array
    rgba_array = cmap(normalized_data)
    
    # Convert from 0-1 float to 0-255 integer
    rgba_array_uint8 = (rgba_array * 255).astype(np.uint8)
    
    # Handle nodata: make it transparent
    if nodata is not None:
        rgba_array_uint8[img_array.mask, 3] = 0 # Set alpha to 0 for masked pixels
        
    # Create a PIL Image and save (bypasses matplotlib.savefig)
    pil_img = Image.fromarray(rgba_array_uint8, 'RGBA')
    pil_img.save("thz_4326.png")
    
    print(f"Successfully saved thz_4326.png with dimensions {pil_img.size}")