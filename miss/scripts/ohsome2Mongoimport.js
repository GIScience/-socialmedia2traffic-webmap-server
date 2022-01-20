const fs = require('fs'),
readline = require('readline'),
l = require('lodash'),
flat = require('flat'),
unflat = require('flat').unflatten

var dir = '/root/osmOhsome'
var merge_woDup_file = 'merged-woDup.geojson'
var featArr_file = 'mongoimport.json'
var merge_woDup = dir + '/' + merge_woDup_file
var featArr = dir + '/' + featArr_file

function geomBbox(data) {

    /**
     * Calculate x min, y min, x max, and 
     * y max of a given geojson. It could be 
     * Point, LineString, Polygon, MultiPoint,
     * MultiLineString, MultiPolygon, and 
     * GeometryCollection.
     */

    try {

        if (l.has(data.geometry, 'coordinates')) {
            /**
             * For GeoJSON types except
             * Geometry Collection
             */
            var coordsArr = [data.geometry]   

        } else {
            /**
             * For Geometry Collection scenario
             */
            var coordsArrGroup = data.geometry.geometries
            var coordinates = l.map(coordsArrGroup, 'coordinates')

            var geom = {}
            geom.type = 'GeometryCollection'
            geom.coordinates = coordinates
            var coordsArr = [geom]
            
        }
        
        var nestedCoord = l.map(coordsArr, 'coordinates')
        var flatCoord = flat(nestedCoord)
        var coordXY = l.values(flatCoord)
        var xArr = []
        var yArr = []
        l.map(coordXY, (item, index) => {
            (index%2 == 0) ? (xArr.push(item)) : (yArr.push(item))
        })

        var xminf = l.min(xArr),
            yminf = l.min(yArr),
            xmaxf = l.max(xArr),
            ymaxf = l.max(yArr)

        return [
            Math.round(xminf * 10000000) / 10000000,
            Math.round(yminf * 10000000) / 10000000,
            Math.round(xmaxf * 10000000) / 10000000,
            Math.round(ymaxf * 10000000) / 10000000
        ]
        
    } catch (e) {
        console.log('Error - geomBbox() - > ' + e.message)
    }

}

function geomCorrection(data) {
    /**
     * Correct coords of each feature
     * to limit within 
     * x > -180.0 and 180.0
     * y > -90.0 and 90.0
     * It could be Point, LineString, Polygon, 
     * MultiPoint, MultiLineString, MultiPolygon, 
     * and GeometryCollection.
     */

    try {

        function geomCorrectLimits(geom) {

            try {
    
                var coord = [geom.coordinates]
                var coordFlat = flat(coord)
                l.each(coordFlat, (val, key) => {
                    if (key.slice(-1) == '0'){
                        if (val >= 180.0) {
                            coordFlat[key] = 179.999999
                        } else if (val <= -180.0) {
                            coordFlat[key] = -179.999999
                        } 
                    } else if (key.slice(-1) == '1'){
                        if (val >= 90.0) {
                            coordFlat[key] = 89.999999
                        } else if (val <= -90.0) {
                            coordFlat[key] = -89.999999
                        } 
                    }
                })
        
                var correctedCoord = unflat(coordFlat)
                geom.coordinates = correctedCoord['0']
    
                return geom
                
            } catch (e) {
                console.log('Error - geomCorrectLimits() - > ' + e.message)
            }
    
        }

        if (data.geometry.type == 'GeometryCollection') {

            var geomCollArr = data.geometry.geometries
            var geomCollNewArr = []
            l.map(geomCollArr, (geom) => {
                var newGeom = geomCorrectLimits(geom)
                geomCollNewArr.push(newGeom)
            })
            data.geometry.geometries = geomCollNewArr

        } else {

            var newGeom = geomCorrectLimits(data.geometry)
            data.geometry = newGeom

        }

        return data
        
    } catch (e) {
        console.log('Error - geomCorrection() - > ' + e.message)
    }

}

function ohsome2FeatArr(fileName) {
    try {
        
        var count = 0
        return new Promise((res, rej) => {

            var lineReader = readline.createInterface({
                input: require('fs').createReadStream(fileName)
            })
            
            var count = 0
            lineReader.on('line', (item) => {

                
        
                item = JSON.parse(item)
                

                /**
                 * Limit coords within 
                 * x > -180.0 and 180.0
                 * y > -90.0 and 90.0
                 */
                item = geomCorrection(item)

                /**
                 * Add bbox to each feature
                 */
                var bboxCoord = geomBbox(item)
                if (item.geometry.type == 'Point') {
                    /**
                     * If geom is a point then 
                     * bboxGeom is a point
                     * Below is suitable for 2dsphere indexing and quering
                     */
                    // var bboxGeom = {
                    //     "type": "Point",
                    //     "coordinates": [
                    //         bboxCoord[0],
                    //         bboxCoord[1]
                    //     ]
                    //     }

                    /**
                     * If geom is a point then 
                     * bboxGeom is a point
                     * Using Legacy coordinates for mongo
                     * instead of GeoJSON
                     * Suitable for 2d indexing and quering
                     */
                    var bboxGeom = [
                            bboxCoord[0],
                            bboxCoord[1]
                        ]
                } else {
                    /**
                     * If geom is something other
                     * than point then bboxGeom is 
                     * polygon
                     */

                    /**
                     * If line is exactly horizontal
                     * or vertical, make bboxGeom
                     * a bit broader
                     */
                    if (bboxCoord[0] == bboxCoord[2]) {
                        bboxCoord[2] = bboxCoord[0] + 0.000001
                    }
                    if (bboxCoord[1] == bboxCoord[3]) {
                        bboxCoord[3] = bboxCoord[1] + 0.000001
                    }

                    /**
                     * Below is suitable for 2dsphere indexing and quering
                     */
                    // var bboxGeom = {
                    //     "type": "Polygon",
                    //     "coordinates": [
                    //         [
                    //         [
                    //             bboxCoord[0],
                    //             bboxCoord[1]
                    //         ],
                    //         [
                    //             bboxCoord[2],
                    //             bboxCoord[1]
                    //         ],
                    //         [
                    //             bboxCoord[2],
                    //             bboxCoord[3]
                    //         ],
                    //         [
                    //             bboxCoord[0],
                    //             bboxCoord[3]
                    //         ],
                    //         [
                    //             bboxCoord[0],
                    //             bboxCoord[1]
                    //         ]
                    //         ]
                    //     ]
                    // }

                    /**
                     * Using Legacy coordinates for mongo
                     * instead of GeoJSON
                     * Suitable for 2d indexing and quering
                     */
                    var bboxGeom = [
                        [
                            bboxCoord[0],
                            bboxCoord[1]
                        ],
                        [
                            bboxCoord[2],
                            bboxCoord[1]
                        ],
                        [
                            bboxCoord[2],
                            bboxCoord[3]
                        ],
                        [
                            bboxCoord[0],
                            bboxCoord[3]
                        ]
                    ]
                }

                l.assign(item, {'bboxGeom': bboxGeom}) // Insert bboxGeom for each feature

                l.assign(item, {'osmId': item.properties['@osmId']}) // Insert osmId for each feature

                if (count == 0) {
                    fs.writeSync(outStream, JSON.stringify(item) + '\n')
                    count++
                } else {
                    fs.writeSync(outStream, ',' + '\n')
                    fs.writeSync(outStream, JSON.stringify(item) + '\n')
                }

            })
            .on('close', () => {
                fs.writeSync(outStream, ']' + '\n')
                res()
            })
            .on('error', (e) => {
                rej(console.log(error('Error - txt2Mongo() - > ' + e.message)))
            })

        })

    } catch (e) {
        console.log('Error - ohsome2FeatArr() - > ' + e.message)
    }
}

var outStream = fs.openSync(featArr, 'w')
fs.writeSync(outStream, '[' + '\n')

ohsome2FeatArr(merge_woDup)