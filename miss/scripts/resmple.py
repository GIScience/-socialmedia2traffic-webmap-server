import rasterio
import socket
# from rasterio.enums import Resampling

# with rasterio.open("/Users/zzz/exp/jrc/1sqkm/GHS_BUILT_LDS2014_GLOBE_R2016A_54009_1k_v1_0/GHS_BUILT_LDS2014_GLOBE_R2016A_54009_1k_v1_0_4326.tif") as dataset:
#     data = dataset.read(
#         out_shape=(dataset.height / 2, dataset.width / 2, dataset.count),
#         resampling= Resampling.average
#         # print(dataset)
#     )

# from osgeo import gdal

# ds = gdal.Open('/Users/zzz/exp/jrc/1sqkm/GHS_BUILT_LDS2014_GLOBE_R2016A_54009_1k_v1_0/GHS_BUILT_LDS2014_GLOBE_R2016A_54009_1k_v1_0_4326.tif')
# # ds = gdal.Translate('/Users/zzz/exp/jrc/1sqkm/GHS_BUILT_LDS2014_GLOBE_R2016A_54009_1k_v1_0/GHS_BUILT_LDS2014_GLOBE_R2016A_54009_1k_v1_0_4326_new.tif', ds, projWin = [-15.81625, 34.99484,-15.77946,35.01448])
# ds = None

# with rasterio.drivers():

# Read raster bands directly to Numpy arrays.
#
with rasterio.open('/Users/zzz/exp/jrc/1sqkm/GHS_BUILT_LDS2014_GLOBE_R2016A_54009_1k_v1_0/GHS_BUILT_LDS2014_GLOBE_R2016A_54009_1k_v1_0_4326_crop.tif') as src:
    x = 35.40318
    y = -15.81853

    vals = src.sample([(x, y)])
    for val in vals:
        print(val)