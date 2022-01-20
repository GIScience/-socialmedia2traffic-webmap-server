import osgeo.ogr, os, json
from shapely.geometry import Polygon
import collections

# CODE IS POORLY WRITTEN. TAKES A LOT OF TIME TO EXECUTE. FUNCTIONAL THOUGH.

from glob import glob

sourceDir = '/Users/zzz/Desktop/world_data_unzipped/' # Source dir where shp files are located. It should be the dir containing list of countries downloaded from GADM https://gadm.org/data.html
exportDir = '/Volumes/Extra_Stuff/' # Export dir
regions_list = 'regions_list.json' # Export file name 

f = open(os.path.join(exportDir, regions_list), "a")
f.write('[')
f.close()

for root, dirs, files in os.walk(sourceDir):
    for file in files:
        if file.endswith(".shp"):
            print(root, file)
            filename = os.path.join(root, file)
            region = osgeo.ogr.Open(filename)
            region_l = region.GetLayer(0)
            for k in range(region_l.GetFeatureCount()):
                singleitem = collections.OrderedDict()
                region_feat = region_l.GetFeature(k)
                region_geom = region_feat.GetGeometryRef()
                attributes = region_feat.items()
                match = []
                for key in attributes.keys():
                    if key.startswith( 'NAME_' ) and attributes[key]:
                        match.append(key)
                        
                match.sort()
                name = []
                for key in match:
                    name.append(attributes[key])

                singleitem['NAME_Unique'] = "|".join(name) # Insert NAME_Unique first

                for key in match:
                    singleitem[key] = attributes[key] # Insert NAME_* in order

                singleitem["geom"] = json.loads (region_geom.ExportToJson()) # Insert geom last
                # merged.append(singleitem)
                f = open(os.path.join(exportDir, regions_list), "a")
                f.write(json.dumps(singleitem))
                f.write(',')
                f.close()

f = open(os.path.join(exportDir, regions_list), "a")
f.seek(-1, os.SEEK_END)
f.truncate()
f.write(']')
f.close()
