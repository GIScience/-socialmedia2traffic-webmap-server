import osgeo.ogr, os, json
from shapely.geometry import Polygon

cntry = osgeo.ogr.Open("/Users/zzz/Desktop/newnaming/countries/CNTRY92.shp")
cntry_l = cntry.GetLayer(0)

merged = []
    
for k in range(cntry_l.GetFeatureCount()):
    singleitem = {}

    cntry_feat = cntry_l.GetFeature(k)
    cntry_geom = cntry_feat.GetGeometryRef()
    singleitem["country_id"] = k
    singleitem["country_geom"] = json.loads(cntry_geom.ExportToJson())

    attributes = cntry_feat.items()
    singleitem["WB_CNTRY"] = attributes["WB_CNTRY"]
    singleitem["ABBREVNAME"] = attributes["ABBREVNAME"]
    singleitem["FIPS_CODE"] = attributes["FIPS_CODE"]
    singleitem["NAME"] = attributes["NAME"]
    singleitem["AREA"] = attributes["AREA"]

    merged.append(singleitem)

config_root = "/Users/zzz/Desktop/newnaming/"
f = open(os.path.join(config_root, "countries.json"), "a")
f.write(json.dumps(merged))
f.close()
