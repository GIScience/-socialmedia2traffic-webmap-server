'use strict'

// Load `require` directives - external
const l = require('lodash'),
    del = require('del'),
    fs = require('fs'),
    path = require('path'),
    gjValidate= require("geojson-validation"),
    pick = require('stream-json/filters/Pick'),
    {streamArray} = require('stream-json/streamers/StreamArray'),
    Batch = require('stream-json/utils/Batch'),
    {chain} = require('stream-chain'),
    through2 = require('through2'),
    flat = require('flat'),
    turf = require('@turf/turf'),
    clc = require("cli-color"),
    exec = require('child_process').exec,
    appRoot = require('app-root-path')
// Load `require` directives - internal
const DataDb = require('../../../db/mongo/src/datadb_connect'),
    LogDb = require('../../../db/mongo/src/logdb_connect'),
    config = require('config'),
    msg = require('../../../utils/msg_list'),
    FileNamer = require('../../../utils/file_namer'),
    ReferenceDb = require('../../../db/mongo/src/referencedb_connect'),
    UrlParser = require('../../../utils/url_parser'),
    {transformFeat2PixelAndAggreAttri,
        reprojectCRS} = require('./_internal_geodata'),
    {proj4Extent} = require('../../../lib/proj4_def')

var error = clc.red.bold,
    warn = clc.yellow,
    notice = clc.blue

class DataQuality {
    /**
     * Class to deal with Geo Data classification,
     * aggregation, export and other custom
     * calculation.
     */

    constructor() {
        this.saveRawDataLength = 0,
        this.saveRawDataCounter = 0
    }

    async matchPixel2Quality(chunk, dataQualityGeomValList) {
        try {

            var finalUpdatedChunkWithQuality = []

            for await (let geom of chunk) {

                var qualityList 

                var xMin = geom.geometry.coordinates[0][0][0],
                yMin = geom.geometry.coordinates[0][0][1],
                xMax = geom.geometry.coordinates[0][2][0],
                yMax = geom.geometry.coordinates[0][2][1]

                for await (let dqgeomqual of dataQualityGeomValList) {

                    var xMinDQ = dqgeomqual[0],
                    yMinDQ = dqgeomqual[1],
                    xMaxDQ = dqgeomqual[2],
                    yMaxDQ = dqgeomqual[3]

                    if ((xMin <= xMinDQ &&
                        xMin <= xMaxDQ &&
                        yMin >= yMinDQ &&
                        yMin <= yMaxDQ &&
                        xMax >= xMinDQ &&
                        xMax <= xMaxDQ &&
                        yMax >= yMinDQ &&
                        yMax >= yMaxDQ) ||
                        (xMin <= xMinDQ &&
                            xMin <= xMaxDQ &&
                            yMin >= yMinDQ &&
                            yMin <= yMaxDQ &&
                            xMax >= xMinDQ &&
                            xMax <= xMaxDQ &&
                            yMax >= yMinDQ &&
                            yMax <= yMaxDQ) ||
                        (xMin <= xMinDQ &&
                            xMin <= xMaxDQ &&
                            yMin <= yMinDQ &&
                            yMin <= yMaxDQ &&
                            xMax >= xMinDQ &&
                            xMax <= xMaxDQ &&
                            yMax >= yMinDQ &&
                            yMax <= yMaxDQ) ||
                        (xMin >= xMinDQ &&
                            xMin <= xMaxDQ &&
                            yMin >= yMinDQ &&
                            yMin <= yMaxDQ &&
                            xMax >= xMinDQ &&
                            xMax <= xMaxDQ &&
                            yMax >= yMinDQ &&
                            yMax >= yMaxDQ) ||
                        (xMin >= xMinDQ &&
                            xMin <= xMaxDQ &&
                            yMin >= yMinDQ &&
                            yMin <= yMaxDQ &&
                            xMax >= xMinDQ &&
                            xMax <= xMaxDQ &&
                            yMax >= yMinDQ &&
                            yMax <= yMaxDQ) ||
                        (xMin <= xMinDQ &&
                            xMin <= xMaxDQ &&
                            yMin <= yMinDQ &&
                            yMin <= yMaxDQ &&
                            xMax >= xMinDQ &&
                            xMax >= xMaxDQ &&
                            yMax >= yMinDQ &&
                            yMax >= yMaxDQ) ||
                        (xMin >= xMinDQ &&
                            xMin <= xMaxDQ &&
                            yMin <= yMinDQ &&
                            yMin <= yMaxDQ &&
                            xMax >= xMinDQ &&
                            xMax <= xMaxDQ &&
                            yMax >= yMinDQ &&
                            yMax <= yMaxDQ) ||
                        (xMin >= xMinDQ &&
                            xMin <= xMaxDQ &&
                            yMin >= yMinDQ &&
                            yMin <= yMaxDQ &&
                            xMax >= xMinDQ &&
                            xMax >= xMaxDQ &&
                            yMax >= yMinDQ &&
                            yMax >= yMaxDQ) ||
                        (xMin >= xMinDQ &&
                            xMin <= xMaxDQ &&
                            yMin >= yMinDQ &&
                            yMin <= yMaxDQ &&
                            xMax >= xMinDQ &&
                            xMax >= xMaxDQ &&
                            yMax >= yMinDQ &&
                            yMax <= yMaxDQ) ||
                        (xMin >= xMinDQ &&
                            xMin <= xMaxDQ &&
                            yMin <= yMinDQ &&
                            yMin <= yMaxDQ &&
                            xMax >= xMinDQ &&
                            xMax >= xMaxDQ &&
                            yMax >= yMinDQ &&
                            yMax <= yMaxDQ)) {

                            qualityList = dqgeomqual[4]
                            break
                    }

                }

                if (typeof(qualityList) !== undefined) {
                    geom.properties.dataqualityosm = parseFloat(qualityList.toFixed(2))   
                } else {
                    geom.properties.dataqualityosm = null
                }

                finalUpdatedChunkWithQuality.push(geom)
            }

            return finalUpdatedChunkWithQuality
            
        } catch (e) {
            console.log(error('Error - burnQualityBand() - > ' + e.message))
        }
    }

    async dataQualityGeom(urlArguments) {
        try {
            
            var basePathLocal = `${appRoot}/db/local/`

            if (urlArguments['themeNameVersion'].includes('Health')) {
                var dataQualityFile = basePathLocal + 'data-quality-osm-health.geojson'
            }
            if (urlArguments['themeNameVersion'].includes('Education')) {
                var dataQualityFile = basePathLocal + 'data-quality-osm-education.geojson'
            }
            if (urlArguments['themeNameVersion'].includes('Road')) {
                var dataQualityFile = basePathLocal + 'data-quality-osm-road.geojson'
            }
            if (urlArguments['themeNameVersion'].includes('Railway')) {
                var dataQualityFile = basePathLocal + 'data-quality-osm-railway.geojson'
            }
            if (urlArguments['themeNameVersion'].includes('Airport')) {
                var dataQualityFile = basePathLocal + 'data-quality-osm-airport.geojson'
            }
            if (urlArguments['themeNameVersion'].includes('WaterTreatmentPlant')) {
                var dataQualityFile = basePathLocal + 'data-quality-osm-watertreatmentplant.geojson'
            }
            if (urlArguments['themeNameVersion'].includes('PowerGenerationPlant')) {
                var dataQualityFile = basePathLocal + 'data-quality-osm-powergenerationplant.geojson'
            }
            if (urlArguments['themeNameVersion'].includes('CulturalHeritageSite')) {
                var dataQualityFile = basePathLocal + 'data-quality-osm-culturalheritagesite.geojson'
            }
            if (urlArguments['themeNameVersion'].includes('Bridge')) {
                var dataQualityFile = basePathLocal + 'data-quality-osm-bridge.geojson'
            }
            if (urlArguments['themeNameVersion'].includes('MassGatheringSites')) {
                var dataQualityFile = basePathLocal + 'data-quality-osm-massgatheringsites.geojson'
            }
            if (urlArguments['themeNameVersion'].includes('CoastalExposure')) {
                var dataQualityFile = basePathLocal + 'data-quality-osm-coastalexposure.geojson'
            }
            if (urlArguments['themeNameVersion'].includes('RefugeeSites')) {
                var dataQualityFile = basePathLocal + 'data-quality-osm-refugeesites.geojson'
            }

            var dataQualityObj = JSON.parse(fs.readFileSync(dataQualityFile, 'utf8'))

            var dataQualityGeomValList = []

            for await (let dqgeom of dataQualityObj.features) {
                dataQualityGeomValList.push([dqgeom.geometry.coordinates[0][0][0], dqgeom.geometry.coordinates[0][0][1], dqgeom.geometry.coordinates[0][2][0], dqgeom.geometry.coordinates[0][2][1], dqgeom['properties']['data-quality']])
            }

            return dataQualityGeomValList

        } catch (e) {
            console.log(error('Error - dataQualityGeom() - > ' + e.message))
        }
    }

    async burnOSMQualityBand(submitId, urlArguments) {
        try {

            if (urlArguments['dataQuality'] !== true) {
                return new Promise((res, rej) => {
                    try {
                        res()
                    } catch (e) {
                        rej()
                    }
                })
            }

            // Get input filename
            var fileNamer = new FileNamer()
            var apiEdhHitTime = urlArguments['ohsomeDataTime']
            var inputFile = fileNamer.processExportFileOrDirPath(submitId, urlArguments, apiEdhHitTime, 'geojson', 'aggre')

            // Temp output 
            var tempOutputFile = fileNamer.processExportFileOrDirPath(submitId, urlArguments, apiEdhHitTime, 'geojson', 'tmpaggre')

            /**
             * If no aggregation took place because 
             * fw Harmoniser was missing aggregation
             * definition, simply return with res()
             */
             if (!fs.existsSync(inputFile)) {
                return new Promise((res, rej) => {
                    try {
                        res()
                    } catch (e) {
                        rej()
                    }
                })
            }

            var dataQualityGeomValList = await this.dataQualityGeom(urlArguments)

            return new Promise((res, rej) => {

                if (!fs.existsSync(tempOutputFile)) {
                    /**
                     * Create empty raw export geojson
                     */
                    fs.appendFileSync(tempOutputFile, msg.geojsonHeader(urlArguments.dataAggregate[2]), 'utf8')
                }

                var count = 0

                fs.createReadStream(inputFile)
                .pipe(pick.withParser({filter: 'features'})) // More - https://github.com/uhop/stream-json/wiki/Pick
                .pipe(streamArray())
                .pipe(new Batch({batchSize: config.get('server.batchSize')})) // Takes file in big chunks. Single item means too many Mongo Insert operations and many items mean high memory usage. More - https://github.com/uhop/stream-json/wiki/Batch.
                .pipe(through2.obj(async (chunk, enc, callback) => {

                    chunk = l.map(chunk, 'value') // Get all values from data stream that holds the actual data

                    // Calculate data quality
                    var newPixelList = await this.matchPixel2Quality(chunk, dataQualityGeomValList)

                    if (count > 0) {
                        fs.appendFileSync(tempOutputFile, ',', 'utf8')
                    }

                    // Save pixel to tmp file
                    if (newPixelList.length > 0) {

                        var newPixelListStr = JSON.stringify(newPixelList)
                        newPixelListStr = newPixelListStr.substring(1)
                        newPixelListStr = newPixelListStr.slice(0, -1)

                        fs.appendFileSync(tempOutputFile, newPixelListStr, 'utf8')
                        count += 1
                    }

                    callback()
                }))
                .on('data', (data) => {
                })
                .on('end', () => {

                    var fd = fs.openSync(tempOutputFile, 'a+')
                    fs.appendFileSync(tempOutputFile, msg.geojsonFooter, 'utf8') 
                    fs.closeSync(fd)

                    // delete old file
                    del.sync([inputFile], {force: true})

                    // Rename temp file to input file
                    var cmd = 'mv ' + tempOutputFile + ' ' + inputFile
                    exec(cmd, (e, stdout, stderr) => {
                        res()
                    })
                      
                })
                .on('error', (e) => {
                    rej(console.log(error('Error - burnOSMQualityBandInternal() - > ' + e.message)))
                })

            })
            
        } catch (e) {
            console.log(error('Error - burnOSMQualityBand() - > ' + e.message))
        }
    }

}

module.exports = DataQuality