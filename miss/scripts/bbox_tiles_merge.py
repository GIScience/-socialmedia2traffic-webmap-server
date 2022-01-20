import osgeo.ogr, os, json
from shapely.geometry import Polygon
import geojson
import collections
import glob
import ntpath

# Run it in python3

tileCollDir = '/Users/zzz/code/heigit/jrc/edh_db/reference_docs/tiles-moving-v1.3'
exportFile = '/Users/zzz/code/heigit/jrc/edh_db/reference_docs/tiles.json'
tileCollList = glob.glob(tileCollDir + "/*")

tiles = []

for i in range(len(tileCollList)):
    tileColl = tileCollList[i]
    fileName = ntpath.basename(tileColl)
    zoomStr = fileName.split('-')[0]
    zoom = zoomStr[4:]
    with open(tileColl) as f:
        gj = geojson.load(f)
        features = gj['features']
        for i in range(len(features)):
            singleTile = collections.OrderedDict()
            singleTile['zoom'] = int(zoom)

            # Correct out of bound  geom
            xArr = [features[i]['geometry']['coordinates'][0][0][0], features[i]['geometry']['coordinates'][0][2][0]]
            yArr = [features[i]['geometry']['coordinates'][0][0][1], features[i]['geometry']['coordinates'][0][2][1]]
            xMin = min(xArr)
            xMax = max(xArr)
            yMin = min(yArr)
            yMax = max(yArr)
            if (xMin < -180.0): 
                xMin = -180.0
            if (xMax > 180.0):
                xMax = 180.0
            if (yMin < -90.0):
                yMin = -90.0
            if (yMax > 90.0):
                yMax = 90.0
            geom = {"coordinates": [[[xMin, yMin], [xMax, yMin], [xMax, yMax], [xMin, yMax], [xMin, yMin]]], "type": "Polygon"}
            bboxgeom = [[xMin, yMin], [xMax, yMin], [xMax, yMax], [xMin, yMax], [xMin, yMin]]

            singleTile['tileGeom'] = geom
            singleTile['bboxGeom'] = bboxgeom
            singleTile['xMin'] = xMin
            singleTile['yMin'] = yMin
            singleTile['xMax'] = xMax
            singleTile['yMax'] = yMax
            tiles.append(singleTile)

# print(tiles)

f = open(os.path.join(exportFile), "w")
f.write(json.dumps(tiles))
f.close() 

