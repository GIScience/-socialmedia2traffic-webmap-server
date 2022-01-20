# import rasterio
import socket
import json
import pandas as pd 
import geopandas as gpd
from shapely.geometry import Point
from shapely.geometry.polygon import Polygon
import sys
from collections import Counter


from os import listdir
from os.path import isfile, join
import os
from pyproj import Proj, transform


# mypath = '/Users/zzz/exp/jrc/aggregate_data/data_3857_test'
# onlyfiles = [f for f in listdir(mypath) if isfile(join(mypath, f))]

inProj = Proj(init='epsg:4326')
outProj = Proj(init='epsg:3857')

with open('/Users/zzz/exp/jrc/download_data/bbox.geojson') as f:
    data = json.load(f)

X_abs_min = -20000000
X_abs_max = 20000000
Y_abs_min = -20000000
Y_abs_max = 20000000
dx = 1000
dy = 1000

for i in range(int(sys.argv[1]), int(sys.argv[2])): # 1378
# for i in range(1): 
    print(i)
    if (data['features'][i]['geometry']):
        aa = data['features'][i]['geometry']['coordinates'][0][0]
        if (aa[0][1] == -90 or aa[1][1] == -90 or aa[2][1] == -90 or aa[3][1] == -90 or aa[4][1] == -90):
            pass
        else:

            dataosm = gpd.read_file("/Users/zzz/exp/jrc/aggregate_data/data_3857/%s.geojson" % str(i)) 

            sales = []
            sales1 = []
            final = []

            if (not dataosm.empty):
                print ("dataosm")
                for index, row in dataosm.iterrows():
                    item = []
                    # if row['name'] is not None or row['@version'] > 1:
                    # print row
                    # sales.append(row['geometry'])
                    # print (row['geometry'].)

                    x_min_grid = row['geometry'].centroid.coords[0][0] - ((row['geometry'].centroid.coords[0][0] - X_abs_min) % dx)
                    x_max_grid = row['geometry'].centroid.coords[0][0] + dx - ((row['geometry'].centroid.coords[0][0] - X_abs_min) % dx)
                    y_min_grid = row['geometry'].centroid.coords[0][1] - ((row['geometry'].centroid.coords[0][1] - Y_abs_min) % dy)
                    y_max_grid = row['geometry'].centroid.coords[0][1] + dy - ((row['geometry'].centroid.coords[0][1] - Y_abs_min) % dy)

                    if x_min_grid < X_abs_min : x_min_grid = X_abs_min
                    if y_min_grid < Y_abs_min: y_min_grid = Y_abs_min
                    if x_max_grid > X_abs_max: x_max_grid = X_abs_max
                    if y_max_grid > Y_abs_max: y_max_grid = Y_abs_max

                    # item.append(x_min_grid)
                    # item.append(x_max_grid)
                    # item.append(y_min_grid)
                    # item.append(y_max_grid)
                    sales.append(str(x_min_grid) + ',' + str(y_max_grid) + ',' + str(x_max_grid) + ',' + str(y_min_grid))


                # dataosm_final = pd.DataFrame(sales)
            
                # print (sales)
                keys = Counter(sales).keys()
                count = Counter(sales).values()
                # print (Counter(sales).keys())
                # print (Counter(sales).values())
                # print (Counter(sales).keys()[0].split(','))
                for l in range(len(keys)):
                    ind_keys = keys[l].split(',')
                    # print keys[l].split(','), count[l]
                    sales1.append({'left': ind_keys[0], 'top': ind_keys[1], 'right': ind_keys[2], 'bottom': ind_keys[3], 'count': int(count[l])})


                df = pd.DataFrame(sales1)

                name = '/Users/zzz/exp/jrc/aggregate_data/data_aggregates_faster/%s.csv' % (str(i))

                df.to_csv (name, index = None, header=True) 