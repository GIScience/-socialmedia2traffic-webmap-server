'use strict'

// Load `require` directives - external
const fs = require('fs'),
    del = require('del'),
    clc = require("cli-color"),
    os = require('os'),
    l = require('lodash'),
    shell = require('shelljs'),
    randomstring = require("randomstring"),
    config = require('config'),
    appRoot = require('app-root-path'),
    path = require('path'),
    si = require('systeminformation')
// Load `require` directives - internal 
const FrameworkHarmoniser = require('../../../utils/framework_harmoniser'),
    UrlParser = require('../../../utils/url_parser'),
    DownloadGeoData = require('./_dwn_geodata'),
    StreamGeoData = require('./_stream_geodata'),
    StreamPixelId = require('./_stream_pixelid'),
    DataQuality = require('./_data_quality'),
    {exportResult} = require('./_export_result'),
    FileNamer = require('../../../utils/file_namer'),
    LogDb = require('../../../db/mongo/src/logdb_connect'),
    ReferenceDb = require('../../../db/mongo/src/referencedb_connect'),
    DataDb = require('../../../db/mongo/src/datadb_connect'),
    {changeCRS,
        reprojectCRS,
        pixelAllList,
        unionDataDump,
        changeDataFormat,
        dwnGeoJSONFromS3,
        tippecanoeTileGen,
        pushTippecanoeTile2S3,
        mergeSortedPixelIdFiles,
        pushTippecanoeTile2LocalDir} = require('./_internal_geodata'),
    {dataFetchTiles} = require('../../../microservices/src/data_fetch/index'),
    {systemInfo} = require('../../../utils/system_info')

var error = clc.red.bold,
    warn = clc.yellow,
    notice = clc.blue

class ExecuteQuery {
    /**
     * Class to Execute Submit Query to pipeline
     */

    constructor(dbClient) {
        this.dbClient = dbClient
    }

    async submitQuery() {
        try {

            /**
             * New possible processes based
             * on available memory
             */
            var data = await si.mem()
            var freeMemInGb = data.free / 1000000000
            var numProcessPossibleRAMWise = Math.floor( (freeMemInGb - config.get('server.memory.freeMinMemoryLoadLimit4NewProcessInGb')) / config.get('server.memory.allowedMemoryLoadPerProcessInGb') )

            /**
             * Number of queries under process
             * possibleConn is half of connectionPool
             * coz each process is taking mongodb
             * connection twice during process
             */
            var fileNamer = new FileNamer()
            var possibleConn = (config.get('mongodb.connectionPool') / 2) - 2
            var numQueriesUnderProcess = fileNamer.processFilesList()
            var numQueriesAllowedMore = possibleConn - numQueriesUnderProcess.length

            if (true) {

                /**
                 * Change queued submit to processing
                 */
                var nextNumQueries = Math.min(numProcessPossibleRAMWise, numQueriesAllowedMore)
                var logDb = new LogDb(this.dbClient) // Update pending query
                // var processSubmit = await logDb.getQueuedSubmit2bProcessed(nextNumQueries) // UNCOMMENT IT
                var processSubmit = await logDb.getQueuedSubmit2bProcessed(1)

                for (let i=0; i<processSubmit.length; i++) {

                    // Update queued to processing
                    var singleSubmit = processSubmit[i]['_id']
                    await logDb.updateQuery(singleSubmit, 'queued', null, null, null, null, null)

                    // Running process
                    this.processSubmit(processSubmit[i])
                }

            } 

            return
            
        } catch (e) {
            console.log(error('Error - submitQuery() - > ' + e.message))
        }
    }

    async processSubmit(singleSubmitParams) {
        try {

            var dataDb = new DataDb(this.dbClient)
            var logDb = new LogDb(this.dbClient)
            var referenceDb = new ReferenceDb(this.dbClient)
            var urlParser = new UrlParser() 
            var fileNamer = new FileNamer()
            var submitId = singleSubmitParams['_id']
            var urlArguments = singleSubmitParams
            var before = Date.now()

            /**
             * Create tmp dir.
             * Following if else is to handle
             * different pm2 instances trying
             * to run same query
             */
            var processDir = fileNamer.processFileOrDirPath(submitId, 'exportdir', null, null) // Generate process file with path
            if (fs.existsSync(processDir)) {
                return
            } else {
                fs.mkdirSync(processDir) // Generate output dir path
            }

            /**
             * Get all datasources along with
             * key-value, whereever needed, 
             * based on themeNameVersion. 
             * FrameworkHarmoniser class is being used
             */
            var frameworkHarmoniser = new FrameworkHarmoniser()
            var fwDataSource = await frameworkHarmoniser.fwDataSource(referenceDb, urlParser.getValueOfKey(urlArguments, 'themeNameVersion'))
            var fwDefinition = await frameworkHarmoniser.fwDefinition(referenceDb, urlParser.getValueOfKey(urlArguments, 'themeNameVersion'))
            var fwExposure = await frameworkHarmoniser.fwExposure(referenceDb, urlParser.getValueOfKey(urlArguments, 'themeNameVersion'))
            var fwUniqueSourceIdentifier = await frameworkHarmoniser.fwUniqueSourceIdentifier(referenceDb, urlParser.getValueOfKey(urlArguments, 'themeNameVersion'))

            /**
             * Get all tiles for downloadTileZoomLevel
             * to check if the data has already been downloaded
             * or not. Otherwise download it from Ohsome
             */
            var tiles2bDownloaded = await referenceDb.tilesCoveredByTileGeom(urlArguments.tileGeom.tileGeom)

            /**
             * Download data from 3rd party source,
             * if not already downloaded
             */
            await dataFetchTiles(this.dbClient, submitId, dataDb, logDb, fileNamer, tiles2bDownloaded, fwDataSource, urlArguments.ohsomeDataTime)

            /**
             * START PROCESSING DATASET
             */

            /**
             * Download locally needed geodata, 
             * cached in mongo based on 
             * requested themeNameVersion.
             * DownloadGeoData class is being used.
             * This will export one single file
             */
            var downloadGeoData = new DownloadGeoData(this.dbClient, fwDataSource, submitId, urlArguments)
            await downloadGeoData.download()

            /**
             * Join all Geodata downloads to
             * start aggregation and all.
             * eg. OSM, GHSL etc
             * This will export one single file.
             * File name would be 5e29ab1870f429c513a9ee9a-union.geojson
             */
            var numFeatProcessed = await unionDataDump(fwDataSource, submitId, urlArguments)

            /**
             * Logging Status 01
             */
            var unionFileNamePath = fileNamer.processFileOrDirPath(submitId, 'file', 'union', 'geojson') // Generate process file with path
            var stats = fs.statSync(unionFileNamePath)
            var fileSizeInBytes = stats["size"]
            var fileSizeInMb = Math.round(fileSizeInBytes/1000000)
            var remainingTime = fileSizeInMb * config.get('server.approxProcessingTimeMinPerMbUnionFilesize')
            var processingDoneFactor = 0.0
            var remainingTimeFactor = 1.0
            await logDb.updateQuery(submitId, 'processing', null, remainingTime * 1.0, 100 * processingDoneFactor, remainingTime * remainingTimeFactor, numFeatProcessed)

            /**
             * Remove any possible duplicate feature
             * in exported GeoJSONs.
             */

            /**
             * Change projection of all downloaded Geodata 
             * files based on dataAggregate param.
             * File naming is 5e2729af7d6f00983fd2c84e-openstreetmap-crs.geojson
             */
            await changeCRS(fwDataSource, submitId, urlArguments)

            /**
             * Logging Status 02
             */
            processingDoneFactor = 0.1
            remainingTimeFactor = 0.9
            await logDb.updateQuery(submitId, 'processing', null, remainingTime * 1.0, 100 * processingDoneFactor, remainingTime * remainingTimeFactor, numFeatProcessed)

            /**
             * Aggregation and other steps will go here.
             * This will export one single file
             * of all pixelIds.
             */
            var streamGeoData = new StreamGeoData()
            await streamGeoData.dataHarmoniser(this.dbClient, submitId, urlArguments, fwDefinition)
            await mergeSortedPixelIdFiles(this.dbClient, urlArguments, submitId)

            /**
             * Logging Status 03
             */
            processingDoneFactor = 0.4
            remainingTimeFactor = 0.6
            await logDb.updateQuery(submitId, 'processing', null, remainingTime * 1.0, 100 * processingDoneFactor, remainingTime * remainingTimeFactor, numFeatProcessed)

            /**
             * Calculate exposure value
             * out of aggregated attributes
             * already calculated. If no
             * exposure equation has 
             * been provided, simply convert 
             * pixelId to real pixels with 
             * coordinates and attributes.
             */
            var streamPixelId = new StreamPixelId()
            await streamPixelId.riskMapper(submitId, urlArguments, fwDefinition, fwExposure)
            
            /**
             * Add OSM level of completeness from Cristiano
             * as one additional band here.
             * It is just a temporary fix and that's why the code is dumped 
             * here like this. Better solution is to have it as an 
             * additional data source like GHSL
             */
            var dataQuality = new DataQuality()
            await dataQuality.burnOSMQualityBand(submitId, urlArguments)

            /**
             * Logging Status 04
             */
            processingDoneFactor = 0.7
            remainingTimeFactor = 0.3
            await logDb.updateQuery(submitId, 'processing', null, remainingTime * 1.0, 100 * processingDoneFactor, remainingTime * remainingTimeFactor, numFeatProcessed)

            /**
             * Generate other output data
             * formats based on "dataFormat"
             * param
             */
            await changeDataFormat(submitId, urlArguments, fwDefinition, fwExposure, fwDataSource, fwUniqueSourceIdentifier)

            /**
             * Logging Status 05
             */
            processingDoneFactor = 0.9
            remainingTimeFactor = 0.1
            await logDb.updateQuery(submitId, 'processing', null, remainingTime * 1.0, 100 * processingDoneFactor, remainingTime * remainingTimeFactor, numFeatProcessed)

            /**
             * Prepare export and zip
             * based on rawData True/False,
             * aggregation,
             * and dataFormat types.
             * Export multiple files.
             * Push it to S3 eventually.
             */  
            var exportFileNameSize = await exportResult(submitId, urlArguments, urlParser, fwExposure)

            /**
             * Time taken to process data
             */
            var after = Date.now()
            var timeTaken = (after - before)/(1000*60)
            timeTaken = Math.round(timeTaken)

            /**
             * Update query_coll to change
             * from pending to success.
             */
            processingDoneFactor = 1.0
            remainingTimeFactor = 0.0
            await logDb.updateQuery(submitId, 'success', exportFileNameSize, timeTaken, 100 * processingDoneFactor, remainingTime * remainingTimeFactor, numFeatProcessed)

            /**
             * Rollback Process files and dirs.
             */
            var processTrash = fileNamer.processRollbackFilesAndDirs(submitId, urlArguments)
            del.sync(processTrash, {force: true})

            /**
             * Execute next pending
             */
            this.submitQuery()

            return
            
        } catch (e) {
            console.log(error('Error - processSubmit() - > ' + e.message))
        }
    }

    async rawPixelGeom(urlArguments) {
        try {

            var dataDb = new DataDb(this.dbClient)
            var logDb = new LogDb(this.dbClient)
            var referenceDb = new ReferenceDb(this.dbClient)

            /**
             * Get all datasources 
             * based on themeNameVersion. 
             * FrameworkHarmoniser class is being used
             */
            var frameworkHarmoniser = new FrameworkHarmoniser()
            var fwDataSource = await frameworkHarmoniser.fwDataSource(referenceDb, urlArguments.themeNameVersion)

            /**
             * Get CRS Extent
             */
            var streamGeoData = new StreamGeoData()
            var crsExtent = await streamGeoData.crsExtentCal(urlArguments)

            /**
             * Generate Point geometry from given lat, long
             * using given dataAggregate with x and y width
             * along with EPSG projection
             */
            var pointGeom = {
                'type': 'Feature',
                'geometry': {
                    'type': 'Point',
                    'coordinates': [
                        urlArguments.long,
                        urlArguments.lat
                    ]
                }
            }
            var pointNewCrs = reprojectCRS([pointGeom], 'EPSG:4326', 'EPSG:'+urlArguments.dataAggregate[2])  
            var item = {
                'data': pointNewCrs.features[0]
            }

            /**
             * Convert pixel to Bbox
             */
            var aggreClassifier = { method: 'intersect' }
            var dataAggregate = urlArguments.dataAggregate
            var pixel2Bbox = await pixelAllList(this.dbClient, item, dataAggregate, aggreClassifier, crsExtent)

            /**
             * Convert pixel back to EPSG:4326
             */
            var newPointCoord = pixel2Bbox[0].coordinates
            var pointGeomAgain = {
                'type': 'Feature',
                'geometry': {
                    'type': 'Polygon',
                    'coordinates': [
                        [
                            [newPointCoord[0], newPointCoord[1]],
                            [newPointCoord[2], newPointCoord[1]],
                            [newPointCoord[2], newPointCoord[3]],
                            [newPointCoord[0], newPointCoord[3]],
                            [newPointCoord[0], newPointCoord[1]]
                        ]
                    ]
                }
            }
            var pointOldCrs = reprojectCRS([pointGeomAgain], 'EPSG:'+urlArguments.dataAggregate[2], 'EPSG:4326')

            /**
             * Update urlArguments
             */
            urlArguments['tileGeom'] = {
                'tileGeom': pointOldCrs.features[0].geometry
            }

            var downloadGeoData = new DownloadGeoData(this.dbClient, fwDataSource, 'NA', urlArguments)
            var rawPixelGeom = await downloadGeoData.raw()

            return rawPixelGeom
            
        } catch (e) {
            console.log(error('Error - rawPixelGeom() - > ' + e.message))
        }
    }

    async vectileQuery(urlArguments, apiEdhHitTime) {
        try {

            var fileNamer = new FileNamer()
            var logDb = new LogDb(this.dbClient)

            /**
             * Create tmp dir
             */
            var submitId = Date.now()
            var processDir = fileNamer.processFileOrDirPath(submitId, 'exportdir', null, null) // Generate process file with path
            fs.mkdirSync(processDir) // Generate output dir path

            /**
             * Create theme dir for tile generation
             */
            var themeNameVersion = urlArguments.themeNameVersion
            var themeName = themeNameVersion.substring(0, themeNameVersion.lastIndexOf("v"))
            var processDirTile = processDir + '/' + themeName
            fs.mkdirSync(processDirTile) // Generate output tile path

            /**
             * Download GeoJSON File for given theme
             */
            var downloadLink = urlArguments.downloadLink
            var downloadFileNamePath = processDir + '/' + themeName + '.geojson'
            await dwnGeoJSONFromS3(downloadLink, downloadFileNamePath)

            /**
             * Tippecanoe tile generation
             */
            await tippecanoeTileGen(processDirTile, downloadFileNamePath)

            /**
             * Delete GeoJSON file
             */
            del.sync([downloadFileNamePath], {force: true})

            /**
             * Push tippecanoe tile to local dir
             */
            await pushTippecanoeTile2LocalDir(processDir, themeName)

            /**
             * Update log
             */
            var numDirInTheme = fileNamer.numDirInTheme(processDir, themeName)
            if (numDirInTheme.length > 1) {
                var msg = 'MbTiles generated successfully :)'
                await logDb.updateVectileQuery(themeName, 'success', apiEdhHitTime, msg)
            } else if (numDirInTheme.length <= 1) {
                var msg = 'MbTiles generation failed :( Check for EPSG:4326 projection or unbroken or empty GeoJSON file'
                await logDb.updateVectileQuery(themeName, 'error', apiEdhHitTime, msg)
            }

            /**
             * Delete tiles dir
             */
            del.sync([processDir], {force: true})

            return
            
        } catch (e) {
            console.log(error('Error - vectileQuery() - > ' + e.message))
        }
    }

    async infoQuery(urlArguments) {
        try {

            var dataDb = new DataDb(this.dbClient)
            var logDb = new LogDb(this.dbClient)
            var referenceDb = new ReferenceDb(this.dbClient)

            var infoList = {}

            // Get full harmoniser list
            if (l.includes(urlArguments['items'], 'fullHarmoniserList')) {
                var fullFramework = await referenceDb.getFwFullDefinition()
                infoList.fullHarmoniserList = fullFramework
            }

            // Get query collection
            if (l.includes(urlArguments['items'], 'queryColl')) {
                var submittedQuery = await logDb.getSubmittedQuery()
                infoList.queryColl = submittedQuery
            }

            // Get vector tile theme
            if (l.includes(urlArguments['items'], 'vectileThemes')) {
                var themeNameVersionList = await referenceDb.getUniqueThemeIdentifier()
                var themeNameArr = []
                for (let i=0; i<themeNameVersionList.length; i++) {
                    var themeNameVersion = themeNameVersionList[i]
                    var themeName = themeNameVersion.substring(0, themeNameVersion.lastIndexOf("v"))
                    themeNameArr.push(themeName)
                }
                infoList.vectileThemes = themeNameArr
            }

            // Get pending query collection 
            if (l.includes(urlArguments['items'], 'pendingQueryColl')) {
                var pendingQuery = await logDb.getPendingQuery()
                infoList.pendingQueryColl = pendingQuery
            }

            // Get S3 download link of finished queries
            if (l.has(urlArguments, 'themeNameVersion')) {
                var submittedQuery = await logDb.getFinishedQuery(urlArguments)

                var submittedQueryModified = []
                for (let i=0; i<submittedQuery.length; i++) {
                    var submittedQuerySortSingle = submittedQuery[i]
                    submittedQuerySortSingle['bboxString'] = submittedQuery[i]['tileGeom']['xMin'] + '' + submittedQuery[i]['tileGeom']['yMin'] + '' + submittedQuery[i]['tileGeom']['xMax'] + '' + submittedQuery[i]['tileGeom']['yMax']
                    submittedQueryModified.push(submittedQuerySortSingle)
                }

                // Group enteries by bbox
                var submittedQueryModifiedGrouped = l.chain(submittedQueryModified)
                        .groupBy("bboxString")
                        .map((value, key) => ({ bbox: key, queryList: value }))
                        .value()
                
                var finalQueryList = []

                for (let i=0; i<submittedQueryModifiedGrouped.length; i++) {

                    // Select only latest query

                    var submittedQueryModifiedGroupedSingle = submittedQueryModifiedGrouped[i]['queryList']

                    var submittedQuerySortSingle = l.orderBy(submittedQueryModifiedGroupedSingle, ['apiEdhHitTime'],['desc'])[0]

                    var finalQuerySingle = {
                        'apiEdhHitTime': submittedQuerySortSingle['apiEdhHitTime'],
                        'ohsomeDataTime': submittedQuerySortSingle['ohsomeDataTime'],
                        'filename': submittedQuerySortSingle['fileName'],
                        'geometry': submittedQuerySortSingle['tileGeom']['tileGeom'],
                        'fileSizeInMb': submittedQuerySortSingle['fileSizeInMb'],
                        'numOfFeaturesProcessed': submittedQuerySortSingle['numOfFeaturesProcessed']
                    }

                    finalQueryList.push(finalQuerySingle)
                }

                infoList.queryS3Link = finalQueryList
            }

            return infoList
            
        } catch (e) {
            console.log(error('Error - infoQuery() - > ' + e.message))
        }
    }

    getmbTile(urlArguments, maxZoomAllowed) {
        try {

            // var themeName = urlArguments.themeName

            return new Promise((res, rej) => {
                try {
                    if (parseInt(urlArguments.z) <= maxZoomAllowed) {
                        var appRootMbtileHub = path.join(appRoot.path, '..')
                        var localMbTile = `${appRootMbtileHub}/${config.get('server.mbTile.mbTileHub')}/${urlArguments.z}/${urlArguments.x}/${urlArguments.y}.pbf`
                        console.log(localMbTile);
                        var tile = fs.readFileSync(localMbTile)
                        res(tile)

                    } else {
                        res()
                    }
                } catch (e) {
                    rej()
                }
            })
            
        } catch (e) {
            console.log(error('Error - getmbTile() - > ' + e.message))
        }
    }

}

module.exports = ExecuteQuery