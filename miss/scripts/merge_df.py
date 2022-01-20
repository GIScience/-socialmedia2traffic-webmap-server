import rasterio
import socket
import json
import pandas as pd 
from functools import reduce



# In 3857
data_raster = pd.read_csv("/Users/zzz/exp/jrc/sqkm/bruned/raster_mos.csv") 

data_osm = pd.read_csv("/Users/zzz/exp/jrc/sqkm/bruned/ohsome_mos.csv") 

data_frames = [data_raster, data_osm]

sales = []

df_merged = reduce(lambda  left,right: pd.merge(left,right,on=['id'],
                                            how='outer'), data_frames)

for index, row in df_merged.iterrows():
    if (row['count'] > 0):
        sales.append({'left': row['left_x'], 'top': row['top_x'], 'right': row['right_x'], 'bottom': row['bottom_x'], 'id': row['id'], 'count': row['count'], 'dn': row['dn']})


df = pd.DataFrame(sales)
   
df.to_csv (r'/Users/zzz/exp/jrc/sqkm/bruned/merged_mos.csv', index = None, header=True) #Don't forget to add '.csv' 