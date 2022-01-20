import osgeo.ogr, os, json
from shapely.geometry import Polygon

conti = osgeo.ogr.Open("/Users/zzz/Desktop/newnaming/continents/continent.shp")
conti_l = conti.GetLayer(0)

merged = []
    
for k in range(conti_l.GetFeatureCount()):
    singleitem = {}

    conti_feat = conti_l.GetFeature(k)
    conti_geom = conti_feat.GetGeometryRef()
    singleitem["continent_id"] = k
    singleitem["continent_geom"] = json.loads(conti_geom.ExportToJson())

    attributes = conti_feat.items()
    singleitem["CONTINENT"] = attributes["CONTINENT"]
    singleitem["serialNum"] = attributes["serialNum"]

    merged.append(singleitem)

config_root = "/Users/zzz/Desktop/newnaming/continents/"
f = open(os.path.join(config_root, "continents.json"), "a")
f.write(json.dumps(merged))
f.close()
