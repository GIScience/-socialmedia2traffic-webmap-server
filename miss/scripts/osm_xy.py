import rasterio
import socket
import json
import pandas as pd 
import geopandas as gpd
from shapely.geometry import Point
from shapely.geometry.polygon import Polygon


# In 3857
data = pd.read_csv("/Users/zzz/exp/jrc/sqkm/grid/grid_mos.csv") 

# left,top,right,bottom,id
sales = []
sales1 = []

dataosm = gpd.read_file("/Users/zzz/exp/jrc/sqkm/OhSome/osm_3857.geojson") 


for index, row in dataosm.iterrows():
    if row['name'] is not None or row['@version'] > 1:
        sales.append(row['geometry'])

dataosm_final = pd.DataFrame(sales)

aa = 1

for index, row in data.iterrows():
    print(aa)
    aa += 1
    count = 0
    polygon = Polygon([(row['left'], row['bottom']), (row['right'], row['bottom']), (row['right'], row['top']), (row['left'], row['top'])])
    # print (row['left'])
    for index1, row1 in dataosm_final.iterrows():
        # print(row1)
        if (type(row1[0]).__name__ == 'Point'):
            # print(type(row1[0]))
            if (polygon.contains(row1[0])):
                count += 1
            # print(polygon.contains(row1[0]))

        elif (type(row1[0]).__name__ == 'Polygon'):
            centre = row1[0].centroid.coords
            point = Point(centre)
            # print(point)
            if (polygon.contains(point)):
                count += 1
        
    sales1.append({'left': row['left'], 'top': row['top'], 'right': row['right'], 'bottom': row['bottom'], 'id': row['id'], 'count': count})


df = pd.DataFrame(sales1)

print(df)

df.to_csv (r'/Users/zzz/exp/jrc/sqkm/bruned/ohsome_mos.csv', index = None, header=True) #Don't forget to add '.csv' 

    # if isinstance(row[0], Polygon):
    #     print("zz")
    # print(type(row[0]))

# print(df) 

# In 3857
# with rasterio.open('/Users/zzz/exp/jrc/1sqkm/GHS_BUILT_LDS2014_GLOBE_R2016A_54009_1k_v1_0/GHS_BUILT_LDS2014_GLOBE_R2016A_54009_1k_v1_0_3857_crop.tif') as src:
    
#     for index, row in data.iterrows():
#         centre_x = (row['left']+row['right'])/2
#         centre_y = (row['top']+row['bottom'])/2
#         # print(centre_x, centre_y)
#         vals = src.sample([(centre_x, centre_y)])
#         for val in vals:
#             # print(val)
#             sales.append({'left': row['left'], 'top': row['top'], 'right': row['right'], 'bottom': row['bottom'], 'id': row['id'], 'dn': val[0]})


# print(dataosm)

# df.to_csv (r'/Users/zzz/exp/jrc/1sqkm/bruned/raster.csv', index = None, header=True) #Don't forget to add '.csv' at the end of the path
