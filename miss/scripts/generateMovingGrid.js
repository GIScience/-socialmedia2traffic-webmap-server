const l = require('lodash'),
    fs = require('fs')

// Arguments
var outfile = '/Users/zzz/code/heigit/jrc/edh_db/reference_docs/tiles-moving-v1.3/zoom8-tiles.geojson'
var move = true
var xres = 0.703
var yres = 0.703
//

var xmin = -180
var ymin = -90
var xmax = 180
var ymax = 90

if (move) {
    xmin = xmin - xres/2
    ymin = ymin - yres/2
}
xmax = xmax + xres
ymax = ymax + yres

xsteps = l.range(xmin,xmax,xres)
ysteps = l.range(ymin,ymax,yres)

console.log(xsteps, ysteps);

var pair = []
for (let i=0; i<(xsteps.length)-1; i++) {
    for (let j=0; j<(ysteps.length)-1; j++) {

        var xmintile = xsteps[i]
        var ymintile = ysteps[j]
        var xmaxtile = xsteps[i+1]
        var ymaxtile = ysteps[j+1]

        console.log(xmintile, xmaxtile, ymintile, ymaxtile);

        if (xmintile < -180) {
            xmintile = -180
        }
        if (xmaxtile < -180) {
            xmaxtile = -180
        }
        if (xmintile > 180) {
            xmintile = 180
        }
        if (xmaxtile > 180) {
            xmaxtile = 180
        }

        if (ymintile < -90) {
            ymintile = -90
        }
        if (ymaxtile < -90) {
            ymaxtile = -90
        }
        if (ymintile > 90) {
            ymintile = 90
        }
        if (ymaxtile > 90) {
            ymaxtile = 90
        }

        console.log(xmintile, xmaxtile, ymintile, ymaxtile);

        pair.push({ "type": "Feature", "properties": { "left": xmintile, "top": ymaxtile, "right": xmaxtile, "bottom": ymintile, "id": 2 }, "geometry": { "type": "Polygon", "coordinates": [ [ [ xmintile, ymintile ], [ xmaxtile, ymintile ], [ xmaxtile, ymaxtile ], [ xmintile, ymaxtile ], [ xmintile, ymintile ] ] ] } })
    }
}

var geom = {
    "type": "FeatureCollection",
    "name": "zoom1-tiles",
    "crs": { "type": "name", "properties": { "name": "urn:ogc:def:crs:OGC:1.3:CRS84" } },
    "features": pair
    }

fs.writeFileSync(outfile, JSON.stringify(geom));