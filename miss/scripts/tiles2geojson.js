var fs = require('fs');

var tile = JSON.parse(fs.readFileSync('/Users/zzz/code/heigit/jrc/edh_db/reference_docs/tiles.json', 'utf8'));

var feature0 = []
var feature1 = [] 
var feature2 = [] 
var feature3 = [] 
var feature4 = [] 
var feature5 = [] 
var feature6 = [] 
var feature7 = [] 
var feature8 = [] 
for (let i=0; i<tile.length; i++) {

    /**
     * Tile Id
     */
    var coord = tile[i]['tileGeom']['coordinates']
    var z = tile[i]['zoom']
    var x = Math.round((coord[0][0][0] + coord[0][2][0]) / 2)
    var y = Math.round((coord[0][0][1] + coord[0][2][1]) / 2)
    if (x < 0) {
        x = Math.abs(x)
        var xStr = x.toString().padStart(3, "0")
        xStr = 'w' + xStr
    } else {
        var xStr = x.toString().padStart(3, "0")
        xStr = 'e' + xStr
    }
    if (y < 0) {
        y = Math.abs(y)
        var yStr = y.toString().padStart(2, "0")
        yStr = 's' + yStr
    } else {
        var yStr = y.toString().padStart(2, "0")
        yStr = 'n' + yStr
    }
    var tileIDInt = 'z' + z + '' + xStr + '' + yStr
    var tileIDNew = 'Tile'+tileIDInt

    var featSingle = {
        "type": "Feature",
        "properties": {
            'zoom':tile[i]['zoom'],
            'bboxGeom':tile[i]['bboxGeom'],
            'xMin':tile[i]['xMin'],
            'yMin':tile[i]['yMin'],
            'xMax':tile[i]['xMax'],
            'yMax':tile[i]['yMax'],
            'tileId': tileIDNew
        },
        "geometry": tile[i]['tileGeom']
    }

    if (tile[i]['zoom'] == 0) {
        feature0.push(featSingle)
    } else if (tile[i]['zoom'] == 1) {
        feature1.push(featSingle)
    } else if (tile[i]['zoom'] == 2) {
        feature2.push(featSingle)
    } else if (tile[i]['zoom'] == 3) {
        feature3.push(featSingle)
    } else if (tile[i]['zoom'] == 4) {
        feature4.push(featSingle)
    } else if (tile[i]['zoom'] == 5) {
        feature5.push(featSingle)
    } else if (tile[i]['zoom'] == 6) {
        feature6.push(featSingle)
    } else if (tile[i]['zoom'] == 7) {
        feature7.push(featSingle)
    } else if (tile[i]['zoom'] == 8) {
        feature8.push(featSingle)
    } 
}

var finalGeoJSON0 = {
    "type": "FeatureCollection",
    "features": feature0
}
var finalGeoJSON1 = {
    "type": "FeatureCollection",
    "features": feature1
}
var finalGeoJSON2 = {
    "type": "FeatureCollection",
    "features": feature2
}
var finalGeoJSON3 = {
    "type": "FeatureCollection",
    "features": feature3
}
var finalGeoJSON4 = {
    "type": "FeatureCollection",
    "features": feature4
}
var finalGeoJSON5 = {
    "type": "FeatureCollection",
    "features": feature5
}
var finalGeoJSON6 = {
    "type": "FeatureCollection",
    "features": feature6
}
var finalGeoJSON7 = {
    "type": "FeatureCollection",
    "features": feature7
}
var finalGeoJSON8 = {
    "type": "FeatureCollection",
    "features": feature8
}

fs.writeFileSync('/Users/zzz/code/heigit/jrc/edh_db/reference_docs/tiles-moving-v1.3/geojsonWithTileId/zoom0-tiles.geojson', JSON.stringify(finalGeoJSON0))
fs.writeFileSync('/Users/zzz/code/heigit/jrc/edh_db/reference_docs/tiles-moving-v1.3/geojsonWithTileId/zoom1-tiles.geojson', JSON.stringify(finalGeoJSON1))
fs.writeFileSync('/Users/zzz/code/heigit/jrc/edh_db/reference_docs/tiles-moving-v1.3/geojsonWithTileId/zoom2-tiles.geojson', JSON.stringify(finalGeoJSON2))
fs.writeFileSync('/Users/zzz/code/heigit/jrc/edh_db/reference_docs/tiles-moving-v1.3/geojsonWithTileId/zoom3-tiles.geojson', JSON.stringify(finalGeoJSON3))
fs.writeFileSync('/Users/zzz/code/heigit/jrc/edh_db/reference_docs/tiles-moving-v1.3/geojsonWithTileId/zoom4-tiles.geojson', JSON.stringify(finalGeoJSON4))
fs.writeFileSync('/Users/zzz/code/heigit/jrc/edh_db/reference_docs/tiles-moving-v1.3/geojsonWithTileId/zoom5-tiles.geojson', JSON.stringify(finalGeoJSON5))
fs.writeFileSync('/Users/zzz/code/heigit/jrc/edh_db/reference_docs/tiles-moving-v1.3/geojsonWithTileId/zoom6-tiles.geojson', JSON.stringify(finalGeoJSON6))
fs.writeFileSync('/Users/zzz/code/heigit/jrc/edh_db/reference_docs/tiles-moving-v1.3/geojsonWithTileId/zoom7-tiles.geojson', JSON.stringify(finalGeoJSON7))
fs.writeFileSync('/Users/zzz/code/heigit/jrc/edh_db/reference_docs/tiles-moving-v1.3/geojsonWithTileId/zoom8-tiles.geojson', JSON.stringify(finalGeoJSON8))