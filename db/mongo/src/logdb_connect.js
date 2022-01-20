'use strict'

// Load `require` directives - external
const config = require('config'),
    l = require('lodash'),
    mongodb = require('mongodb'),
    fs = require('fs'),
    mongoObjId = require('mongodb').ObjectId,
    clc = require("cli-color"),
    randomString = require("randomstring")
// Load `require` directives - internal
const ReferenceDb = require('../src/referencedb_connect'),
    {getCurrentServerTime} = require('../../../utils/time_keeper'),
    {getOhsomeLatestDataTime} = require('../../../microservices/src/data_fetch/ohsome/_internal')


var error = clc.red.bold,
    warn = clc.yellow,
    notice = clc.blue


class LogDb {
    /**
     * Class to query and update log_db database
     */
    
    constructor(dbClient) {
        this.dbClient = dbClient
    }

    getUniqueOhsomeDataTime() {

        try {
            
        } catch (e) {
            console.log(error('Error - getUniqueOhsomeDataTime() - > ' + e.message))
        }

    }

    putUrlFailed(url, httpStatusCode, httpError, geoDataFetchTime) {

        try {

            var logDb = this.dbClient.db(config.get('mongodb.logDb'))
            var fialedUrlColl = logDb.collection(config.get('mongodb.fialedUrlColl'))
            var query = {
                'url': url,
                'httpStatusCode': httpStatusCode,
                'httpError': httpError,
                'geoDataFetchTime': geoDataFetchTime,
                'apiEdhHitTime': getCurrentServerTime('ISO')
            }
            var result = fialedUrlColl.insertOne(query)
            return result
            
        } catch (e) {
            console.log(error('Error - putUrlFailed() - > ' + e.message))
        }

    }

    logBigFeat(data) {
        try {

            var logDb = this.dbClient.db(config.get('mongodb.logDb'))
            var bigfeatColl = logDb.collection(config.get('mongodb.bigfeatColl'))

            var query = data
            var result = bigfeatColl.insertOne(query)

            return result
            
        } catch (e) {
            console.log(error('Error - logBigFeat() - > ' + e.message))
        }
    }

    dropProcessing2Queued() {
        try {

            var logDb = this.dbClient.db(config.get('mongodb.logDb'))

            logDb.listCollections().toArray( (e, collInfos) => {
                l.map(collInfos, (coll) => {
                    if (coll.name == config.get('mongodb.queryColl')) {

                        var queryColl = logDb.collection(config.get('mongodb.queryColl'))
                        var queryProcessing = {
                            'status': 'processing'
                        }
                        var queryQueued = {
                            'status': 'queued'
                        }
                        var result = queryColl.deleteMany({ $or: [
                            queryProcessing,
                            queryQueued
                        ] })

                        return

                    }
                })
            })

            return
            
        } catch (e) {
            console.log(error('Error - dropProcessing2Queued() - > ' + e.message))
        }
    }

    getQueuedSubmit(limit) {

        try {

            if (limit >= 1) {
                var logDb = this.dbClient.db(config.get('mongodb.logDb'))
                var queryColl = logDb.collection(config.get('mongodb.queryColl'))

                var options = {
                    // If limit is 0, it returns all
                    'limit': limit
                }

                var result = queryColl.find({"status": 'queued'}, options).sort({sortTmp: -1}).toArray()
            } else {
                var result = []
            }

            return result
            
        } catch (e) {
            console.log(error('Error - getQueuedSubmit() - > ' + e.message))
        }

    }

    dropProcessingVectile() {

        try {

            var logDb = this.dbClient.db(config.get('mongodb.logDb'))

            logDb.listCollections().toArray( (e, collInfos) => {
                l.map(collInfos, (coll) => {
                    if (coll.name == config.get('mongodb.vectileColl')) {

                        var vectileColl = logDb.collection(config.get('mongodb.vectileColl'))
                        var query = {
                            'status': 'processing'
                        }
                        var result = vectileColl.deleteMany(query)
                        return

                    }
                })
            })

            return
            
        } catch (e) {
            console.log(error('Error - dropProcessingVectile() - > ' + e.message))
        }

    }

    getSubmittedQuery() {
        try {

            var logDb = this.dbClient.db(config.get('mongodb.logDb'))
            var queryColl = logDb.collection(config.get('mongodb.queryColl'))

            var result = queryColl.find().toArray()

            return result
            
        } catch (e) {
            console.log(error('Error - getSubmittedQuery() - > ' + e.message))
        }
    }

    getPendingQuery() {
        try {

            var logDb = this.dbClient.db(config.get('mongodb.logDb'))
            var queryColl = logDb.collection(config.get('mongodb.queryColl'))

            var query = []

            query.push(
                {
                    'status': 'processing'
                }
            )

            query.push(
                {
                    'status': 'queued'
                }
            )

            var result = queryColl.find({ $or: query}).toArray()

            return result
            
        } catch (e) {
            console.log(error('Error - getPendingQuery() - > ' + e.message))
        }
    }


    getFinishedQuery(urlArguments) {
        try {

            // Get S3 link of finished queries

            var logDb = this.dbClient.db(config.get('mongodb.logDb'))
            var queryColl = logDb.collection(config.get('mongodb.queryColl'))

            var themeNameVersion = urlArguments['themeNameVersion'],    
                bbox = JSON.parse("[" + urlArguments['bbox'] + "]")[0],
                zoom = parseInt(urlArguments['zoom']),
                dataAggregate = JSON.parse("[" + urlArguments['dataAggregate'] + "]")[0],
                dataFormat = JSON.parse("[" + urlArguments['dataFormat'] + "]")[0]

            if (urlArguments['rawData'].toLowerCase() == 'true') {   
                var rawData = true
            } else {
                var rawData = false
            }

            if (urlArguments['rawCentroid'].toLowerCase() == 'true') {
                var rawCentroid = true
            } else {
                var rawCentroid = false
            }

            if (urlArguments['dataQuality'].toLowerCase() == 'true') {
                var dataQuality = true
            } else {
                var dataQuality = false
            }

            if (urlArguments['dataSource'].toLowerCase() == 'true') {
                var dataSource = true
            } else {
                var dataSource = false
            }

            var xMin = bbox[0]
            var yMin = bbox[1]
            var xMax = bbox[2]
            var yMax = bbox[3]
            var query = {$or: [
                {
                    $and: [
                        {"tileGeom.xMin": { $lte: xMin } },
                        {"tileGeom.xMin": { $lte: xMax } },
                        {"tileGeom.yMin": { $gte: yMin } },
                        {"tileGeom.yMin": { $lte: yMax } },
                        {"tileGeom.xMax": { $gte: xMin } },
                        {"tileGeom.xMax": { $lte: xMax } },
                        {"tileGeom.yMax": { $gte: yMin } },
                        {"tileGeom.yMax": { $gte: yMax } },
                        {'themeNameVersion': themeNameVersion},
                        {'tileGeom.zoom': zoom},
                        {'dataAggregate': dataAggregate},
                        {'rawData': rawData},
                        {'rawCentroid': rawCentroid},
                        {'dataQuality': dataQuality},
                        {'dataSource': dataSource},
                        {'dataFormat': dataFormat},
                        {'status': 'success'}
                    ]
                },
                {
                    $and: [
                        {"tileGeom.xMin": { $lte: xMin } },
                        {"tileGeom.xMin": { $lte: xMax } },
                        {"tileGeom.yMin": { $gte: yMin } },
                        {"tileGeom.yMin": { $lte: yMax } },
                        {"tileGeom.xMax": { $gte: xMin } },
                        {"tileGeom.xMax": { $lte: xMax } },
                        {"tileGeom.yMax": { $gte: yMin } },
                        {"tileGeom.yMax": { $lte: yMax } },
                        {'themeNameVersion': themeNameVersion},
                        {'tileGeom.zoom': zoom},
                        {'dataAggregate': dataAggregate},
                        {'rawData': rawData},
                        {'rawCentroid': rawCentroid},
                        {'dataQuality': dataQuality},
                        {'dataSource': dataSource},
                        {'dataFormat': dataFormat},
                        {'status': 'success'}
                    ]
                },
                {
                    $and: [
                        {"tileGeom.xMin": { $lte: xMin } },
                        {"tileGeom.xMin": { $lte: xMax } },
                        {"tileGeom.yMin": { $lte: yMin } },
                        {"tileGeom.yMin": { $lte: yMax } },
                        {"tileGeom.xMax": { $gte: xMin } },
                        {"tileGeom.xMax": { $lte: xMax } },
                        {"tileGeom.yMax": { $gte: yMin } },
                        {"tileGeom.yMax": { $lte: yMax } },
                        {'themeNameVersion': themeNameVersion},
                        {'tileGeom.zoom': zoom},
                        {'dataAggregate': dataAggregate},
                        {'rawData': rawData},
                        {'rawCentroid': rawCentroid},
                        {'dataQuality': dataQuality},
                        {'dataSource': dataSource},
                        {'dataFormat': dataFormat},
                        {'status': 'success'}
                    ]
                },
                {
                    $and: [
                        {"tileGeom.xMin": { $gte: xMin } },
                        {"tileGeom.xMin": { $lte: xMax } },
                        {"tileGeom.yMin": { $gte: yMin } },
                        {"tileGeom.yMin": { $lte: yMax } },
                        {"tileGeom.xMax": { $gte: xMin } },
                        {"tileGeom.xMax": { $lte: xMax } },
                        {"tileGeom.yMax": { $gte: yMin } },
                        {"tileGeom.yMax": { $gte: yMax } },
                        {'themeNameVersion': themeNameVersion},
                        {'tileGeom.zoom': zoom},
                        {'dataAggregate': dataAggregate},
                        {'rawData': rawData},
                        {'rawCentroid': rawCentroid},
                        {'dataQuality': dataQuality},
                        {'dataSource': dataSource},
                        {'dataFormat': dataFormat},
                        {'status': 'success'}
                    ]
                },
                {
                    $and: [
                        {"tileGeom.xMin": { $gte: xMin } },
                        {"tileGeom.xMin": { $lte: xMax } },
                        {"tileGeom.yMin": { $gte: yMin } },
                        {"tileGeom.yMin": { $lte: yMax } },
                        {"tileGeom.xMax": { $gte: xMin } },
                        {"tileGeom.xMax": { $lte: xMax } },
                        {"tileGeom.yMax": { $gte: yMin } },
                        {"tileGeom.yMax": { $lte: yMax } },
                        {'themeNameVersion': themeNameVersion},
                        {'tileGeom.zoom': zoom},
                        {'dataAggregate': dataAggregate},
                        {'rawData': rawData},
                        {'rawCentroid': rawCentroid},
                        {'dataQuality': dataQuality},
                        {'dataSource': dataSource},
                        {'dataFormat': dataFormat},
                        {'status': 'success'}
                    ]
                },
                {
                    $and: [
                        {"tileGeom.xMin": { $lte: xMin } },
                        {"tileGeom.xMin": { $lte: xMax } },
                        {"tileGeom.yMin": { $lte: yMin } },
                        {"tileGeom.yMin": { $lte: yMax } },
                        {"tileGeom.xMax": { $gte: xMin } },
                        {"tileGeom.xMax": { $gte: xMax } },
                        {"tileGeom.yMax": { $gte: yMin } },
                        {"tileGeom.yMax": { $gte: yMax } },
                        {'themeNameVersion': themeNameVersion},
                        {'tileGeom.zoom': zoom},
                        {'dataAggregate': dataAggregate},
                        {'rawData': rawData},
                        {'rawCentroid': rawCentroid},
                        {'dataQuality': dataQuality},
                        {'dataSource': dataSource},
                        {'dataFormat': dataFormat},
                        {'status': 'success'}
                    ]
                },
                {
                    $and: [
                        {"tileGeom.xMin": { $gte: xMin } },
                        {"tileGeom.xMin": { $lte: xMax } },
                        {"tileGeom.yMin": { $lte: yMin } },
                        {"tileGeom.yMin": { $lte: yMax } },
                        {"tileGeom.xMax": { $gte: xMin } },
                        {"tileGeom.xMax": { $lte: xMax } },
                        {"tileGeom.yMax": { $gte: yMin } },
                        {"tileGeom.yMax": { $lte: yMax } },
                        {'themeNameVersion': themeNameVersion},
                        {'tileGeom.zoom': zoom},
                        {'dataAggregate': dataAggregate},
                        {'rawData': rawData},
                        {'rawCentroid': rawCentroid},
                        {'dataQuality': dataQuality},
                        {'dataSource': dataSource},
                        {'dataFormat': dataFormat},
                        {'status': 'success'}
                    ]
                },
                {
                    $and: [
                        {"tileGeom.xMin": { $gte: xMin } },
                        {"tileGeom.xMin": { $lte: xMax } },
                        {"tileGeom.yMin": { $gte: yMin } },
                        {"tileGeom.yMin": { $lte: yMax } },
                        {"tileGeom.xMax": { $gte: xMin } },
                        {"tileGeom.xMax": { $gte: xMax } },
                        {"tileGeom.yMax": { $gte: yMin } },
                        {"tileGeom.yMax": { $gte: yMax } },
                        {'themeNameVersion': themeNameVersion},
                        {'tileGeom.zoom': zoom},
                        {'dataAggregate': dataAggregate},
                        {'rawData': rawData},
                        {'rawCentroid': rawCentroid},
                        {'dataQuality': dataQuality},
                        {'dataSource': dataSource},
                        {'dataFormat': dataFormat},
                        {'status': 'success'}
                    ]
                },
                {
                    $and: [
                        {"tileGeom.xMin": { $gte: xMin } },
                        {"tileGeom.xMin": { $lte: xMax } },
                        {"tileGeom.yMin": { $gte: yMin } },
                        {"tileGeom.yMin": { $lte: yMax } },
                        {"tileGeom.xMax": { $gte: xMin } },
                        {"tileGeom.xMax": { $gte: xMax } },
                        {"tileGeom.yMax": { $gte: yMin } },
                        {"tileGeom.yMax": { $lte: yMax } },
                        {'themeNameVersion': themeNameVersion},
                        {'tileGeom.zoom': zoom},
                        {'dataAggregate': dataAggregate},
                        {'rawData': rawData},
                        {'rawCentroid': rawCentroid},
                        {'dataQuality': dataQuality},
                        {'dataSource': dataSource},
                        {'dataFormat': dataFormat},
                        {'status': 'success'}
                    ]
                },
                {
                    $and: [
                        {"tileGeom.xMin": { $gte: xMin } },
                        {"tileGeom.xMin": { $lte: xMax } },
                        {"tileGeom.yMin": { $lte: yMin } },
                        {"tileGeom.yMin": { $lte: yMax } },
                        {"tileGeom.xMax": { $gte: xMin } },
                        {"tileGeom.xMax": { $gte: xMax } },
                        {"tileGeom.yMax": { $gte: yMin } },
                        {"tileGeom.yMax": { $lte: yMax } },
                        {'themeNameVersion': themeNameVersion},
                        {'tileGeom.zoom': zoom},
                        {'dataAggregate': dataAggregate},
                        {'rawData': rawData},
                        {'rawCentroid': rawCentroid},
                        {'dataQuality': dataQuality},
                        {'dataSource': dataSource},
                        {'dataFormat': dataFormat},
                        {'status': 'success'}
                    ]
                }
            ]}

            var result = queryColl.find(query).toArray()

            return result
            
        } catch (e) {
            console.log(error('Error - getFinishedQuery() - > ' + e.message))
        }
    }

    logDownloadedTile(item) {
        try {

            if (item.length > 0) {
                var logDb = this.dbClient.db(config.get('mongodb.logDb'))
                var fetchColl = logDb.collection(config.get('mongodb.fetchColl'))
                var result = fetchColl.insertMany(item, 
                                { checkKeys: false }) // checkKeys: false ensures that key could also contain '.' or '$'
                return result
            } else {
                return new Promise((res, rej) => {res()})
            }
            
        } catch (e) {
            console.log(error('Error - logDownloadedTile() - > ' + e.message))
        }
    }

    checkTileFetch(tile, keyval) {
        /**
         * Check which tiles have already been downloaded
         * and which needs to be fetched from Ohsome
         */

        try {

            var logDb = this.dbClient.db(config.get('mongodb.logDb'))
            var fetchColl = logDb.collection(config.get('mongodb.fetchColl'))

            var query = []
            /**
             * Following two conditions are needed for scenario
             * like healthcare = doctor or healthcare = *
             */
            query.push(
                {'zoom': tile.zoom, 'tileGeom': tile.tileGeom, 'key': keyval.key, 'value': '*', 'status': 'success'}
            )
            query.push(
                {'zoom': tile.zoom, 'tileGeom': tile.tileGeom, 'key': keyval.key, 'value': keyval.value, 'status': 'success'}
            )

            var result = fetchColl.find({$or: query}).sort({'ohsomeDataTime': 1}).toArray()

            return result
            
        } catch (e) {
            console.log(error('Error - checkTileFetch() - > ' + e.message))
        }
    }

    getQueuedSubmit2bProcessed4Cron(numQueued2bProcessed, version) {
        try {

            if (numQueued2bProcessed >= 1) {
                var logDb = this.dbClient.db(config.get('mongodb.logDb'))
                var queryColl = logDb.collection(config.get('mongodb.queryColl'))

                var options = {
                    'limit': numQueued2bProcessed
                }

                var result = queryColl.find({"status": 'queued', "version": version}, options).sort({privilegeLevel: -1}).sort({apiEdhHitTime: -1}).toArray()
            } else {
                var result = []
            }

            return result
            
        } catch (e) {
            console.log(error('Error - getQueuedSubmit2bProcessed4Cron() - > ' + e.message))
        }
    }

    getQueuedSubmit2bProcessed(numQueued2bProcessed) {
        try {

            if (numQueued2bProcessed >= 1) {
                var logDb = this.dbClient.db(config.get('mongodb.logDb'))
                var queryColl = logDb.collection(config.get('mongodb.queryColl'))

                var options = {
                    'limit': numQueued2bProcessed
                }

                var result = queryColl.find({"status": 'queued'}, options).sort({privilegeLevel: -1}).sort({apiEdhHitTime: -1}).toArray()
            } else {
                var result = []
            }

            return result
            
        } catch (e) {
            console.log(error('Error - getQueuedSubmit2bProcessed() - > ' + e.message))
        }
    }

    putNewSubmit(urlArguments, latestOhsomeDataTime, apiEdhHitTime) {

        try {

            var logDb = this.dbClient.db(config.get('mongodb.logDb'))
            var queryColl = logDb.collection(config.get('mongodb.queryColl'))
            var sortTmp = Date.now()
            var query = {
                "ohsomeDataTime": latestOhsomeDataTime,
                "status": 'queued',
                "themeNameVersion": urlArguments.themeNameVersion,
                "aoi": urlArguments.aoi,
                "dataAggregate": urlArguments.dataAggregate,
                "rawData": urlArguments.rawData,
                "dataSource": urlArguments.dataSource,
                "dataFormat": urlArguments.dataFormat,
                'apiEdhHitTime': apiEdhHitTime,
                'sortTmp': sortTmp,
                'urlArguments': urlArguments
            }
            var result = queryColl.insertOne(query).then((r) => {
                return {
                    _id: r.ops[0]['_id'], // This is how we grad unique object id of a newly inserted document
                    status: r.ops[0]['status']
                }
            }).catch((e) => {
                console.log(error('Error - putNewSubmit() - > ' + e.message))
            })

            return result
            
        } catch (e) {
            console.log(error('Error - putNewSubmit() - > ' + e.message))
        }

    }

    pushZipAndUpdate(submitId, key, value, exportFileName, exportFileNamePath) {

        try {

            return new Promise((res, rej) => {
                var update = []
    
                update.push(this.pushExportResult(exportFileName, exportFileNamePath))
                update.push(this.updateQuery(submitId, key, value, exportFileName))
    
                Promise.all(update).then((r) => {
                    res()
                }).catch((e) => {
                    rej(console.log(error('Error - pushZipAndUpdate() - > ' + e.message)))
                })
            })
            
        } catch (e) {
            console.log(error('Error - pushZipAndUpdate() - > ' + e.message))
        }

    }

    pushExportResult(exportFileName, exportFileNamePath) {

        try {

            return new Promise((res, rej) => {
                var logDb = this.dbClient.db(config.get('mongodb.logDb'))
                var bucket = new mongodb.GridFSBucket(logDb, {
                    /**
                     * Read more - https://mongodb.github.io/node-mongodb-native/3.1/tutorials/gridfs/streaming/
                     * https://stackoverflow.com/questions/14017826/storing-a-file-in-mongodb-using-node-js
                     * https://medium.com/@dineshuthakota/how-to-save-file-in-mongodb-using-node-js-1a9d09b019c1
                     */
                    chunkSizeBytes: 255000, // = Default value. Divides a zip file into chuncks
                    bucketName: config.get('mongodb.exportCacheGridFS')
                })
                fs.createReadStream(exportFileNamePath)
                    .pipe(
                        bucket.openUploadStream(exportFileName)
                    )
                    .on('error', (e) => {
                        rej(console.log(error('Error - pushExportResult() - > ' + e.message)))
                    })
                    .on('finish', () => {
                        res() 
                    })
            })
            
        } catch (e) {
            console.log(error('Error - pushExportResult() - > ' + e.message))
        }

    }

    updateVersion(version) {
        try {

            var logDb = this.dbClient.db(config.get('mongodb.logDb'))
            var queryColl = logDb.collection(config.get('mongodb.queryColl'))
            var query = {
                'status': 'queued'
            }

            var set = {}
            set['version'] = version

            var update = {
                '$set' : set
            }
            var result = queryColl.updateMany(query, update, {
                'upsert': false
            })
            return result
            
        } catch (e) {
            console.log(error('Error - updateVersion() - > ' + e.message))
        }
    }

    updateQuery(submitId, mode, exportFileNameSize, timeTaken, percentDone, remainingTimeApproxInMin, numFeatProcessed) {

        try {

            var logDb = this.dbClient.db(config.get('mongodb.logDb'))
            var queryColl = logDb.collection(config.get('mongodb.queryColl'))
            var query = {
                '_id': submitId
            }

            var set = {}
            if (mode == 'processing') {
                set['percentDone'] = percentDone
                set['remainingTimeApproxInMin'] = remainingTimeApproxInMin
                set['serverProcessingTimeEstimatedInMin'] = timeTaken
            } else if (mode == 'success') {
                set['status'] = 'success'
                set['percentDone'] = percentDone
                set['remainingTimeApproxInMin'] = remainingTimeApproxInMin
                set['fileName'] = exportFileNameSize.fileName
                set['fileSizeInMb'] = exportFileNameSize.fileSizeMb
                set['serverProcessingTimeInMin'] = timeTaken
                set['numOfFeaturesProcessed'] = numFeatProcessed

            } else if (mode == 'queued') {
                set['status'] = 'processing'
            }

            var update = {
                '$set' : set
            }
            var result = queryColl.updateOne(query, update, {
                'upsert': false
            })
            return result
            
        } catch (e) {
            console.log(error('Error - updateQuery() - > ' + e.message))
        }

    }

    updateVectileQuery(themeName, mode, apiEdhHitTime, msg) {
        try {

            var logDb = this.dbClient.db(config.get('mongodb.logDb'))
            var vectileColl = logDb.collection(config.get('mongodb.vectileColl'))
            var query = {
                'themeName': themeName,
                'apiEdhHitTime': apiEdhHitTime
            }

            var set = {}
            set['status'] = mode
            set['message'] = msg

            var update = {
                '$set' : set
            }
            var result = vectileColl.updateOne(query, update, {
                'upsert': false
            })

            return result
            
        } catch (e) {
            console.log(error('Error - updateVectileQuery() - > ' + e.message))
        }
    }

    fetchZip(exportFileName, exportFileNamePath) {

        try {

            var logDb = this.dbClient.db(config.get('mongodb.logDb'))
            var bucket = new mongodb.GridFSBucket(logDb, {
                /**
                 * Read more - https://mongodb.github.io/node-mongodb-native/3.1/tutorials/gridfs/streaming/
                 * https://stackoverflow.com/questions/14017826/storing-a-file-in-mongodb-using-node-js
                 * https://medium.com/@dineshuthakota/how-to-save-file-in-mongodb-using-node-js-1a9d09b019c1
                 */
                chunkSizeBytes: 255000, // = Default value. Divides a zip file into chuncks
                bucketName: config.get('mongodb.exportCacheGridFS')
            })

            return new Promise((res, rej) => {
                bucket.openDownloadStreamByName(exportFileName)
                .pipe(
                    fs.createWriteStream(exportFileNamePath)
                    .on('finish', () => {
                        res()
                    })
                )
                .on('error', (e) => {
                    rej(console.log(error('Error - fetchZip() - > ' + e.message)))
                })
                .on('end', () => {   
                    process.exit(0)   
                })
            })  
            
        } catch (e) {
            console.log(error('Error - fetchZip() - > ' + e.message))
        }
 
    }

    putError(errorMessage, errorDetail, errorSeverity) {

        try {

            var logDb = this.dbClient.db(config.get('mongodb.logDb'))
            var errorColl = logDb.collection(config.get('mongodb.errorColl'))
            var query = {
                'errorSeverity': errorSeverity,
                'errorMessage': errorMessage,
                'errorDetail': errorDetail,
                'apiEdhHitTime': getCurrentServerTime('ISO')
            }
            var result = errorColl.insertOne(query)
            return result
            
        } catch (e) {
            console.log(error('Error - putError() - > ' + e.message))
        }

    }

    putDownloadedTiles(itemArray) {
        try {
            var logDb = this.dbClient.db(config.get('mongodb.logDb'))
            var fetchColl = logDb.collection(config.get('mongodb.fetchColl'))
            var result = fetchColl.insertMany(itemArray, 
                            { checkKeys: false }) // checkKeys: false ensures that key could also contain '.' or '$'
            return result
        } catch (e) {
            console.log(error('Error - putDownloadedTiles() - > ' + e.message))
        }
    }

    putFetchAttempt(geoDataFetchTime, status, ohsomeLatestDataTime, message) {

        try {

            var logDb = this.dbClient.db(config.get('mongodb.logDb'))
            var fetchColl = logDb.collection(config.get('mongodb.fetchColl'))
            var query = {
                'geoDataFetchTime': geoDataFetchTime,
                'status': status,
                'ohsomeDataTime': ohsomeLatestDataTime,
                'message': message
            }
            var result = fetchColl.insertOne(query)
            return result
            
        } catch (e) {
            console.log(error('Error - putFetchAttempt() - > ' + e.message))
        }

    }

    checkStatus(submitId) {
        /**
         * Check for submitted ids status
         */

        try {

            var logDb = this.dbClient.db(config.get('mongodb.logDb'))
            var queryColl = logDb.collection(config.get('mongodb.queryColl'))
            var query = {}
            query['_id'] = new mongoObjId(submitId) // Need mongo object. Can't pass submitId string as it is
            var result = queryColl.find(query).toArray()
            return result
            
        } catch (e) {
            console.log(error('Error - checkStatus() - > ' + e.message))
        }

    }

    checkNewFetch(ohsomeLatestDataTime) {

        /**
         * Check if latest data from ohsome has already 
         * been fetched by us. Find if query is empty
         * or not.
         */

        try {

            var logDb = this.dbClient.db(config.get('mongodb.logDb'))
            var fetchColl = logDb.collection(config.get('mongodb.fetchColl'))
            var query = []
            query.push({"ohsomeDataTime": ohsomeLatestDataTime})
            query.push({"status": 'success'})
            var result = fetchColl.find({$and: query}).toArray()
            return result
            
        } catch (e) {
            console.log(error('Error - checkNewFetch() - > ' + e.message))
        }

    }

    getOhsomeDataTimeAllSuccess() {

        try {

            var logDb = this.dbClient.db(config.get('mongodb.logDb'))
            var fetchColl = logDb.collection(config.get('mongodb.fetchColl'))
            var query = []
            query.push({"status": 'success'})
            var result = fetchColl.find({$and: query}).toArray()
            return result
            
        } catch (e) {
            console.log(error('Error - getOhsomeDataTimeAllSuccess() - > ' + e.message))
        }

    }
    
    getPendingOrSuccessQueryId(urlArguments, latestOhsomeDataTime) {

        try {

            var logDb = this.dbClient.db(config.get('mongodb.logDb'))
            var queryColl = logDb.collection(config.get('mongodb.queryColl'))
            var query = []
            query.push(
                {
                    "ohsomeDataTime": latestOhsomeDataTime,
                    "status": 'success',
                    "themeNameVersion": urlArguments.themeNameVersion,
                    "aoi": urlArguments.aoi,
                    "dataAggregate": urlArguments.dataAggregate,
                    "rawData": urlArguments.rawData,
                    "dataSource": urlArguments.dataSource,
                    "dataFormat": urlArguments.dataFormat
                }
            )
            query.push(
                {
                    "ohsomeDataTime": latestOhsomeDataTime,
                    "status": 'pending',
                    "themeNameVersion": urlArguments.themeNameVersion,
                    "aoi": urlArguments.aoi,
                    "dataAggregate": urlArguments.dataAggregate,
                    "rawData": urlArguments.rawData,
                    "dataSource": urlArguments.dataSource,
                    "dataFormat": urlArguments.dataFormat
                }
            )
            var result = queryColl.find({$or: query}).toArray()
            return result
            
        } catch (e) {
            console.log(error('Error - getPendingOrSuccessQueryId() - > ' + e.message))
        }

    }

    async getLatestFetchedOhsomeDataTime() {
        try {
            var ohsomeDataTimeArray = await this.getOhsomeDataTimeAllSuccess()

            if (ohsomeDataTimeArray.length == 0) {
                return false
            }

            var timeArrayUnix = l.map(ohsomeDataTimeArray, (e) => {
                return new Date(e.ohsomeDataTime).getTime() // Convert time array from string to unix
            })
            var ohsomeDataTimeStr = l.sortBy(timeArrayUnix).reverse()[0]
            ohsomeDataTimeStr = new Date(ohsomeDataTimeStr).toISOString().split('.')[0]+"Z" // Remove micro seconds from seconds
            // ohsomeDataTimeStr = new Date(ohsomeDataTimeStr).toISOString()

            return ohsomeDataTimeStr

        } catch (e) { 
            console.log(error('Error - getLatestFetchedOhsomeDataTime() - > ' + e.message))
        }
    }

    async getNewOrExistRequest(urlArguments, apiEdhHitTime) {
        
        /**
         * If database is not ready and first
         * fetch is being generated 
         * - return empty documentId, status and NA flag
         * 
         * If database is ready and no
         * pending or success query similar
         * to the submitted query is there
         * inside query_coll, submit one
         * - return new documentId, status and flag
         * eg. 5dd3ad4c80a3602f72213884
         * 
         * If database is ready and there
         * is one pending or success query
         * of similar fashion to the submitted
         * query 
         * - return documentId, status and flag
         * eg. 5dd3ad4c80a3602f72213884
         * 
         * Note that flag is needed to know 
         * if query has already been submitted
         * by someone or not. Status would be 
         * pending for new as well as some of the
         * old queries
         */

        try {

            var latestOhsomeDataTime = await this.getLatestFetchedOhsomeDataTime()

            if (latestOhsomeDataTime == false) { 
                return {
                    _id: '',
                    status: '',
                    flag: 'NA'
                }
            } 

            var queryId = await this.getPendingOrSuccessQueryId(urlArguments, latestOhsomeDataTime)

            if (queryId.length == 1) {
                return {
                    _id: queryId[0]._id,
                    status: queryId[0].status,
                    flag: 'old'
                }
            } else {
                var newQueryId = await this.putNewSubmit(urlArguments, latestOhsomeDataTime, apiEdhHitTime)
                return {
                    _id: newQueryId._id,
                    status: newQueryId.status,
                    flag: 'new'
                }
            }
            
        } catch (e) {
            console.log(error('Error - getNewOrExistRequest() - > ' + e.message))
        }
    }

    getPendingOrSuccessQueryStatus(urlArguments, tileGeom, ohsomeDataTime) {

        try {

            var logDb = this.dbClient.db(config.get('mongodb.logDb'))
            var queryColl = logDb.collection(config.get('mongodb.queryColl'))
            var query = []
            query.push(
                {
                    "themeNameVersion": urlArguments.themeNameVersion,
                    "tileGeom": tileGeom,
                    "dataAggregate": urlArguments.dataAggregate,
                    "rawData": urlArguments.rawData,
                    "rawCentroid": urlArguments.rawCentroid,
                    "dataQuality": urlArguments.dataQuality,
                    "dataSource": urlArguments.dataSource,
                    "dataFormat": urlArguments.dataFormat,
                    "ohsomeDataTime": ohsomeDataTime
                }
            )
            var result = queryColl.find({$or: query}).toArray()
            return result
            
        } catch (e) {
            console.log(error('Error - getPendingOrSuccessQueryId() - > ' + e.message))
        }

    }

    getPendingVectileQuery(urlArgumentsTheme, mode) {
        try {

            var logDb = this.dbClient.db(config.get('mongodb.logDb'))
            var vectileColl = logDb.collection(config.get('mongodb.vectileColl'))
            var query = []
            query.push(
                {
                    "themeName": urlArgumentsTheme.themeName,
                    'status': mode
                }
            )
            var result = vectileColl.find({$or: query}).toArray()

            return result
            
        } catch (e) {
            console.log(error('Error - getPendingVectileQuery() - > ' + e.message))
        }
    }    

    newQuery(urlArguments, tileGeom, ohsomeDataTime, privilege, apiEdhHitTime) {

        try {

            if (privilege == 'superman') {
                var privilegeLevel = 0
            } else if (privilege == 'guest') {
                var privilegeLevel = 5
            }

            let randInt = randomString.generate({
                length: 10, // Assures almost constant file length
                charset: 'numeric'
            })

            var logDb = this.dbClient.db(config.get('mongodb.logDb'))
            var queryColl = logDb.collection(config.get('mongodb.queryColl'))
            var query = {
                "status": 'queued',
                "version": randInt,
                "privilege": privilege,
                "privilegeLevel": privilegeLevel,
                "apiEdhHitTime": apiEdhHitTime,
                "themeNameVersion": urlArguments.themeNameVersion,
                "tileGeom": tileGeom,
                "dataAggregate": urlArguments.dataAggregate,
                "rawData": urlArguments.rawData,
                "rawCentroid": urlArguments.rawCentroid,
                "dataQuality": urlArguments.dataQuality,
                "dataSource": urlArguments.dataSource,
                "dataFormat": urlArguments.dataFormat,
                "ohsomeDataTime": ohsomeDataTime,
                "percentDone": 0,
                "remainingTimeApproxInMin": "unknown"
            }
            var result = queryColl.insertOne(query).then((r) => {
                return {
                    status: r.ops[0]['status'],
                    percentDone: r.ops[0]['percentDone']
                }
            }).catch((e) => {
                console.log(error('Error - newQuery() - > ' + e.message))
            })

            return result
            
        } catch (e) {
            console.log(error('Error - newQuery() - > ' + e.message))
        }

    }

    newVectileQuery(urlArgumentsTheme, apiEdhHitTime) {
        try {

            var logDb = this.dbClient.db(config.get('mongodb.logDb'))
            var vectileColl = logDb.collection(config.get('mongodb.vectileColl'))
            var query = {
                "status": 'processing',
                "themeName": urlArgumentsTheme.themeName,
                "apiEdhHitTime": apiEdhHitTime
            }
            var result = vectileColl.insertOne(query).then((r) => {
                return {
                    status: r.ops[0]['status']
                }
            }).catch((e) => {
                console.log(error('Error - newVectileQuery() - > ' + e.message))
            })

            return result
            
        } catch (e) {
            console.log(error('Error - newVectileQuery() - > ' + e.message))
        }
    }

    async submitQuery(urlArguments, privilege, apiEdhHitTime) {
        try {

            /**
             * Get tile geom for given long, lat, and zoom
             */
            var referenceDb = new ReferenceDb(this.dbClient)
            var tileGeom = await referenceDb.getTileGeom(urlArguments.long, urlArguments.lat, urlArguments.zoom)
            // tileGeom = l.find(tileGeom, ['zoom', urlArguments.zoom])
            tileGeom = tileGeom[0]

            /**
             * Get Ohsome and other sources available dataset timestamp
             */
            var ohsomeDataTime = await getOhsomeLatestDataTime() // Get latest available dataset in Ohsome
            // ---- Other data sources available timestamp goes here ----
            
            /**
             * Get already pending or completed query status
             */
            var queryStatus = await this.getPendingOrSuccessQueryStatus(urlArguments, tileGeom, ohsomeDataTime)
            if (queryStatus.length > 0) {
                if (queryStatus[0].status == 'success') {
                    return {
                        'status': queryStatus[0].status,
                        'fileSizeInMb': queryStatus[0].fileSizeInMb,
                        'downloadLink': 'https://' + config.get('aws.s3Bucket') + config.get('aws.bucketOtherUrl') + '/' + config.get('aws.dataExportFolder') + '/' + queryStatus[0].fileName
                    }
                } else if (queryStatus[0].status == 'queued' || 
                            queryStatus[0].status == 'processing') {
                    return {
                        'status': queryStatus[0].status,
                        'percentDone': queryStatus[0].percentDone,
                        'remainingTimeApproxInMin': queryStatus[0].remainingTimeApproxInMin,
                    }
                } 
            }

            /**
             * Queue new query
             */
            var newQuery = await this.newQuery(urlArguments, tileGeom, ohsomeDataTime, privilege, apiEdhHitTime)
            
            return newQuery

        } catch (e) {
            console.log(error('Error - submitQuery() - > ' + e.message))
        }
    }

    async vectileQuery(urlArgumentsTheme, apiEdhHitTime) {
        try {

            /**
             * Get already processing vectile query
             */
            var queryStatus = await this.getPendingVectileQuery(urlArgumentsTheme, 'processing')

            if (queryStatus.length > 0) {
                return false
            } else {
                await this.newVectileQuery(urlArgumentsTheme, apiEdhHitTime)
                return true
            }
            
        } catch (e) {
            console.log(error('Error - vectileQuery() - > ' + e.message))
        }
    }

}

module.exports = LogDb