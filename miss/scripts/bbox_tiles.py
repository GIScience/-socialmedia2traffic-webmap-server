import osgeo.ogr, os, json
from shapely.geometry import Polygon
import geojson
import collections

grid1 = '/Users/zzz/Desktop/grid1.geojson'
grid2 = '/Users/zzz/Desktop/grid2.geojson'
config_root = "/Users/zzz/Desktop/"
export_file = 'bbox_tiles.json'

tiles = []
counter = 0

with open(grid1) as f:
    gj = geojson.load(f)
    features = gj['features']
    for i in range(len(features)):
        singleTile = collections.OrderedDict()
        singleTile['NAME_Unique'] = 'BTile_5_5_%s' % counter
        singleTile['geom'] = features[i]['geometry']
        tiles.append(singleTile)
        counter += 1
  
with open(grid2) as f:
    gj = geojson.load(f)
    features = gj['features']
    for i in range(len(features)):
        singleTile = collections.OrderedDict()
        singleTile['NAME_Unique'] = 'BTile_5_5_%s' % counter
        singleTile['geom'] = features[i]['geometry']
        tiles.append(singleTile)
        counter += 1
      
f = open(os.path.join(config_root, export_file), "w")
f.write(json.dumps(tiles))
f.close()    

