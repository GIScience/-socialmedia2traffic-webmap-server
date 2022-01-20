import osgeo.ogr, os, json
from shapely.geometry import Polygon

cntry = osgeo.ogr.Open("/Users/zzz/Desktop/newnaming/countries/CNTRY92.shp")
bbox = osgeo.ogr.Open("/Users/zzz/Desktop/newnaming/bbox/bbox.shp")
conti = osgeo.ogr.Open("/Users/zzz/Desktop/newnaming/continents/continent.shp")
cntry_l = cntry.GetLayer(0)
bbox_l = bbox.GetLayer(0)
conti_l = conti.GetLayer(0)



merged = []
for i in range(bbox_l.GetFeatureCount()):
    singleitem = {}
    conti_array = []
    cntry_array = []
    
    bbox_feat = bbox_l.GetFeature(i)
    bbox_geom = bbox_feat.GetGeometryRef()
    singleitem["bbox_id"] = i
    singleitem["bbox_geom"] = json.loads(bbox_geom.ExportToJson())

    for j in range(conti_l.GetFeatureCount()):
        conti_feat = conti_l.GetFeature(j)
        conti_geom = conti_feat.GetGeometryRef()
        if bbox_geom.Intersect(conti_geom):
            attributes = conti_feat.items()
            conti_array.append(attributes["CONTINENT"])

    singleitem["CONTINENT"] = conti_array

    for k in range(cntry_l.GetFeatureCount()):
        cntry_feat = cntry_l.GetFeature(k)
        cntry_geom = cntry_feat.GetGeometryRef()
        if bbox_geom.Intersect(cntry_geom):
            attributes = cntry_feat.items()
            cntry_array.append(attributes["NAME"])

    singleitem["COUNTRY"] = cntry_array

    merged.append(singleitem)

config_root = "/Users/zzz/Desktop/newnaming/"
f = open(os.path.join(config_root, "segmented_bboxes.json"), "a")
f.write(json.dumps(merged))
f.close()
