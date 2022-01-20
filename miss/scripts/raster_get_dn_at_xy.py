import rasterio
import socket
import json
import pandas as pd 


# In 3857
data = pd.read_csv("/Users/zzz/exp/jrc/sqkm/grid/grid_mos.csv") 

# left,top,right,bottom,id
sales = []

# In 3857
with rasterio.open('/Users/zzz/exp/jrc/sqkm/GHS_BUILT_LDS2014_GLOBE_R2016A_54009_1k_v1_0/GHS_BUILT_LDS2014_GLOBE_R2016A_54009_1k_v1_0_3857.tif') as src:
    
    for index, row in data.iterrows():
        centre_x = (row['left']+row['right'])/2
        centre_y = (row['top']+row['bottom'])/2
        # print(centre_x, centre_y)
        vals = src.sample([(centre_x, centre_y)])
        for val in vals:
            # print(val)
            sales.append({'left': row['left'], 'top': row['top'], 'right': row['right'], 'bottom': row['bottom'], 'id': row['id'], 'dn': val[0]})

df = pd.DataFrame(sales)

print(df)

df.to_csv (r'/Users/zzz/exp/jrc/sqkm/bruned/raster_mos.csv', index = None, header=True) #Don't forget to add '.csv' at the end of the path
