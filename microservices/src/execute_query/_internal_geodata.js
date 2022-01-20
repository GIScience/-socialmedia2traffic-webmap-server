'use strict'

// Load `require` directives - external
const l = require('lodash'),
    axios = require('axios'),
    fs = require('fs'),
    del = require('del'),
    gjValidate= require("geojson-validation"),
    fg = require('fast-glob'),
    fsExtra = require('fs-extra'),
    reproject = require('reproject'),
    path = require('path'),
    pick = require('stream-json/filters/Pick'),
    Batch = require('stream-json/utils/Batch'),
    {streamArray} = require('stream-json/streamers/StreamArray'),
    {chain} = require('stream-chain'),
    requestHttp = require('request'),
    progressHttp = require('request-progress'),
    turf = require('@turf/turf'),
    through2 = require('through2'),
    ogr2ogr = require('ogr2ogr'),
    flat = require('flat'),
    shell = require('shelljs'),
    exec = require('child_process').exec,
    unzipper = require('unzipper'),
    lineclip = require('lineclip'),
    BigInteger = require('jsbn').BigInteger,
    clc = require("cli-color")
// Load `require` directives - internal
const FileNamer = require('../../../utils/file_namer'),
    config = require('config'),
    LogDb = require('../../../db/mongo/src/logdb_connect'),
    msg = require('../../../utils/msg_list'),
    TmpDb = require('../../../db/mongo/src/tmpdb_connect'),
    appRoot = require('app-root-path')

var error = clc.red.bold,
    warn = clc.yellow,
    notice = clc.blue

var savePixelIdDataLength = 0
var savePixelIdDataCounter = 0

function changeCRS(fwDataSource, submitId, urlArguments){

    try {

        return new Promise((res, rej) => {

            /**
             * Prepare export storage with stream 
             * with changed CRS
             */
            var fileNamer = new FileNamer()
            var inputFile = fileNamer.processFileOrDirPath(submitId, 'file', 'union', 'geojson') // Generate input process file with path
            var outputFile = fileNamer.processFileOrDirPath(submitId, 'file', 'crs', 'geojson') // Generate output process file with path

            var outStream = fs.openSync(outputFile, 'w')
            fs.writeSync(outStream, msg.geojsonHeader(urlArguments.dataAggregate[2]))

            var counter = 0
            fs.createReadStream(inputFile)
            .pipe(pick.withParser({filter: 'features'})) // More - https://github.com/uhop/stream-json/wiki/Pick
            .pipe(streamArray())
            .pipe(new Batch({batchSize: config.get('server.batchSize')})) // Takes file in big chunks. Single item means too many Mongo Insert operations and many items mean high memory usage. More - https://github.com/uhop/stream-json/wiki/Batch.
            .pipe(through2.obj(async (chunk, enc, callback) => {

                chunk = l.map(chunk, 'value')
                /**
                 * Reproject to new CRS a small 
                 * chunk of data as defined above
                 * in batchSize
                 */        
                var featCRSChangedGeoJSON = reprojectCRS(chunk, 'EPSG:4326', 'EPSG:'+urlArguments.dataAggregate[2])

                var featCRSChanged = featCRSChangedGeoJSON.features

                if (counter != 0) {
                    fs.writeSync(outStream, ',')
                } else {
                    counter += 1
                }
                fs.writeSync(outStream, JSON.stringify(featCRSChanged).slice(1, -1))

                callback()
            }))
            .on('data', (data) => {
            })
            .on('end', () => {
                fs.writeSync(outStream, msg.geojsonFooter)
                res(fs.closeSync(outStream))
            })
            .on('error', (e) => {
                rej(console.log(error('Error - changeCRS() - > ' + e.message)))
            })
    
        })
        
    } catch (e) {
        console.log(error('Error - changeCRS() - > ' + e.message))
    }

}

function reprojectCRS(feature, srcCRS, trgCRS) {
    try {

        if (feature == 'Extent-Globe') {
            /**
             * To get maximum extent of 
             * given EPSG for whole Globe
             * mainly for EPSG 3857
             */

            var geojs = {}
            geojs['type'] = 'FeatureCollection'
            geojs['features'] = [
                {
                    'type': 'Feature',
                    'properties': {},
                    'geometry': {
                      'type': 'Polygon',
                      'coordinates': [
                        [
                          [
                            -179.9999999,
                            -89.9999999
                          ],
                          [
                            179.9999999,
                            -89.9999999
                          ],
                          [
                            179.9999999,
                            89.9999999
                          ],
                          [
                            -179.9999999,
                            89.9999999
                          ],
                          [
                            -179.9999999,
                            -89.9999999
                          ]
                        ]
                      ]
                    }
                }
            ]
    
        } else if (feature == 'Extent-Europe-Official') {
            /**
             * To get maximum extent of 
             * given EPSG for whole Europe
             * works only for EPSG 3035
             * Definition taken from https://epsg.io/3035
             */

            var geojs = {}
            geojs['type'] = 'FeatureCollection'
            geojs['features'] = [
                {
                    "type": "Feature",
                    "properties": {},
                    "geometry": {
                      "type": "Polygon",
                      "coordinates": [
                        [
                          [
                            -16.1,
                            32.88
                          ],
                          [
                            40.18,
                            32.88
                          ],
                          [
                            40.18,
                            84.17
                          ],
                          [
                            -16.1,
                            84.17
                          ],
                          [
                            -16.1,
                            32.88
                          ]
                        ]
                      ]
                    }
                  }
            ]

        }  else if (feature == 'Extent-Europe') {
            /**
             * To get maximum extent of 
             * given EPSG for whole Europe
             * works only for EPSG 3035.
             * Derived from JRC Template data
             */

            var geojs = {}
            geojs['type'] = 'FeatureCollection'
            geojs['features'] = [
                {
                    "type": "Feature",
                    "properties": {},
                    "geometry": {
                      "type": "Polygon",
                      "coordinates": [
                        [
                          [
                            -25.503264439846916, 
                            72.832211277250153
                          ],
                          [
                            76.187041708147405,
                            72.832211277250153
                          ],
                          [
                            76.187041708147405, 
                            22.339334090601696
                          ],
                          [
                            -25.503264439846916,
                            22.339334090601696
                          ],
                          [
                            -25.503264439846916, 
                            72.832211277250153
                          ]
                        ]
                      ]
                    }
                  }
            ]

        } else {
            var geojs = {}
            geojs['type'] = 'FeatureCollection'
            geojs['features'] = feature
    
        }        
    
        /**
         * Reproject to new CRS 
         */
        var featCRSChangedGeoJSON = reproject.reproject(geojs, srcCRS, trgCRS)

        return featCRSChangedGeoJSON
        
    } catch (e) {
        console.log(error('Error - reprojectCRS() - > ' + e.message))   
    }
}

function unionIndividualFile(fileNamer, submitId, urlArguments, item, outStream) {

    try {

        return new Promise((res, rej) => {
            var inputFile = fileNamer.processFileOrDirPath(submitId, 'file', item, 'geojson') // Generate input process file with path

            var counter = 0
            var numFeatProcessed = 0
            fs.createReadStream(inputFile)
            .pipe(pick.withParser({filter: 'features'})) // More - https://github.com/uhop/stream-json/wiki/Pick
            .pipe(streamArray())
            .pipe(new Batch({batchSize: config.get('server.batchSize')})) // Takes file in big chunks. Single item means too many Mongo Insert operations and many items mean high memory usage. More - https://github.com/uhop/stream-json/wiki/Batch.
            .pipe(through2.obj(async (chunk, enc, callback) => {

                chunk = l.map(chunk, 'value')
                if (counter != 0) {
                    fs.writeSync(outStream, ',')
                } else {
                    counter += 1
                }

                numFeatProcessed += chunk.length
                fs.writeSync(outStream, JSON.stringify(chunk).slice(1, -1))

                callback()
            }))
            .on('data', (data) => {
            })
            .on('end', () => {
                res(numFeatProcessed)
            })
            .on('error', (e) => {
                rej(console.log(error('Error - unionIndividualFile() - > ' + e.message)))
            })

        })
        
    } catch (e) {
        console.log(error('Error - unionIndividualFile() - > ' + e.message))
    }

}

function mergeSortedPixelIdFiles(dbClient, urlArguments, submitId) {

    /** NOTE ---- IMPORTANT
     * Better approach is to use stream pull
     * method and priority queue. The one currently being used is
     * stream push (https://github.com/uhop/stream-json/blob/master/streamers/StreamValues.js).
     * Use stream pull and priority queue to
     * merge sorted files together. 
     * More https://gitlab.com/jrc_osm/edh_server/issues/20
     * For now, merging and sorting of all 
     * individual pixelId files is being done 
     * in Mongo.
     */

    /**
     * Current implementation of sorting of 
     * multiple big pixelId files by 
     * inserting and fetch from Mongo.
     */

    try {

        var tmpDb = new TmpDb(dbClient)

        var fileNamer = new FileNamer()
        var outputFile = fileNamer.processFileOrDirPath(submitId, 'file', 'pixelId', 'geojson') // Generate process file with path
        var pixelIdFilesList = fileNamer.pixelIdFilesList(submitId, 'pixelId', 'geojson')

        if (pixelIdFilesList.length == 0) {
            /**
             * If no pixelId file exists.
             * Means no aggregation took place
             * coz feature was missing.
             * Create empty aggre file.
             */
            return new Promise((res, rej) => {
                /**
                 * Create empty raw export geojson
                 */
                try {
                    var fd = fs.openSync(outputFile, 'a+')
                    fs.appendFileSync(outputFile, msg.geojsonHeader(urlArguments.dataAggregate[2]), 'utf8')
                    fs.appendFileSync(outputFile, msg.geojsonFooter, 'utf8') 
                    fs.closeSync(fd)

                    res()
                } catch (e) {
                    rej(console.log(error('Error - mergeSortedPixelIdFiles() - > ' + e.message)))
                }
            })
        } 

        function getPixelIdData(submitId, urlArguments, outputFile) {

            try {

                return new Promise((res, rej) => {
                    /**
                     * Prepare export storage with stream
                     */
                    var outStream = fs.openSync(outputFile, 'w')
                    fs.writeSync(outStream, msg.geojsonHeader(4326))
        
                    var result = tmpDb.getPixelId(submitId) // Streamed response from Mongo
        
                    var counter = 0
        
                    result.on('end', function() {
                        /**
                         * result.on('close' is not being used as
                         * the stream was not getting resolved
                         * if there was not result from 
                         * mongo query.
                         */
                        fs.writeSync(outStream, msg.geojsonFooter)
                        res(fs.closeSync(outStream))
                    })
        
                    result.on('data', function(data) {
        
                        if (counter != 0) {
                            fs.writeSync(outStream, ',')
                        } else {
                            counter += 1
                        }
                        fs.writeSync(outStream, JSON.stringify(data))
                    })
                    
                    result.on('error', function(e) {
                        rej(console.log(error('Error - getPixelIdData() - > ' + e.message)))
                    })
                    
                })
                
            } catch (e) {
                console.log(error('Error - getPixelIdData() - > ' + e.message))
            }

        }

        function insertPixelId(inputFile) {

            try {

                return new Promise((res, rej) => {

                    var promisesList = []

                    fs.createReadStream(inputFile)
                    .pipe(pick.withParser({filter: 'features'})) // More - https://github.com/uhop/stream-json/wiki/Pick
                    .pipe(streamArray())
                    .pipe(new Batch({batchSize: config.get('server.batchSize')})) // Takes file in big chunks. Single item means too many Mongo Insert operations and many items mean high memory usage. More - https://github.com/uhop/stream-json/wiki/Batch.
                    .pipe(through2.obj(async (chunk, enc, callback) => {

                        chunk = l.map(chunk, 'value')
                        
                        l.map(chunk, (item) => {
            
                            /**
                             * Sorting on mixed char is not possible
                             * in Mongo. So, pixelId is being 
                             * converted to numbers to be able 
                             * to sort them. Note that no clash
                             * will happen between pixels this way.
                             */
                            var sortId = Number(item.pixelId.split('XF').pop().split('XR')[0] + item.pixelId.split('YF').pop().split('YR')[0])
        
                            l.assign(item, {'sortId': sortId}) // Insert sortId in each feature
                        })
    
                        promisesList.push(tmpDb.insertPixelIdArray(chunk, submitId))

                        callback()
                    }))
                    .on('data', (data) => {
                    })
                    .on('end', () => {
                        Promise.all(promisesList).then((r) => {
                            res()
                        })
                    })
                    .on('error', (e) => {
                        rej(console.log(error('Error - insertPixelId() - > ' + e.message)))
                    })
        
                })
                
            } catch (e) {
                console.log(error('Error - insertPixelId() - > ' + e.message))
            }

        }

        async function insertAllPixelId(pixelIdFilesList) {
            try {

                for (let i=0; i<pixelIdFilesList.length; i++) {
                    await insertPixelId(pixelIdFilesList[i])
                }

                return 
                
            } catch (e) {
                console.log(error('Error - insertAllPixelId() - > ' + e.message))
            }
        }

        function createIndexPixelId(submitId) {
            /**
             * Create index to tmp_coll
             * otherwise sorting of 
             * sortId will not
             * take place and getPixelIdData()
             * would rather return empty result.
             * More - https://jira.mongodb.org/browse/NODE-784?focusedCommentId=1341389&page=com.atlassian.jira.plugin.system.issuetabpanels:comment-tabpanel#comment-1341389
             */

            try {
                return tmpDb.createIndexPixelId(submitId)
            } catch (e) {
                console.log(error('Error - createIndexPixelId() - > ' + e.message))
            }
        
        }

        function deleteTmpColl(submitId) {

            /**
             * Delete tmp collection
             */

            try {
                return new Promise((res, rej) => {
                    try {
                        tmpDb.deleteTmpColl('tmp_'+submitId.toString())
                        res()
                    } catch (e) {
                        rej(console.log(error('Error - deleteTmpColl() - > ' + e.message)))
                    }
                })
            } catch (e) {
                console.log(error('Error - deleteTmpColl() - > ' + e.message))
            }

        }

        return new Promise((res, rej) => {

            insertAllPixelId(pixelIdFilesList)
                .then((result) => {
                    createIndexPixelId(submitId)
                    .then((rslt) => {
                        getPixelIdData(submitId, urlArguments, outputFile)
                        .then((rs) => {
                            deleteTmpColl(submitId)
                            .then((r) => {
                                res(r)
                            })
                        })
                    })  
                })
                .catch((e) => {
                    rej(console.log(error('Error - mergeSortedPixelIdFiles() - > ' + e.message))) 
                })

        })
        
    } catch (e) {
        console.log(error('Error - mergeSortedPixelIdFiles() - > ' + e.message))
    }

}

async function unionDataDump(fwDataSource, submitId, urlArguments) {

    /**
     * Union all dumped geojson
     * from Mongo, i.e. for 
     * OSM, GHSL etc. into 
     * one file
     */

    try {
    
        var origin = l.map(fwDataSource, 'origin')
        var unionDataDumpList = []

        /**
         * Prepare export storage with stream
         * for union operation of dumped 
         * files from Mongo
         */
        var fileNamer = new FileNamer()
        var outputFile = fileNamer.processFileOrDirPath(submitId, 'file', 'union', 'geojson') // Generate process file with path

        var outStream = fs.openSync(outputFile, 'w')
        fs.writeSync(outStream, msg.geojsonHeader())

        var counter = 0

        var numFeatProcessed = 0
        for (let item of origin){
            if (counter != 0) {
                fs.writeSync(outStream, ',')
            } else {
                counter += 1
            }
            numFeatProcessed += await unionIndividualFile(fileNamer, submitId, urlArguments, item, outStream)
        }

        return new Promise((res, rej) => {
            try {
                fs.writeSync(outStream, msg.geojsonFooter)
                fs.closeSync(outStream)
                res(numFeatProcessed) 
            } catch (e) {
                rej(console.log(error('Error - unionDataDump() - > ' + e.message)) )
            }
        })
        
    } catch (e) { 
        console.log(error('Error - unionDataDump() - > ' + e.message)) 
    }

}

function pixelAllList(dbClient, item, dataAggregate, aggreClassifier, crsExtent) {

    try {

        function geomMinMax(data) {
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
                return [
                    Math.round(l.min(xArr) * 10000000) / 10000000,
                    Math.round(l.min(yArr) * 10000000) / 10000000,
                    Math.round(l.max(xArr) * 10000000) / 10000000,
                    Math.round(l.max(yArr) * 10000000) / 10000000
                ]
                
            } catch (e) {
                console.log(error('Error - geomMinMax() - > ' + e.message)) 
            }
    
        }
    
        if (aggreClassifier.method == 'intersect') {
            var bboxMinMax = geomMinMax(item.data)
    
        } else if (aggreClassifier.method == 'gradient') {
        }        
    
        /**
         * Obtain x and y defaults to 
         * calculate pixel coordinates
         * and ids.
         */
        var x_min_bbox = bboxMinMax[0],
            y_min_bbox = bboxMinMax[1],
            x_max_bbox = bboxMinMax[2],
            y_max_bbox = bboxMinMax[3]
    
        /**
         * Calculate extent of projection
         * using reproject
         */
        var x_min_abs = crsExtent[0],
            y_min_abs = crsExtent[1],
            x_max_abs = crsExtent[2],
            y_max_abs = crsExtent[3]
    
        var x_res = Math.round(dataAggregate[0] * 10000000) / 10000000,
            y_res = Math.round(dataAggregate[1] * 10000000) / 10000000          
            
        /**
         * Below frequency counts are always >= 0
         */
        var x_min_freq = Math.ceil((x_min_bbox - x_res - x_min_abs) / x_res),
            y_min_freq = Math.ceil((y_min_bbox - y_res - y_min_abs) / y_res),
            x_max_freq = Math.ceil((x_max_bbox - x_res - x_min_abs) / x_res),
            y_max_freq = Math.ceil((y_max_bbox - y_res - y_min_abs) / y_res)
    
        var x_freq_range = l.range(x_min_freq, x_max_freq+1),
            y_freq_range = l.range(y_min_freq, y_max_freq+1)
    
        var pixelList = []

        if ((x_freq_range.length * y_freq_range.length) > config.get('server.pixelListMaxLengthInMillion') * 1000000) {
            /**
             * Exit if feature is too big or scattered
             * and causing long pixel list.
             * This will cause JS FATAL ERROR, 
             * heap out of memory error.
             * Better solution needed to have shorted
             * pixel list
             */
            console.log(warn('Warning - Feature spatially too big. Checkout bigfeatColl log_db collection for complete GeoJSON'))

            var logDb = new LogDb(dbClient)
            logDb.logBigFeat(item.data)

            return pixelList
        }
    
        l.map(x_freq_range, (x_freq) => {
            l.map(y_freq_range, (y_freq) => {
    
                var x_min_pixel = x_min_abs + x_freq * x_res
                var y_min_pixel = y_min_abs + y_freq * y_res
                var x_max_pixel = x_min_abs + (x_freq+1) * x_res
                var y_max_pixel = y_min_abs + (y_freq+1) * y_res                
    
                /**
                 * Check if pixel max x and y does not
                 * exceed maximum permissible x and y
                 * for given projection
                 */
                x_max_pixel = (x_max_pixel > x_max_abs) ? (x_max_abs): (x_max_pixel)
                y_max_pixel = (y_max_pixel > y_max_abs) ? (y_max_abs): (y_max_pixel)
    
                /**
                 * PixelId format example = 
                 * E3857XF10100XR100YF10500YR100
                 * i.e. E + 'EPSG code' + XF + 'x frequency
                 * or number of cycles covered before reaching
                 * x_min' + XR + 'x resolution in given EPSG
                 * coordinates' + YF + 'y frequency or number of cycles
                 * covered before reaching y_min' + YR + 'y resolution
                 * in given EPSG coordinates'
                 */
                var pixelId = 'E' + dataAggregate[2].toString() + 'XF' + x_freq.toString() + 'XR' + x_res.toString() + 'YF' + y_freq.toString() + 'YR' + y_res.toString()
    
                pixelList.push({
                    'pixelId': pixelId,
                    'coordinates': [
                        Math.round(x_min_pixel * 10000000) / 10000000,
                        Math.round(y_min_pixel * 10000000) / 10000000,
                        Math.round(x_max_pixel * 10000000) / 10000000,
                        Math.round(y_max_pixel * 10000000) / 10000000
                    ]
                })
            })
        })        
    
        return pixelList
        
    } catch (e) {
        console.log(error('Error - pixelAllList() - > ' + e.message)) 
    }

}

function featureLength(lineCoordinates, unit) {
    /**
     * Calculate original feature length
     * in meters. Reprojection to 4326
     * is required for this action.
     */  
    
    try {

        var lineLength = 0.0

        if(lineCoordinates[0][0].constructor === Array) {
            /**
             * Looping is done for perimeter calculation
             * of nested polygons that return a list
             * of linestrings
             */
            l.map(lineCoordinates, (singleLine) => {
                var line = turf.lineString(singleLine)
                lineLength += turf.length(line, {units: unit})*1000
            })
        } else {
            var line = turf.lineString(lineCoordinates)
            lineLength += turf.length(line, {units: unit})*1000
        }
        
        return lineLength
        
    } catch (e) {
        console.log(error('Error - featureLength() - > ' + e.message))  
    }

}

function geomVicinityExtent(item, aggreAttri, dataAggregate, pixelCoord, aggreClassifier){

    try {

        function point(item, aggreAttri, pixelCoord, aggreClassifier) {

            /**
             * Point intersection to Pixel
             * and corresponding fractional 
             * overlap calculation
             */
    
            try {
    
                if (aggreClassifier.method == 'intersect') {
    
                    /**
                     * Check intersection of point 
                     * and pixel
                     */
                    var featGeom = turf.point(item.data.geometry.coordinates)
                    var pixelGeom = turf.polygon([
                        [[pixelCoord[0],pixelCoord[1]], 
                        [pixelCoord[2],pixelCoord[1]], 
                        [pixelCoord[2],pixelCoord[3]], 
                        [pixelCoord[0],pixelCoord[3]], 
                        [pixelCoord[0],pixelCoord[1]]]
                    ])
                    var intersection = turf.intersect(pixelGeom, featGeom)
        
                    if (intersection != null) {
                        /**
                         * Intersection indeed takes place based
                         * on given 'intersect' method
                         */
        
                        if (aggreAttri == '_boolean') {
                            var fractionAttri = 1.0
                            var absoluteAttri = 1.0
        
                        } else if (aggreAttri == '_frequency') {
                            var fractionAttri = 1.0
                            var absoluteAttri = 1.0
                        }
        
                    } else {
                        /**
                         * NaN is used for fractionAttri for
                         * cases where pixel and feature are
                         * not related at all. 
                         * If no intersection took place, 
                         * use 1.0 as absolute attribute.
                         * Not going to be used anyway.
                         */
                        var fractionAttri = NaN
                        var absoluteAttri = 1.0
                    }
        
                } else if (aggreClassifier.method == 'gradient') {
        
                }
        
                return {
                    'fractionAttri': fractionAttri,
                    'absoluteAttri': absoluteAttri
                }
                
            } catch (e) {
                console.log(error('Error - point() - > ' + e.message))  
            }
    
        }
    
        function lineString(item, aggreAttri, pixelCoord, aggreClassifier) {

            /**
             * LineString intersection to Pixel
             * and corresponding fractional overlap
             * calculation
             */
    
            try {
    
                if (aggreClassifier.method == 'intersect') {
    
                    /**
                     * Check intersection of linestring 
                     * and pixel
                     */
                    var featCoord = item.data.geometry.coordinates
                    var pixelBbox = [pixelCoord[0], pixelCoord[1], pixelCoord[2],pixelCoord[3]]
        
                    if (aggreAttri == '_frequency') {
                        /**
                         * Convert linestring to point
                         * and use Point function instead
                         */
        
                        var flatCoord = flat(featCoord)
                        var coordXY = l.values(flatCoord)
                        var xArr = []
                        var yArr = []
                        l.map(coordXY, (item, index) => {
                            (index%2 == 0) ? (xArr.push(item)) : (yArr.push(item))
                        })
                        
                        var x = l.mean(xArr),
                            y = l.mean(yArr)
        
                        var geom  = {
                            'data': {
                                'type': 'Feature',
                                'geometry': {
                                    'type': 'Point',
                                    'coordinates': [x, y]
                                }
                            }
                        }
        
                        var measure = point(geom, aggreAttri, pixelCoord, aggreClassifier)
        
                        var fractionAttri = measure.fractionAttri
                        var absoluteAttri = measure.absoluteAttri
        
                    } else {
        
                        var intersection = lineclip(featCoord, pixelBbox)
        
                        /**
                         * Calculate original feature length
                         * in meters. Reprojection to 4326
                         * is required for this action.
                         */            
                        var featCRSChangedGeoJSON = reprojectCRS([item.data], 'EPSG:'+dataAggregate[2], 'EPSG:4326')
                        var lineLength = featureLength(featCRSChangedGeoJSON.features[0].geometry.coordinates, 'kilometers') // Returned length will be in meters
        
                        if (intersection.length != 0) {
                            /**
                             * Intersect indeed takes place based on
                             * given 'intersect' method 
                             */
            
                            if (aggreAttri == '_boolean') {
                                var fractionAttri = 1.0
                                var absoluteAttri = 1.0
            
                            } else if (aggreAttri == '_length') {
            
                                /**
                                 * Pairing through all sliced line segments
                                 * to calculate each slice's length, 
                                 * and then calculating all slice lengths.
                                 */
                                var lineSliceLength = 0.0
                                l.map(intersection, (item) => {
                                    l.map(l.range(0, item.length-1), (i) => {
                                        var geom = {}
                                        geom['type'] = 'Feature'
                                        geom['geometry'] = {
                                            'type': 'LineString',
                                            'coordinates': [
                                                item[i], item[i+1]
                                            ]
                                        }
                                        var featCRSChangedGJSlice = reprojectCRS([geom], 'EPSG:'+dataAggregate[2], 'EPSG:4326')
                                        var lineLenSlice = featureLength(featCRSChangedGJSlice.features[0].geometry.coordinates, 'kilometers') // Returned length will be in meters
            
                                        lineSliceLength += lineLenSlice
                                    })
                                })
            
                                var fractionAttri = lineSliceLength/lineLength
                                var absoluteAttri = lineLength
                            }
            
                        } else {
                            /**
                             * If no intersection took place, 
                             * use length as absolute attribute.
                             * Not going to be used anyway.
                             */
            
                            var fractionAttri = NaN
                            var absoluteAttri = lineLength
                        }
                    }
        
                } else if (aggreClassifier.method == 'gradient') {
        
                }
        
                return {
                    'fractionAttri': fractionAttri,
                    'absoluteAttri': absoluteAttri
                }
                
            } catch (e) {
                console.log(error('Error - lineString() - > ' + e.message))  
            }
            
        }
    
        function polygon(item, aggreAttri, pixelCoord, aggreClassifier) {

            /**
             * Polygon intersection to Pixel
             * and corresponding fractional overlap
             * calculation
             */
    
            try {
    
                if (aggreClassifier.method == 'intersect') {
        
                    if (aggreAttri == '_frequency') {
                        /**
                         * Convert polygon to point
                         * and use Point function instead
                         */
        
                        var featCoord = item.data.geometry.coordinates
                        var flatCoord = flat(featCoord)
                        var coordXY = l.values(flatCoord)
                        var xArr = []
                        var yArr = []
                        l.map(coordXY, (item, index) => {
                            (index%2 == 0) ? (xArr.push(item)) : (yArr.push(item))
                        })
                        
                        var x = l.mean(xArr),
                            y = l.mean(yArr)
        
                        var geom  = {
                            'data': {
                                'type': 'Feature',
                                'geometry': {
                                    'type': 'Point',
                                    'coordinates': [x, y]
                                }
                            }
                        }
        
                        var measure = point(geom, aggreAttri, pixelCoord, aggreClassifier)
        
                        var fractionAttri = measure.fractionAttri
                        var absoluteAttri = measure.absoluteAttri
        
                    } else {
        
                        /**
                         * Check intersection of polygon 
                         * and pixel
                         */
                        var featGeom = turf.polygon(item.data.geometry.coordinates)
                        var pixelGeom = turf.polygon([
                            [[pixelCoord[0],pixelCoord[1]], 
                            [pixelCoord[2],pixelCoord[1]], 
                            [pixelCoord[2],pixelCoord[3]], 
                            [pixelCoord[0],pixelCoord[3]], 
                            [pixelCoord[0],pixelCoord[1]]]
                        ])
                        var intersection = turf.intersect(pixelGeom, featGeom)
        
                        /**
                         * Calculate original feature area
                         * in sq-meter. Reprojection to 4326
                         * is required for this action.
                         */    
                        var featCRSChangedGeoJSON = reprojectCRS([item.data], 'EPSG:'+dataAggregate[2], 'EPSG:4326')
                        var polygonArea = turf.area(featCRSChangedGeoJSON)
        
                        /**
                         * If '_perimeter' then calculate
                         * fractionAttri and absoluteAttri.
                         * This If clause has been kept 
                         * outside to handle scenario
                         * where this function is being called 
                         * by multiPolygon. It is possible
                         * that intersection == null, but
                         * we still need absoluteAttri for
                         * overall absoluteAttri and 
                         * fractionAttri
                         */
                        if (aggreAttri == '_perimeter') {
                            var poly = turf.polygon(item.data.geometry.coordinates)
                            var line = turf.polygonToLine(poly)
                            var geom = {}
                            geom['data'] = line
        
                            if (geom.data.geometry.type == 'LineString') {
                                var measure = lineString(geom, '_length', pixelCoord, aggreClassifier)
                            } else {
                                var measure = multiLineString(geom, '_length', pixelCoord, aggreClassifier)
                            }   
                            
                        }
        
                        if (intersection != null) {
                            /**
                             * Intersect indeed takes place based on
                             * given 'intersect' method 
                             */
        
                            if (aggreAttri == '_boolean') {
                                var fractionAttri = 1.0
                                var absoluteAttri = 1.0
        
                            } else if (aggreAttri == '_perimeter') {
        
                                var fractionAttri = measure.fractionAttri
                                var absoluteAttri = measure.absoluteAttri
        
                            } else if (aggreAttri == '_area') {
                                
                                if (intersection.geometry.type == 'Polygon') {
                                    var featCRSChangedGJSlice = reprojectCRS([intersection], 'EPSG:'+dataAggregate[2], 'EPSG:4326')
                                    var polySliceArea = turf.area(featCRSChangedGJSlice)
        
                                    var fractionAttri = polySliceArea/polygonArea
                                    var absoluteAttri = polygonArea
        
                                } else {
                                    /**
                                     * var intersection = turf.intersect(pixelGeom, featGeom)
                                     * Above function would also return Point and 
                                     * LineString, along with Polygon, in case 
                                     * the two polygons touch or overlap eachother 
                                     * along one side. For these scenarios, 
                                     * I have kept fractionAttri to 0.0
                                     */
                                    var fractionAttri = 0.0
                                    var absoluteAttri = polygonArea
        
                                }
        
                            }      
        
                        } else {
                            /**
                             * If no intersection took place, 
                             * use area as absolute attribute, which is not
                             *  going to be used anyway.
                             * If clause has been used for 
                             * _perimeter is used for multipolygon 
                             * scenario where we might need
                             * total perimeter of otherwise
                             * non overlapping polygon to
                             * given pixel.
                             */
        
                            var fractionAttri = NaN
        
                            if (aggreAttri == '_perimeter') {
                                var absoluteAttri = measure.absoluteAttri
        
                            } else {
                                var absoluteAttri = polygonArea
                            }
        
                        }
        
                    }
        
                } else if (aggreClassifier.method == 'gradient') {
        
                }
        
                return {
                    'fractionAttri': fractionAttri,
                    'absoluteAttri': absoluteAttri
                }
                
            } catch (e) {
                console.log(error('Error - polygon() - > ' + e.message))  
            }
    
        }
    
        function multiPoint(item, aggreAttri, pixelCoord, aggreClassifier) {

            /**
             * MultiPoint intersection to Pixel
             * and corresponding fractional overlap
             * calculation
             */
    
            try {
    
                if (aggreClassifier.method == 'intersect') {
    
                    /**
                     * Call point() for each multipoint
                     * point and aggregate results.
                     */
                    var pointResults = []
        
                    l.map(item.data.geometry.coordinates, (pt) => {
                        var geom  = {
                            'data': {
                                'type': 'Feature',
                                'geometry': {
                                    'type': 'Point',
                                    'coordinates': pt
                                }
                            }
                        }
                        var measure = point(geom, aggreAttri, pixelCoord, aggreClassifier)
                        pointResults.push(measure)
                    })
        
                    /**
                     * Aggregate point results.
                     * pointResults.length => Total number of 
                     * points in multipoint.
                     * Count number of results where fractionAttri 
                     * is a valid number, i.e. Point lies inside 
                     * Pixel polygon. pointInPixel.true is 
                     * undefined if no point of multipoint 
                     * lies inside pixel. Total number of 
                     * points otherwise.
                     */
                    var multiPointCount = pointResults.length 
                    var pointInPixel = l.countBy(pointResults, (measure) => {
                        return !Number.isNaN(measure.fractionAttri); 
                    }) 
        
                    if (pointInPixel.true != undefined) {
                        /**
                         * Intersection indeed takes place based
                         * on given 'intersect' method
                         */
        
                        if (aggreAttri == '_boolean') {
                            var fractionAttri = 1.0
                            var absoluteAttri = 1.0
        
                        } else if (aggreAttri == '_frequency') {
                            var fractionAttri = pointInPixel.true/multiPointCount
                            var absoluteAttri = multiPointCount
        
                        }
        
                    } else {
                        /**
                         * NaN is used for fractionAttri for
                         * cases where pixel and feature are
                         * not related at all. 
                         * If no intersection took place, 
                         * use multipoint count as absolute attribute, 
                         * which is not going to be used anyway.
                         */
                        var fractionAttri = NaN
                        var absoluteAttri = multiPointCount
        
                    }
        
                } else if (aggreClassifier.method == 'gradient') {
                    // HANDLE GRADIENT DEFINITION
        
                }
        
                return {
                    'fractionAttri': fractionAttri,
                    'absoluteAttri': absoluteAttri
                }
                
            } catch (e) {
                console.log(error('Error - multiPoint() - > ' + e.message))  
            }
    
        }
    
        function multiLineString(item, aggreAttri, pixelCoord, aggreClassifier) {

            /**
             * MultiLineString intersection to Pixel
             * and corresponding fractional overlap
             * calculation
             */
    
            try {
    
                if (aggreClassifier.method == 'intersect') {
    
                    /**
                     * Call lineString() for each multilinestring
                     * linestring and aggregate results.
                     */
                    var lineStringResults = []
        
                    l.map(item.data.geometry.coordinates, (line) => {
                        var geom  = {
                            'data': {
                                'type': 'Feature',
                                'geometry': {
                                    'type': 'LineString',
                                    'coordinates': line
                                }
                            }
                        }
                        var measure = lineString(geom, aggreAttri, pixelCoord, aggreClassifier)
                        lineStringResults.push(measure)
                    })
        
                    /**
                     * Aggregate lineString results.
                     * multiLineStringLength holds
                     * total length of multilinestring.
                     * lineSliceLength holds length of the
                     * multilinestring that falls inside
                     * given pixel.
                     */
                    var multiLineStringLength = 0.0
                    var lineSliceLength = 0.0
                    l.map(lineStringResults, (rec) => {
                        multiLineStringLength += rec.absoluteAttri
                        if (!Number.isNaN(rec.fractionAttri)) {
                            lineSliceLength += rec.fractionAttri * rec.absoluteAttri
                        } 
                    })
        
                    if (lineSliceLength > 0.0) {
                        /**
                         * Intersect indeed takes place based on
                         * given 'intersect' method
                         */
        
                         if (aggreAttri == '_boolean') {
                            var fractionAttri = 1.0
                            var absoluteAttri = 1.0
        
                         } else if (aggreAttri == '_length') {
        
                            var fractionAttri = lineSliceLength/multiLineStringLength
                            var absoluteAttri = multiLineStringLength
        
                         }
        
                    } else {
                        /**
                         * NaN is used for fractionAttri for
                         * cases where pixel and feature are
                         * not related at all. 
                         * If no intersection took place, 
                         * use multiLineStringLength as 
                         * absolute attribute, which is 
                         * not going to be used anyway.
                         */
                        var fractionAttri = NaN
                        var absoluteAttri = multiLineStringLength
        
                    }
        
        
                } else if (aggreClassifier.method == 'gradient') {
                    // HANDLE GRADIENT DEFINITION
        
                }
        
                return {
                    'fractionAttri': fractionAttri,
                    'absoluteAttri': absoluteAttri
                }
                
            } catch (e) {
                console.log(error('Error - multiLineString() - > ' + e.message))  
            }
    
        }
    
        function multiPolygon(item, aggreAttri, pixelCoord, aggreClassifier) {

            /**
             * MultiPolygon intersection to Pixel
             * and corresponding fractional overlap
             * calculation
             */
    
            try {
    
                if (aggreClassifier.method == 'intersect') {
    
                    /**
                     * Call polygon() for each 
                     * multipolygon polygon, 
                     * merged those that represent
                     * hollow polygon, and 
                     * aggregate results. 
                     */
                    var polygonResults = []
        
                    l.map(item.data.geometry.coordinates, (poly) => {
                        var geom  = {
                            'data': {
                                'type': 'Feature',
                                'geometry': {
                                    'type': 'Polygon',
                                    'coordinates': poly
                                }
                            }
                        }
                        var measure = polygon(geom, aggreAttri, pixelCoord, aggreClassifier)
                        polygonResults.push(measure)
                    })
        
                    /**
                     * Aggregate polygon results.
                     * multiPolygonMeasure holds total
                     * lenght (perimeter) or area of 
                     * multiPolygon. 
                     * polygonSliceMeasure holds length
                     * (perimeter) or area of the 
                     * multipolygon that falls inside
                     * given pixel.
                     */
                    var multiPolygonMeasure = 0.0
                    var polygonSliceMeasure = 0.0
                    l.map(polygonResults, (rec) => {
                        multiPolygonMeasure += rec.absoluteAttri
                        if (!Number.isNaN(rec.fractionAttri)){
                            polygonSliceMeasure += rec.fractionAttri * rec.absoluteAttri
                        }
                    })
        
                    if (polygonSliceMeasure > 0.0) {
                        /**
                         * Intersect indeed takes place based on
                         * given 'intersect' method 
                         */
        
                        if (aggreAttri == '_boolean'){
                            var fractionAttri = 1.0
                            var absoluteAttri = 1.0
        
                        } else if (aggreAttri == '_perimeter' || aggreAttri == '_area') {
        
                            var fractionAttri = polygonSliceMeasure/multiPolygonMeasure
                            var absoluteAttri = multiPolygonMeasure
        
                        } 
        
                    } else {
                        /**
                         * If no intersection took place, 
                         * use area as absolute attribute, 
                         * which is not going to be used anyway.
                         */
                        var fractionAttri = NaN
                        var absoluteAttri = multiPolygonMeasure
        
                    }
        
                } else if (aggreClassifier.method == 'gradient') {
                    // HANDLE GRADIENT DEFINITION
        
                }
        
                return {
                    'fractionAttri': fractionAttri,
                    'absoluteAttri': absoluteAttri
                }
                
            } catch (e) {
                console.log(error('Error - multiPolygon() - > ' + e.message))  
            }
    
        }
    
        function geometryCollection(item, aggreAttri, pixelCoord, aggreClassifier) {

            /**
             * GeometryCollection intersection to Pixel
             * and corresponding fractional overlap
             * calculation
             */
    
            try {
    
                if (aggreClassifier.method == 'intersect') {
    
                    /**
                     * Call point(), lineString(), or
                     * polygon() based on what 
                     * Geometry Collection contains
                     * and aggregate results based on
                     * provided aggreAttri
                     */
                    var geometryCollResults = []
        
                    l.map(item.data.geometry.geometries, (gc) => {
        
                        var geom  = {
                            'data': {
                                'type': 'Feature',
                                'geometry': gc
                            }
                        }
        
                        if (gc.type == 'Point' && (aggreAttri == '_boolean' || aggreAttri == '_frequency')) {
                            var measure = point(geom, aggreAttri, pixelCoord, aggreClassifier)
                            geometryCollResults.push(measure)
        
                        } else if (gc.type == 'LineString' && (aggreAttri == '_boolean' || aggreAttri == '_length')) {
                            var measure = lineString(geom, aggreAttri, pixelCoord, aggreClassifier)
                            geometryCollResults.push(measure)
        
                        } else if (gc.type == 'Polygon' && (aggreAttri == '_boolean' || aggreAttri == '_perimeter' || aggreAttri == '_area')) {
                            var measure = polygon(geom, aggreAttri, pixelCoord, aggreClassifier)
                            geometryCollResults.push(measure)
                        } 
               
                    })
        
                    var boolResult = l.some(geometryCollResults, function(rec) {
                        /**
                         * Check if geometryCollResults
                         * contains at least one 
                         * positive result
                         */
                        return !Number.isNaN(rec.fractionAttri)
                    })
        
                    /**
                     * Aggregate geometry collection results.
                     */
                    switch (aggreAttri) {
        
                        case '_boolean':
        
                            var returnedResult = geometryCollResults.length
        
                            if (returnedResult > 0) {
        
                                if (boolResult) {
                                    var measurefractionAttri = 1.0
                                    var measureAbsoluteAttri = 1.0
            
                                } else {
                                    var measurefractionAttri = NaN
                                    var measureAbsoluteAttri = 1.0
            
                                }
        
                            } else {
                                /**
                                 * This is when there is no
                                 * feature to compare
                                 * _boolean against
                                 */
                                var measurefractionAttri = NaN
                                var measureAbsoluteAttri = NaN
        
                            }  
        
                            break
        
                        case '_frequency':
        
                            var returnedResult = geometryCollResults.length
                            var absAttri = returnedResult
        
                            if (returnedResult > 0) {
        
                                if (boolResult) {
                                    var pointInPixel = l.countBy(geometryCollResults, (measure) => {
                                        return !Number.isNaN(measure.fractionAttri); 
                                    }) 
                                    var measurefractionAttri = pointInPixel.true/absAttri
                                    var measureAbsoluteAttri = absAttri
            
                                } else {
                                    var measurefractionAttri = NaN
                                    var measureAbsoluteAttri = absAttri
            
                                }
        
                            } else {
                                /**
                                 * This is when there is no
                                 * feature to compare
                                 * _frequency against
                                 */
                                var measurefractionAttri = NaN
                                var measureAbsoluteAttri = NaN
        
                            }
        
                            break
        
                        case '_length': 
                        case '_perimeter':
                        case '_area':
        
                            var returnedResult = geometryCollResults.length
        
                            if (returnedResult > 0) {
        
                                var absAttri = 0.0
                                var sliceAttri = 0.0
                                l.map(geometryCollResults, (rec) => {
                                    absAttri += rec.absoluteAttri
                                    if (!Number.isNaN(rec.fractionAttri)) {
                                        sliceAttri += rec.fractionAttri * rec.absoluteAttri
                                    }
                                })
        
                                if (boolResult) {
                                    var measurefractionAttri = sliceAttri/absAttri
                                    var measureAbsoluteAttri = absAttri
        
                                } else {
                                    var measurefractionAttri = NaN
                                    var measureAbsoluteAttri = absAttri
        
                                }
        
                            } else {
                                /**
                                 * This is when there is no
                                 * feature to compare
                                 * _length or _perimeter
                                 * or _area against
                                 */
                                var measurefractionAttri = NaN
                                var measureAbsoluteAttri = NaN
        
                            }
        
                    }
        
                    var fractionAttri = measurefractionAttri
                    var absoluteAttri = measureAbsoluteAttri
        
                } else if (aggreClassifier.method == 'gradient') {
                    // HANDLE GRADIENT DEFINITION
        
                }
                
                return {
                    'fractionAttri': fractionAttri,
                    'absoluteAttri': absoluteAttri
                }
                
            } catch (e) {
                console.log(error('Error - geometryCollection() - > ' + e.message))  
            }
    
        }
    
        if (l.has(item.data.geometry, 'coordinates')) {
    
            switch (item.data.geometry.type) {
                case 'Point': 
                    var measure = point(item, aggreAttri, pixelCoord, aggreClassifier)
                    break
                case 'LineString':
                    var measure = lineString(item, aggreAttri, pixelCoord, aggreClassifier)
                    break
                case 'Polygon':
                    var measure = polygon(item, aggreAttri, pixelCoord, aggreClassifier)
                    break
                case 'MultiPoint':
                    var measure = multiPoint(item, aggreAttri, pixelCoord, aggreClassifier)
                    break
                case 'MultiLineString':
                    var measure = multiLineString(item, aggreAttri, pixelCoord, aggreClassifier)
                    break
                case 'MultiPolygon':
                    var measure = multiPolygon(item, aggreAttri, pixelCoord, aggreClassifier)
            }
    
        } else {
    
            var measure = geometryCollection(item, aggreAttri, pixelCoord, aggreClassifier)
    
        }
    
        return {
            'fractionAttri': measure.fractionAttri,
            'absoluteAttri': measure.absoluteAttri
        }
        
    } catch (e) {
        console.log(error('Error - geomVicinityExtent() - > ' + e.message))  
    }

}

function calculateAggreAttri(item, pixel, dataAggregate, aggreAttri, aggreClassifier) {

    /**
     * Calculate the aggregation attribute
     * defined in fw harmoniser definition
     * using geom and/or corresponding 
     * properties. If returned null, the 
     * two never intersect based on the
     * method defined.
     */

    try {

        var pixelCoord = pixel.coordinates

        /**
         * Returns how much given pixel overlaps
         * to the feature in terms of fractions.
         * Also returns feature's corresponding 
         * absolute value based on aggregationAttribute
         * type. Sample return 
         * {'fractionAttri': 0.8, 'absoluteAttri': 132}
         * Absolute value is in given EPSG Unit.
         * aggreAttri is clear for Point, Line, and Polygon
         * that we have to count, calculate length, and 
         * calculate Area. But aggreAttri param value
         * would be useful when passed on geom
         * is GeometryCollection. In that case, if
         * it's _frequency, we will only consider all points in
         * GeometryCollection. Likewise for aggreAttri 
         * _length or _area. 
         */
        var vicinityExtent = geomVicinityExtent(item, aggreAttri, dataAggregate, pixelCoord, aggreClassifier)

        var calculatedAggreAttri

        /**
         * Calculate what fraction of feature
         * does the given pixel covers. And 
         * based on that calculate aggreAttri
         * value
         */
        switch (aggreAttri) {
            case '_boolean':
            case '_frequency':
            case '_length':
            case '_perimeter':
            case '_area':
                calculatedAggreAttri = vicinityExtent.fractionAttri * vicinityExtent.absoluteAttri
                break
            default:
                var propAttribute = item.data.properties[aggreAttri]
                calculatedAggreAttri = vicinityExtent.fractionAttri * propAttribute
        }

        return Math.round(calculatedAggreAttri * 10000000) / 10000000
        
    } catch (e) {
        console.log(error('Error - calculateAggreAttri() - > ' + e.message))  
    }

}

function transformFeat2PixelAndAggreAttri(dbClient, item, aggreAttri, dataAggregate, aggreClassifier, crsExtent) {
    
    /**
     * aggreClassifier defines how we want to 
     * calculate pixel from geometry.
     * Possible method options are 'intersect',
     * 'gradient' etc. For gradient we 
     * also need to define order, which
     * could be 1, 2, or 3. 
     * OPEN QUESTION HOW TO DEFINE GRADIENT!
     */

    try {

        var transformedFeat2PixelAndAggreAttri = []
        
        var pixeledAllList = pixelAllList(dbClient, item, dataAggregate, aggreClassifier, crsExtent)        

        l.map(pixeledAllList, (pixel) => {
            
            /**
             * Calculate aggregation attribute as 
             * defined in fw harmoniser definition
             * using geom and/or corresponding 
             * properties. If returned null, the 
             * two never intersect based on the
             * classifier defined.
             */
            var calculatedAggreAttri = calculateAggreAttri(item, pixel, dataAggregate, aggreAttri, aggreClassifier)
    
            if (!Number.isNaN(calculatedAggreAttri)) {
                /**
                 * Is no Not A Number means that pixel
                 * and feature somehow overlaps and 
                 * should be considered.
                 */

                var singlePixel = {
                    'pixelId': pixel.pixelId,
                    'aggreAttribute': calculatedAggreAttri,
                    'coordinates': pixel.coordinates
                }
                transformedFeat2PixelAndAggreAttri.push(singlePixel)
            }
    
        })

        return transformedFeat2PixelAndAggreAttri
        
    } catch (e) {
        console.log(error('Error - transformFeat2PixelAndAggreAttri() - > ' + e.message))  
    }

}

function changeDataFormat(submitId, urlArguments, fwDefinition, fwExposure, fwDataSource, fwUniqueSourceIdentifier) {

    try {

        function toShapefile(submitId, urlArguments, fileNameAggreDataGeoJSON, fileNamer, apiEdhHitTime) {
            try {

                var trgShp = fileNamer.processExportFileOrDirPath(submitId, urlArguments, apiEdhHitTime, 'shp', 'aggre') + '.shp'

                var cmd = 'ogr2ogr -nlt POLYGON -skipfailures ' + trgShp + ' ' + fileNameAggreDataGeoJSON

                return new Promise((res, rej) => {
                    exec(cmd, (e, stdout, stderr) => {
                        if (e) {
                            rej()
                        }
                        res()
                    })
                })
                
            } catch (e) {
                console.log(error('Error - toShapefile() - > ' + e.message))  
            }
        }

        function toKml(submitId, urlArguments, fileNameAggreDataGeoJSON, fileNamer, apiEdhHitTime) {
            try {

                var trgKml = fileNamer.processExportFileOrDirPath(submitId, urlArguments, apiEdhHitTime, 'kml', 'aggre')

                var cmd = 'ogr2ogr -f KML ' + trgKml + ' ' + fileNameAggreDataGeoJSON

                return new Promise((res, rej) => {
                    exec(cmd, (e, stdout, stderr) => {
                        if (e) {
                            rej()
                        }
                        res()
                    })
                })
                
            } catch (e) {
                console.log(error('Error - toKml() - > ' + e.message))
            }
        }

        async function toGeoTif(submitId, urlArguments, fileNameAggreDataGeoJSON, fileNamer, apiEdhHitTime, fwDefinition, fwExposure, fwDataSource, fwUniqueSourceIdentifier) {
            try {

                function getGeoJSONExt(fileNameAggreDataGeoJSON) {
                    try {
                        var cmd = 'ogrinfo ' + fileNameAggreDataGeoJSON + ' -al | grep "Extent" -m 1'
                        return new Promise((res, rej) => {  
                            exec(cmd, (e, stdout, stderr) => {
                                if (e) {
                                    res('error')
                                }
                                res(stdout)
                            })
                        })
                    } catch (e) {
                        console.log(error('Error - getGeoJSONExt() - > ' + e.message))
                    }
                }

                function genTif(item, submitId, urlArguments, apiEdhHitTime, geojsonExtent, fileNameAggreDataGeoJSON) {
                    try {
                        /**
                         * Generate geotif images
                         */
                        
                        /**
                         * New naming style including tileid using customNameNew in file_namer.js
                         */
                        var outputFile = fileNamer.processExportFileOrDirPath(submitId, urlArguments, apiEdhHitTime, 'geotif', 'aggre')
                        item = item.charAt(0).toUpperCase() + item.slice(1)
                        outputFile = outputFile.replace("ITEM", item)

                        var cmd = 'gdal_rasterize -te ' + geojsonExtent[0] + ' ' + geojsonExtent[1] + ' ' + geojsonExtent[2] +  ' ' + geojsonExtent[3] + ' -a ' + item + ' -of GTiff -co "COMPRESS=DEFLATE" -tr ' + urlArguments.dataAggregate[0] + ' ' + urlArguments.dataAggregate[1] + ' ' + fileNameAggreDataGeoJSON + ' ' + outputFile

                        return new Promise((res, rej) => {
                            exec(cmd, (e, stdout, stderr) => {
                                if (e) {
                                    rej()
                                }
                                res()
                            })
                        })

                    } catch (e) {
                        console.log(error('Error - genTif() - > ' + e.message))
                    }
                }

                var outputDir = fileNamer.processExportFileOrDirPath(submitId, urlArguments, apiEdhHitTime, 'geotif', 'dir')
                fs.mkdirSync(outputDir) // Generate output dir path

                /**
                 * Get GeoJSON extent
                 */
                var geojsonInfo = await getGeoJSONExt(fileNameAggreDataGeoJSON)
                var regex = /[+-]?\d+(\.\d+)?/g;
                var geojsonInfoArr = geojsonInfo.match(regex)

                if (geojsonInfoArr != null && geojsonInfoArr != 'error') {
                    /**
                     * geojsonInfoArr not null mean 
                     * geojson aggregate is not a null
                     * geojson. Geotif generation will
                     * throw an error otherwise.
                     * Similarly if ohsome geojson is empty 
                     * we need to check for 'error' string
                     * being returned by getGeoJSONExt()
                     */

                    var geojsonExtent = geojsonInfoArr.slice(Math.max(geojsonInfoArr.length - 4, 0))

                    if (urlArguments.dataQuality == true) {
                        /**
                         * Check if OSM data quality needs to be exported or not
                         */

                        await genTif('dataqualityosm', submitId, urlArguments, apiEdhHitTime, geojsonExtent, fileNameAggreDataGeoJSON)
                    }

                    var expUniqueSourceIdentifierList = l.map(fwExposure, 'uniqueSourceIdentifier')

                    if (urlArguments.dataSource == false) {
                        /**
                         * Check if data source needs to 
                         * be exported or not
                         */

                        for (let i=0; i<fwUniqueSourceIdentifier.length; i++) {
                            var item = fwUniqueSourceIdentifier[i]
                            if (expUniqueSourceIdentifierList.includes(item)) {
                                await genTif(item, submitId, urlArguments, apiEdhHitTime, geojsonExtent, fileNameAggreDataGeoJSON)
                            }
                        }
                        
                        return 

                    } else {
                        /**
                         * Make all geotif. Data source 
                         * as well as exposure
                         */

                        for (let i=0; i<fwUniqueSourceIdentifier.length; i++) {
                            var item = fwUniqueSourceIdentifier[i]
                            await genTif(item, submitId, urlArguments, apiEdhHitTime, geojsonExtent, fileNameAggreDataGeoJSON)
                        }
                        
                        return

                    }   

                } else {
                    return
                }
                
            } catch (e) {
                console.log(error('Error - toGeoTif() - > ' + e.message))
            }
        }

        function toGeopackage(submitId, urlArguments, fileNameAggreDataGeoJSON, fileNamer, apiEdhHitTime) {
            try {

                var trgGpkg = fileNamer.processExportFileOrDirPath(submitId, urlArguments, apiEdhHitTime, 'gpkg', 'aggre')

                var cmd = 'ogr2ogr -f GPKG ' + trgGpkg + ' ' + fileNameAggreDataGeoJSON
                
                return new Promise((res, rej) => {
                    exec(cmd, (e, stdout, stderr) => {
                        if (e) {
                            rej()
                        }
                        res()
                    })
                })
                
            } catch (e) {
                console.log(error('Error - toGeopackage() - > ' + e.message))  
            }
        }

        return new Promise((res, rej) => {

            /**
             * List of  supported ogr2ogr
             * data formats -
             * $gdalinfo --formats
             */

            var fileNamer = new FileNamer()
            var apiEdhHitTime = urlArguments['ohsomeDataTime']
            var fileNameAggreDataGeoJSON = fileNamer.processExportFileOrDirPath(submitId, urlArguments, apiEdhHitTime, 'geojson', 'aggre')

            var promiseList = []

            l.map(urlArguments.dataFormat, (format) => {
                switch (format) {
                    case 'shapefile':
                        promiseList.push(toShapefile(submitId, urlArguments, fileNameAggreDataGeoJSON, fileNamer, apiEdhHitTime))
                        break;
                    case 'kml':
                        promiseList.push(toKml(submitId, urlArguments, fileNameAggreDataGeoJSON, fileNamer, apiEdhHitTime))
                        break;
                    case 'geotif':
                        promiseList.push(toGeoTif(submitId, urlArguments, fileNameAggreDataGeoJSON, fileNamer, apiEdhHitTime, fwDefinition, fwExposure, fwDataSource, fwUniqueSourceIdentifier))
                        break;
                    case 'geopackage':
                        promiseList.push(toGeopackage(submitId, urlArguments, fileNameAggreDataGeoJSON, fileNamer, apiEdhHitTime))
                        break;
                }
            })

            Promise.all(promiseList)
                .then((r) => {
                    res()
                })
                .catch((e) => {
                    rej(console.log(error('Error - changeDataFormat() - > ' + e.message)))
                })
        })
        
    } catch (e) {
        console.log(error('Error - changeDataFormat() - > ' + e.message))
    }

}

function dwnGeoJSONFromS3(downloadLink, downloadFileNamePath) {
    try {

        return new Promise((res, rej) => {
            progressHttp(
                (requestHttp.get({url:downloadLink}) 
                    .on('response', (rHttp) => {
                        if (rHttp.statusCode != 200) {
                            console.log(error('Error - dwnGeoJSONFromS3() - > ' + rHttp.statusCode + ' AWS S3 Remote Error!'))
                            rej()
                        } 
                    })
                )
            , {
            })
            .on('progress', (state) => {
            })
            .on('error', (e) => {
                console.log(error('Error - dwnGeoJSONFromS3() - > ' + e.message))
                rej() 
            })
            .on('end', () => {
                res()
            })
            .pipe(fs.createWriteStream(downloadFileNamePath))
        })
        
    } catch (e) {
        console.log(error('Error - dwnGeoJSONFromS3() - > ' + e.message))
    }
}

function tippecanoeTileGen(processDirTile, downloadFileNamePath) {
    try {

        var cmd = 'tippecanoe -e ' + processDirTile + ' ' + downloadFileNamePath + ' -Z0 -z13 -d19 -pk -pf -F'

        return new Promise((res, rej) => {
            exec(cmd, (e, stdout, stderr) => {
                if (e) {
                    rej()
                }
                res()
            });
        })
        
    } catch (e) {
        console.log(error('Error - tippecanoeTileGen() - > ' + e.message))
    }
}

function pushTippecanoeTile2LocalDir(processDir, themeName) {
    try {

        var fileNamer = new FileNamer() 

        /**
         * Make mb-tiles root dir
         */
        var appRootMbtileHub = path.join(appRoot.path, '..')
        var mbtilesDir = `${appRootMbtileHub}/${config.get('server.mbTile.mbTileHub')}`
        if (!fs.existsSync(mbtilesDir)) {
            fs.mkdirSync(mbtilesDir)
        }

        /**
         * Make mb-tiles theme dir
         */
        var themeDir = `${mbtilesDir}/${themeName}`
        if (!fs.existsSync(themeDir)) {
            fs.mkdirSync(themeDir)
        } else {
            var tmpDirs = fileNamer.themeDirs(themeDir) // url_cacher/request and url_cacher/export
            del.sync(tmpDirs, {force: true})                            
        }

        /**
         * Move pbf files to dir
         */
        fsExtra.copySync(`${processDir}/${themeName}`, themeDir)

        return
        
    } catch (e) {
        console.log(error('Error - pushTippecanoeTile2LocalDir() - > ' + e.message))
    }
}

function pushTippecanoeTile2S3(processDir) {
    try {

        var awsAccessKeyId = config.get('aws.AWS_ACCESS_KEY_ID')
        var awsSecretAccessKey = config.get('aws.AWS_SECRET_ACCESS_KEY')
        var s3DataExportBucket = config.get('aws.s3Bucket') + '/' + config.get('aws.testDir') + '/'

        var cmd = 'AWS_ACCESS_KEY_ID=' + awsAccessKeyId + ' AWS_SECRET_ACCESS_KEY=' + awsSecretAccessKey + ' aws s3 cp ' + processDir + ' s3://' + s3DataExportBucket + ' --recursive --acl public-read'

        return new Promise((res, rej) => {
            exec(cmd, (e, stdout, stderr) => {
                if (e) {
                    rej()
                }
                res()
            });
        })
        
    } catch (e) {
        console.log(error('Error - pushTippecanoeTile2S3() - > ' + e.message))
    }
}

module.exports = {
    changeCRS,
    reprojectCRS,
    pixelAllList,
    unionDataDump,
    changeDataFormat,
    dwnGeoJSONFromS3,
    tippecanoeTileGen,
    pushTippecanoeTile2S3,
    mergeSortedPixelIdFiles,
    pushTippecanoeTile2LocalDir,
    transformFeat2PixelAndAggreAttri
}