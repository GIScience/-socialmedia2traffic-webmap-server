import csv, json
from geojson import Feature, FeatureCollection, Polygon

features = []
with open('/Users/zzz/exp/jrc/sqkm/bruned/merged_mos.csv', newline='') as csvfile:
    reader = csv.reader(csvfile, delimiter=',')
    csvfile.readline()
    for bottom,count,dn,id,left,right,top in reader:
        bottom1 = float(bottom)
        bottom, top = map(float, (bottom, top))
        left, right = map(float, (left, right))
        features.append(
            Feature(
                geometry = Polygon([[(left, bottom), (right, bottom), (right, top), (left, top), (left, bottom)]]) ,
                properties = {
                    'dn': dn,
                    'count': count
                }
            )
        )

crs  = {
        "type": "name",
        "properties": {
            "name": "urn:ogc:def:crs:EPSG::3857"
        }
    }

collection = FeatureCollection(features, crs = crs)

print(type(collection))

with open("/Users/zzz/exp/jrc/sqkm/bruned/merged_mos.geojson", "w") as f:
    f.write('%s' % collection)