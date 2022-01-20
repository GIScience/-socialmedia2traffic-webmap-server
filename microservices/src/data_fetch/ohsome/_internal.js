'use strict'

// Load `require` directives - external
const l = require('lodash'),
    axios = require('axios'),
    fs = require('fs'),
    del = require('del'),
    memoryCacher = require('memory-cache'),
    gjValidate= require("geojson-validation"),
    fg = require('fast-glob'),
    path = require('path'),
    readline = require('readline'),
    pick = require('stream-json/filters/Pick'),
    Batch = require('stream-json/utils/Batch'),
    {streamArray} = require('stream-json/streamers/StreamArray'),
    {chain} = require('stream-chain'),
    requestHttp = require('request'),
    got = require('got'),
    {promisify} = require('util'),
    stream = require('stream'),
    https = require('https'),
    pipeline = promisify(stream.pipeline),
    progressHttp = require('request-progress'),
    clc = require("cli-color"),
    flat = require('flat'),
    through2 = require('through2'),
    unflat = require('flat').unflatten
// Load `require` directives - internal
const config = require('config'),
    DataDb = require('../../../../db/mongo/src/datadb_connect'),
    LogDb = require('../../../../db/mongo/src/logdb_connect')
const { validate } = require('joi')

var error = clc.red.bold,
    warn = clc.yellow,
    notice = clc.blue

function singleParseFile(dwnOSMFiles) {

    try {

        return new Promise((res, rej) => {
            var pipeline = chain([ // More - https://github.com/uhop/stream-json/wiki/Pick
                fs.createReadStream(dwnOSMFiles),
                pick.withParser({filter: 'status'}),
                streamArray()
            ])
            pipeline.on('data', (data) => {
                })
                .on('end', () => {
                    res(true)
                })
                .on('error', (e) => {
                    /**
                     * For errored responses the returned
                     * GeoJSON would have "status" : 404 kind
                     * of key-value. This will break here
                     * as filter: 'status' expects an 
                     * array as value of 'status'.
                     * As for reponses that are timedout
                     * it will break as the file itself
                     * is broken.
                     */
                    console.log(warn('Error - singleParseFileInternal() - > ' + e.message))
                    rej(false)
                })
        })
        
    } catch (e) {
        console.log(error('Error - singleParseFile() - > ' + e.message))
    }

}

async function validateDwn1(fileNamer) {
    try {
        var dwnOSMFiles = fileNamer.dwnFilesList()

        for (let i=0; i<dwnOSMFiles.length; i++) {
            /**
             * Lodash is not being used coz await 
             * can't be used properly here. 
             * Also, not possible for .forEach().
             * Push each file one after another.
             */
            let bool = await singleParseFile(dwnOSMFiles[i])
            if (!bool) {
                console.log(dwnOSMFiles[i], "failed geojson file")
                return false
            }
            
        }
        return true
        
    } catch (e) {
        console.log(error('Error - validateDwn() - > ' + e.message))
    }
}

function runRequest(urlParams, fileName) {

    try {

        var outStream = fs.createWriteStream(fileName)
        outStream.writable = true

        if (urlParams.start == true) {
            var url = config.get('osm.ohsome.endpoint') + config.get('osm.ohsome.element')
        } else {
            var url = config.get('osm.ohsome.endpoint') + config.get('osm.ohsome.contributions')
        }

        var params = { bboxes: urlParams.bbox, 
            properties: urlParams.properties,
            showMetadata: urlParams.showMetadata,
            time: urlParams.time,
            clipGeometry: urlParams.clipGeometry,
            filter: urlParams.filter}

        /**
         * Request package is being used coz otherwise
         * big response will cause Node 256MB
         * file size limit Buffer error.
         * Return it successfully even if failed,
         * in order not to fail Promise.all 
         * at getData().
         */

        params = Object.keys(params).map(function(k) {return encodeURIComponent(k) + '=' + encodeURIComponent(params[k])}).join('&')

        return new Promise((res, rej) => {

            https.get(url + '?' + params, (resp) => {

                // A chunk of data has been received.
                resp.on('data', (chunk) => {
                    outStream.write(chunk)
                });

                resp.on('error', () => {
                    rej()
                })

                // The whole response has been received. Print out the result.
                resp.on('end', () => {
                    res()
                });

            }).on("error", (e) => {
                console.log(error('Error - runRequestInternal() - > ' + e.message))
                rej()
            }); 

        })
        
    } catch (e) {
        console.log(error('Error - runRequest() - > ' + e.message))
    }

}


function runRequest2(urlParams, fileName) {

    try {

        var outStream = fs.createWriteStream(fileName)
        outStream.writable = true

        if (urlParams.start == true) {
            var url = config.get('osm.ohsome.endpoint') + config.get('osm.ohsome.element')
        } else {
            var url = config.get('osm.ohsome.endpoint') + config.get('osm.ohsome.contributions')
        }

        var params = { bboxes: urlParams.bbox, 
            properties: urlParams.properties,
            showMetadata: urlParams.showMetadata,
            time: urlParams.time,
            clipGeometry: urlParams.clipGeometry,
            filter: urlParams.filter}

        /**
         * Request package is being used coz otherwise
         * big response will cause Node 256MB
         * file size limit Buffer error.
         * Return it successfully even if failed,
         * in order not to fail Promise.all 
         * at getData().
         */

        return new Promise((res, rej) => {
            axios({
                method: 'get',
                url,
                params: params,
                responseType: 'stream'
            })
            .then((result) => {
                var httpCode = result.status.toString()
                if (httpCode.charAt(0) == '4') {
                    console.log('Error - runRequest() - > ' + result.status + ' Client Error!')
                    rej()
                } else if (httpCode.charAt(0) == '5') {
                    console.log('Error - runRequest() - > ' + result.status + ' Server Error!')
                    rej()
                } 

                console.log("aax1")
                result.data.pipe(outStream)
                console.log("aax2")
                
            })
            .catch((e) => {
                console.log("axios error - ", e.message)
                rej()
            })
            .then(() => {
                console.log("aax3")
                res()
            });  

        })
        
    } catch (e) {
        console.log(error('Error - runRequest() - > ' + e.message))
    }

}

function dwnVal(urlParams, tileInfo, fileName) {
    try {

        /**
         * Download tile
         */
        return new Promise((res, rej) => {
            runRequest(urlParams, fileName)
            .then((r) => {
                singleParseFile(fileName)
                .then((r) => {
                    res({
                        bool: true,
                        tileInfo: tileInfo,
                        fileName: fileName
                    }) // Tile fetch was successful
                })
                .catch((e) => {
                    res({
                        bool: false,
                        tileInfo: tileInfo,
                        fileName: fileName
                    }) // Tile fetch was unsuccessful
                })
            })
            .catch((e) => {
                res({
                    bool: false,
                    tileInfo: tileInfo,
                    fileName: fileName
                }) // Tile fetch was unsuccessful
            })
        })
        
    } catch (e) {
        console.log(error('Error - dwnVal() - > ' + e.message))
    }
}

function dwnGroupKeyVal(batchDownloadList, downloadFileNamesList) {
    try {

        return new Promise((res, rej) => {

            var urlParamsList = genUrlParams(batchDownloadList) // Generate Urls for batch download

            var tileJobBatch = []

            for (let i=0; i<urlParamsList.length; i++) {
                var oneTileJob = dwnVal(urlParamsList[i], batchDownloadList[i], downloadFileNamesList[i])
                tileJobBatch.push(oneTileJob)
            }

            Promise.all(tileJobBatch)
                .then((result) => {
                    res(result)
                })
                .catch((e) => {
                    res() 
                })

        })
        
    } catch (e) {
        console.log(error('Error - dwnGroupKeyVal() - > ' + e.message))
    }
}

async function tileExplodedwnGroupKeyVal(tileFailed) {
    try {
        /**
         * Break big tile into smaller one 
         * and try download once more. If 
         * any smaller tile download gets 
         * failed then skip the whole tile
         */

        var tileExplodedFilenamesList = []
        var tileExplodedDownloadList = []
        var tileExplodedDownloadListFailed = []

        for (let i=0; i<tileFailed.length; i++) {

            /**
             * Generate new exploded tiles bbox
             */
            var tileGeom = tileFailed[i].tileInfo.tile.tileGeom
            var xArr = [tileGeom.coordinates[0][0][0], tileGeom.coordinates[0][2][0]]
            var yArr = [tileGeom.coordinates[0][0][1], tileGeom.coordinates[0][2][1]]
            var xMin = Math.min(...xArr)
            var xMax = Math.max(...xArr)
            var yMin = Math.min(...yArr)
            var yMax = Math.max(...yArr)
            var xSteps = l.range(xMin, xMax, config.get('osm.ohsome.tileExplodeSizeDeg'))
            var ySteps = l.range(yMin, yMax, config.get('osm.ohsome.tileExplodeSizeDeg'))
            var xStepsAll = l.concat(xSteps, [xMax])
            var yStepsAll = l.concat(ySteps, [yMax])

            var tileExplodeArr = []

            /**
             * Making new smaller requests params
             */
            var count = 0
            for (let j=0; j<(xStepsAll.length - 1); j++) {
                for (let k=0; k<(yStepsAll.length - 1); k++) {

                    let x0 = xStepsAll[j]
                    let x1 = xStepsAll[j+1]
                    let y0 = yStepsAll[k]
                    let y1 = yStepsAll[k+1]

                    let tileInfoNew = l.cloneDeep(tileFailed[i].tileInfo) // Deep Cloning is needed otherwise it will act like a pointer

                    tileInfoNew.tile.tileGeom.coordinates = [
                        [
                            [x0, y0],
                            [x1, y0],
                            [x1, y1],
                            [x0, y1],
                            [x0, y0]
                        ]
                    ]

                    tileExplodeArr.push({
                        'tileInfo': tileInfoNew,
                        'fileName': tileFailed[i].fileName.slice(0, -8) + '-' + count + '.geojson'
                    })

                    count++
                }
            }

            /**
             * Sending requests one by one
             */
            var tileExplodedFilenamesListSingleTile = []
            var tileExplodedDownloadListSingleTile = []
            for (let m=0; m<tileExplodeArr.length; m++) {

                /**
                 * Download one tile at a time
                 */
                var res = await dwnGroupKeyVal([tileExplodeArr[m].tileInfo], [tileExplodeArr[m].fileName])

                var resFalse = l.filter(res, {bool:false})

                if (resFalse.length > 0) {
                    /**
                     * Download failed again. Skip that 
                     * whole tile in that case and delete
                     * any other sub tiles of that tile
                     */
                    tileExplodedDownloadListFailed.push(tileFailed[i].tileInfo)
                    del.sync([tileExplodeArr[m].fileName], {force: true})
                    break
                } else {
                    tileExplodedFilenamesListSingleTile.push(tileExplodeArr[m].fileName)
                    tileExplodedDownloadListSingleTile.push(tileFailed[i].tileInfo)
                }
            }

            if (tileExplodedFilenamesListSingleTile.length == tileExplodeArr.length) {
                /**
                 * Insert into final return if all
                 * smaller tiles of given tile 
                 * successfully downloaded
                 */

                tileExplodedDownloadListSingleTile = l.uniqWith(tileExplodedDownloadListSingleTile, l.isEqual)

                tileExplodedFilenamesList = l.concat(tileExplodedFilenamesList, tileExplodedFilenamesListSingleTile)

                tileExplodedDownloadList = l.concat(tileExplodedDownloadList, tileExplodedDownloadListSingleTile)
            }

        }

        return {
            'tileExplodedFilenamesList': tileExplodedFilenamesList,
            'tileExplodedDownloadList': tileExplodedDownloadList,
            'tileExplodedDownloadListFailed': tileExplodedDownloadListFailed
        }
        
    } catch (e) {
        console.log(error('Error - tileExplodedwnGroupKeyVal() - > ' + e.message))
    }
}

async function txt2Mongo(dataDb, fileName) {
    try {

        var lineReader = readline.createInterface({
            input: require('fs').createReadStream(fileName)
        })

        // lineReader.on('line', async (item) => {

        // })

        for await (var item of lineReader) {
            
            item = JSON.parse(item)

            if (!l.has(item.properties, '@deletion')) {
                /**
                 * We do not need bbox etc when
                 * the feature is of deletion type
                 * of contribution latest endpoint
                 */

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
                        ],
                        [
                            bboxCoord[0],
                            bboxCoord[1]
                        ]
                    ]
                }

                l.assign(item, {'bboxGeom': bboxGeom}) // Insert bboxGeom for each feature

                l.assign(item, {'osmId': item.properties['@osmId']}) // Insert osmId for each feature

            }

            /**
             * Always check for duplicacy 
             * even if a new tile is being imported.
             * Note that ideally whenever a new theme is
             * being defined, initial bulk download using
             * /element/geometry is being done by admin
             * using steps defined here https://gitlab.com/jrc_osm/edh_db/-/issues/10
             * therefore any subsequent fetch using
             * /contributions/latest/geometry needs to 
             * be checked for duplicacy
             */                
            if (l.has(item.properties, '@deletion')) {
                // old feature got deleted
                await dataDb.data2DbDelete(item)

            } else if (l.has(item.properties, '@geometryChange') || l.has(item.properties, '@tagChange')) {
                // geometry gets updated
                await dataDb.data2DbUpdate(item)

            } else {
                // new feature being inserted
                await dataDb.data2DbInsert(item)
            }
            
        }

        return 
        
    } catch (e) {
        console.log(error('Error - txt2Mongo() - > ' + e.message))
    }
}

async function pushDownloadTiles(dataDb, downloadFileNamesList, startOhsomeDataTimeList) {
    try {

        for (let i=0; i<downloadFileNamesList.length; i++) {
            await pushSingleTile(dataDb, downloadFileNamesList[i], startOhsomeDataTimeList[i])
        }

        return
        
    } catch (e) {
        console.log(error('Error - pushDownloadTiles() - > ' + e.message))
    }
}

async function updateDownloadTiles(logDb, batchDownloadList, status) {
    try {

        var insertLog = []
        l.map(batchDownloadList, (item) => {
            insertLog.push({
                'status': status,
                'zoom': item.tile.zoom,
                'tileGeom': item.tile.tileGeom,
                'key': item.key,
                'value': item.value,
                'ohsomeDataTime': item.endOhsomeDataTime
            })
        })

        await logDb.logDownloadedTile(insertLog)

        return
        
    } catch (e) {
        console.log(error('Error - updateDownloadTiles() - > ' + e.message))
    }
}

async function getOSMData(logDb, newTileDownloadsList, fileNamer) {

    /**
     * Download, Validate, and Update OSM data to Db.
     */

    try {

        var maxOhsomeBatchReq = config.get('osm.ohsome.apiMaxBatchReq')
        var batchDownloadList = []
        var downloadFileNamesList = []
        var downloadFileNamesListAll = []
        var startOhsomeDataTimeList = []
        var fetchedTilesListAll = []

        for (let i=0; i<newTileDownloadsList.length; i++) { 

            /**
             * Create filename
             */
            var keyvalue = {
                'key': newTileDownloadsList[i].key,
                'value': newTileDownloadsList[i].value
            }
            var fileName = fileNamer.getOhsomeFileName(keyvalue)
            downloadFileNamesList.push(fileName)

            /**
             * Insert corresponding startOhsomeDataTime
             */
            startOhsomeDataTimeList.push(newTileDownloadsList[i].startOhsomeDataTime)

            /**
             * Download tiles in group
             */
            batchDownloadList.push(newTileDownloadsList[i])

            if (batchDownloadList.length == maxOhsomeBatchReq) {

                /**
                 * Download tiles in group
                 */
                var res = await dwnGroupKeyVal(batchDownloadList, downloadFileNamesList)

                var resFalse = l.filter(res, {bool:false})

                if (resFalse.length > 0) {

                    /**
                     * Delete if any tile which is broken
                     * or belongs to last batch download
                     * already exists
                     */
                    var delFiles = l.map(resFalse, 'fileName')
                    del.sync(delFiles, {force: true})

                    // Download by breaking down url
                    var tileExploded = await tileExplodedwnGroupKeyVal(resFalse)
                    var tileExplodedFilenamesList = tileExploded.tileExplodedFilenamesList
                    var tileExplodedDownloadList = tileExploded.tileExplodedDownloadList
                    var tileExplodedDownloadListFailed = tileExploded.tileExplodedDownloadListFailed

                    // Log any failed tile
                    if (tileExplodedDownloadListFailed.length > 0) {
                        await updateDownloadTiles(logDb, tileExplodedDownloadListFailed, 'fail')
                    }

                    // Insert downloaded tiles filename to downloadFileNamesListAll
                    downloadFileNamesListAll = l.concat(downloadFileNamesListAll, tileExplodedFilenamesList)

                    // Insert downloaded tiles info to fetchedTilesListAll
                    fetchedTilesListAll = l.concat(fetchedTilesListAll, tileExplodedDownloadList)

                } else {

                    // Insert downloaded tiles filename to downloadFileNamesListAll
                    downloadFileNamesListAll = l.concat(downloadFileNamesListAll, downloadFileNamesList)

                    // Insert downloaded tiles info to fetchedTilesListAll
                    fetchedTilesListAll = l.concat(fetchedTilesListAll, batchDownloadList)
                    
                }

                batchDownloadList = []
                downloadFileNamesList = []
                startOhsomeDataTimeList = []

            }
            
        }

        if (batchDownloadList.length > 0) {

            /**
             * Download tiles in group
             */
            var res = await dwnGroupKeyVal(batchDownloadList, downloadFileNamesList)

            var resFalse = l.filter(res, {bool:false})

            if (resFalse.length > 0) {

                /**
                 * Delete if any tile which is broken
                 * or belongs to last batch download
                 * already exists
                 */
                var delFiles = l.map(resFalse, 'fileName')
                del.sync(delFiles, {force: true})

                // Download by breaking down url
                var tileExploded = await tileExplodedwnGroupKeyVal(resFalse)
                var tileExplodedFilenamesList = tileExploded.tileExplodedFilenamesList
                var tileExplodedDownloadList = tileExploded.tileExplodedDownloadList
                var tileExplodedDownloadListFailed = tileExploded.tileExplodedDownloadListFailed

                // Log any failed tile
                if (tileExplodedDownloadListFailed.length > 0) {
                    await updateDownloadTiles(logDb, tileExplodedDownloadListFailed, 'fail')
                }

                // Insert downloaded tiles filename to downloadFileNamesListAll
                downloadFileNamesListAll = l.concat(downloadFileNamesListAll, tileExplodedFilenamesList)

                // Insert downloaded tiles info to fetchedTilesListAll
                fetchedTilesListAll = l.concat(fetchedTilesListAll, tileExplodedDownloadList)

            } else {

                // Insert downloaded tiles filename to downloadFileNamesListAll
                downloadFileNamesListAll = l.concat(downloadFileNamesListAll, downloadFileNamesList)

                // Insert downloaded tiles info to fetchedTilesListAll
                fetchedTilesListAll = l.concat(fetchedTilesListAll, batchDownloadList)

            }
            
        }

        return {
            'downloadFileNamesListAll': downloadFileNamesListAll,
            'fetchedTilesListAll': fetchedTilesListAll
        }
        
    } catch (e) {
        // throw new Error(e.message);
        console.log(error('Error - getOSMData() - > ' + e.message))
    }

}

function singleTile2Txt(outStream, fileName) {
    try {

        return new Promise((res, rej) => {
            fs.createReadStream(fileName)
            .pipe(pick.withParser({filter: 'features'})) // More - https://github.com/uhop/stream-json/wiki/Pick
            .pipe(streamArray())
            .pipe(new Batch({batchSize: config.get('server.batchSize')})) // Takes file in big chunks. Single item means too many Mongo Insert operations and many items mean high memory usage. More - https://github.com/uhop/stream-json/wiki/Batch.
            .pipe(through2.obj(async (chunk, enc, callback) => {

                chunk = l.map(chunk, 'value')
                l.map(chunk, (item) => {
                    fs.writeSync(outStream, JSON.stringify(item) + '\n')
                })
                
                callback()
            }))
            .on('data', (data) => {
            })
            .on('end', () => {
                res()
            })
            .on('error', (e) => {
                rej(console.log(error('Error - singleTile2Txt() - > ' + e.message)))
            })
        })
        
    } catch (e) {
        console.log(error('Error - singleTile2Txt() - > ' + e.message))
    }
}

async function tmpMergeTile2RowFile(tmpCSVTileMerged, downloadFileNamesListAll) {
    try {

        var outStream = fs.openSync(tmpCSVTileMerged, 'w')

        for (let i=0; i<downloadFileNamesListAll.length; i++) {
            await singleTile2Txt(outStream, downloadFileNamesListAll[i])
        }

        fs.closeSync(outStream)

        return 
        
    } catch (e) {
        console.log(error('Error - tmpMergeTile2RowFile() - > ' + e.message))
    }
}

async function newFetchBool(logDb) {
    try {
        var ohsomeLatestDataTime = await getOhsomeLatestDataTime() // Get latest available dataset in Ohsome

        var newOhsomeFetch = await logDb.checkNewFetch(ohsomeLatestDataTime) // Check if already latest dataset is catched from Ohsome on our end

        if (newOhsomeFetch.length == 0) {
            let fetchBool = true
            return {fetchBool, ohsomeLatestDataTime}
        } else {
            let fetchBool = false
            return {fetchBool, ohsomeLatestDataTime}
        }
        
    } catch (e) {
        // throw new Error(e.message);
        console.log(error('Error - newFetchBool() - > ' + e.message))
    }
}

const memCache = new memoryCacher.Cache() 
function getOhsomeLatestDataTime() {

    /**
     * Get Timestamp of latest available OSM dataset in Ohsome
     */

    try {

        var lastOhsomeDataTime = memCache.get('ohsomeDataTime')  

        if (typeof(lastOhsomeDataTime) == 'string') {

            return new Promise((res, rej) => {
                res(lastOhsomeDataTime)
            })
            
        } else {

            var url = 'https://api.ohsome.org/v1' + config.get('osm.ohsome.metadata') // DELETE IT. Use only when using Internal Ohsome instance. For now we can keep it like this as long as the version number of api remains v1

            return new Promise((res, rej) => {
                axios({
                    method: 'get',
                    url,
                    responseType: 'json'
                })
                .then((result) => {
                    // res("2020-09-29T03:00:00Z") // DELETE IT
                    var timeStamp = result.data.extractRegion.temporalExtent.toTimestamp
                    memCache.put('ohsomeDataTime', timeStamp, config.get('osm.ohsome.waitBeforeNewDataInSec')*1000)
                    res(timeStamp) // UNCOMMENT IT
                })
                .catch((e) => {
                    console.log(error('Error - getOhsomeLatestDataTime() - > ' + e.message))
                    rej(e.message)
                })
            })

        }
        
    } catch (e) {
        console.log(error('Error - getOhsomeLatestDataTime() - > ' + e.message))
    }

}

function genUrlParams(batchDownloadList) {
    try {
        /**
         * Generate URL List params for each tile download
         */

         var urlListParams = []
         l.map(batchDownloadList, (item) => {
            let xArr = [item.tile.tileGeom.coordinates[0][0][0], item.tile.tileGeom.coordinates[0][2][0]]
            let yArr = [item.tile.tileGeom.coordinates[0][0][1], item.tile.tileGeom.coordinates[0][2][1]]

            let bbox = l.min(xArr)+','+l.min(yArr)+','+l.max(xArr)+','+l.max(yArr)
            let properties = 'tags,metadata'
            let showMetadata = 'true'
            let key = item.key
            let clipGeometry = 'false'
            let value = item.value
            let filter = key+'='+value+' and (geometry:point or geometry:polygon or geometry:line)'

            if (item.startOhsomeDataTime == config.get('osm.ohsome.osmStartDate')) {
                var time = item.endOhsomeDataTime
                var start = true
            } else {
                var time = item.startOhsomeDataTime+','+item.endOhsomeDataTime
                var start = false
            }

            urlListParams.push({
                'start': start,
                'bbox': bbox,
                'properties': properties,
                'showMetadata': showMetadata,
                'time': time,
                'filter': filter,
                'key': item.key,
                'clipGeometry': clipGeometry,
                'value': item.value,
                'endOhsomeDataTime': item.endOhsomeDataTime
            })

         })

         return urlListParams
        
    } catch (e) {
        console.log(error('Error - genUrlParams() - > ' + e.message))
    }
}

async function newTileDownloads(logDb, tiles, keyval, ohsomeDataTime) {
    try {

        var newDownloadsNeeded = []
        for (let i=0; i<tiles.length; i++) {
            for (let j=0; j<keyval.keyval.length; j++) {
                var result = await logDb.checkTileFetch(tiles[i], keyval.keyval[j])

                result = l.orderBy(result, ['ohsomeDataTime'], ['desc'])

                if (result.length > 0) {
                    if (result[0].ohsomeDataTime == ohsomeDataTime) {
                        var newTileDate = null // No download needed
                    } else if (result[0].ohsomeDataTime != ohsomeDataTime) {
                        var newTileDate =  {
                            'startDate': result[0].ohsomeDataTime,
                            'endDate': ohsomeDataTime
                        }
                    }
                } else {
                    var newTileDate = {
                        'startDate': config.get('osm.ohsome.osmStartDate'),
                        'endDate': ohsomeDataTime
                    }
                }

                if (newTileDate != null) {
                    newDownloadsNeeded.push({
                        'tile': tiles[i],
                        'key':  keyval.keyval[j].key,
                        'value':  keyval.keyval[j].value,
                        'startOhsomeDataTime': newTileDate.startDate,
                        'endOhsomeDataTime': newTileDate.endDate
                    })
                }
            }
        }

        return newDownloadsNeeded

    } catch (e) {
        console.log(error('Error - newTileDownloads() - > ' + e.message))
    }
}

function getData(keyvalue, bboxBatches, ohsomeLatestDataTime, fileNamer, logDb, geoDataFetchTime) {

    try {

        return new Promise((res, rej) => {
            var urlList = genUrl(keyvalue, bboxBatches, ohsomeLatestDataTime) // Generate Urls for batch download
    
            var runRequestBatch = l.map(urlList, (item) => {
                return runRequest(item, keyvalue, fileNamer, logDb, geoDataFetchTime)
            })
    
            /**
             * Following Promise.all succeeds no matter
             * if individual GET fails; mainly to let 
             * other GETs done.
             */
            Promise.all(runRequestBatch)
                .then((result) => {
                    res()
                })
                .catch((e) => {
                    rej(console.log(error('Error - getData() - > ' + e.message)))
                    // throw new Error(e.message)
                })
        })
        
    } catch (e) {
        console.log(error('Error - getData() - > ' + e.message))
    }

}

async function dwnSingleKeyVal(singleDownloadTile, logDb, fileNamer) {

    /**
     * Download, Validate, and Update 
     * single OSM key value 
     * data to Db.
     */

    try {
        
        /**
         * RUN BATCH PROCESS to download, validate, and insert GeoJSON.
         */
        var bboxBatches = l.chunk(downloadBboxes, config.get('osm.ohsome.apiMaxBatchReq'))
        for (let i=0; i<bboxBatches.length; i++) {
            await getData(keyvalue, bboxBatches[i], ohsomeLatestDataTime, fileNamer, logDb, geoDataFetchTime) // Get data from Ohsome
        }
        return
        
    } catch (e) {
        // throw new Error(e.message);
        console.log(error('Error - dwnSingleKeyVal() - > ' + e.message))
    }

}

async function dwnSingleKeyVal1(keyvalue, ohsomeLatestDataTime, fileNamer, logDb, geoDataFetchTime) {

    /**
     * Download, Validate, and Update 
     * single OSM key value 
     * data to Db.
     */

    try {
        var downloadBboxes = genDownloadBboxes()
        
        /**
         * RUN BATCH PROCESS to download, validate, and insert GeoJSON.
         */
        var bboxBatches = l.chunk(downloadBboxes, config.get('osm.ohsome.apiMaxBatchReq'))
        for (let i=0; i<bboxBatches.length; i++) {
            await getData(keyvalue, bboxBatches[i], ohsomeLatestDataTime, fileNamer, logDb, geoDataFetchTime) // Get data from Ohsome
        }
        return
        
    } catch (e) {
        // throw new Error(e.message);
        console.log(error('Error - dwnSingleKeyVal() - > ' + e.message))
    }

}

function genDownloadBboxes() {

    try {

        var downloadTiles = []

        var xSteps = l.range(
            config.get('osm.ohsome.downloadCoverageInDeg')[0], 
            config.get('osm.ohsome.downloadCoverageInDeg')[2],
            config.get('osm.ohsome.downloadTileBboxInDeg')[0])

        var ySteps = l.range(
            config.get('osm.ohsome.downloadCoverageInDeg')[1], 
            config.get('osm.ohsome.downloadCoverageInDeg')[3], 
            config.get('osm.ohsome.downloadTileBboxInDeg')[1])

        var xMin, yMin, xMax, yMax

        l.map(xSteps, (xitem, xindex) => {
            l.map(ySteps, (yitem, yindex) => {

                xMin = xSteps[xindex].toFixed(2) // Round of to two decimal places
                yMin = ySteps[yindex].toFixed(2)
                
                xMax = (typeof xSteps[xindex+1] == 'undefined') 
                            ? (config.get('osm.ohsome.downloadCoverageInDeg')[2].toFixed(2)) 
                            : (xSteps[xindex+1].toFixed(2))

                yMax = (typeof ySteps[yindex+1] == 'undefined') 
                            ? (config.get('osm.ohsome.downloadCoverageInDeg')[3].toFixed(2)) 
                            : (ySteps[yindex+1].toFixed(2))
                
                if ((xMin !== xMax) && (yMin !== yMax)) { // This check is to avoid some internal JS round off 
                    downloadTiles.push({
                        'xMin': xMin, 
                        'yMin': yMin,
                        'xMax': xMax,
                        'yMax': yMax
                    })
                }
            })
        })
        return downloadTiles
        
    } catch (e) {
        console.log(error('Error - genDownloadBboxes() - > ' + e.message))
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
                console.log(error('Error - geomCorrectLimits() - > ' + e.message))
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
        console.log(error('Error - geomCorrection() - > ' + e.message))
    }

}

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
        console.log(error('Error - geomBbox() - > ' + e.message))
    }

}

async function pushOSMData(fileNamer, dbClient, ohsomeDataTime) {
    try {
        var dataDb = new DataDb(dbClient); 

        var dwnOSMFiles = fileNamer.dwnFilesList()

        for (let i=0; i<dwnOSMFiles.length; i++) {
            /**
             * Lodash is not being used coz await 
             * can't be used properly here. 
             * Also, not possible for .forEach().
             * Push each file one after another.
             */
            await pushSingleFile(dwnOSMFiles[i], dataDb, ohsomeDataTime)
        }

        var removeDups = dataDb.removeDups()

        return true
        
    } catch (e) {
        // throw new Error(e.message);
        console.log(error('Error - pushOSMData() - > ' + e.message))
        return false
    }
}

function rollbackOSMData(fileNamer) {

    try {

        return new Promise((res, rej) => {
            var dwnOSMFiles = fileNamer.dwnFilesList()
            del(dwnOSMFiles).then((r) => { // Delete list of downloaded Ohsome files
                res()
            }).catch((e) => {
                rej(console.log(error('Error - rollbackOSMData() - > ' + e.message)))
            })
        })
        
    } catch (e) {
        console.log(error('Error - rollbackOSMData() - > ' + e.message))
    }

}

module.exports = {
    newFetchBool,
    getOSMData,
    pushOSMData,
    rollbackOSMData,
    getOhsomeLatestDataTime,
    newTileDownloads,
    tmpMergeTile2RowFile,
    txt2Mongo,
    updateDownloadTiles
}