'use strict'

// Load `require` directives - external
const l = require('lodash'),
    fs = require('fs'),
    path = require('path'),
    gjValidate= require("geojson-validation"),
    pick = require('stream-json/filters/Pick'),
    through2 = require('through2'),
    {streamArray} = require('stream-json/streamers/StreamArray'),
    Batch = require('stream-json/utils/Batch'),
    {chain} = require('stream-chain'),
    clc = require("cli-color")
// Load `require` directives - internal
const DataDb = require('../../../db/mongo/src/datadb_connect'),
    LogDb = require('../../../db/mongo/src/logdb_connect'),
    config = require('config'),
    msg = require('../../../utils/msg_list'),
    FileNamer = require('../../../utils/file_namer'),
    ReferenceDb = require('../../../db/mongo/src/referencedb_connect'),
    UrlParser = require('../../../utils/url_parser'),
    {transformFeat2PixelAndAggreAttri} = require('./_internal_geodata')

var error = clc.red.bold,
    warn = clc.yellow,
    notice = clc.blue

class StreamPixelId {
    /**
     * Class to deal with Geo Data exposure,
     * risk mapping, and other custom
     * calculation.
     */

    constructor() {
        this.saveAggreDataLength = 0,
        this.saveAggreDataCounter = 0
    }

    convertPixelId2PixelGeoJSON(data, urlArguments, fwExposure) {

        try {

            var dataGeoJSON = []

            var expUniqueSourceIdentifierList = l.map(fwExposure, 'uniqueSourceIdentifier')

            l.map(data, (item) => {

                /**
                 * Get all properties - 
                 * aggregation, exposure etc.
                 * Check if data source is True
                 * or not in order to provide
                 * individual data sources
                 */
                var properties = {}
                if (urlArguments.dataSource == false) {
                    l.map(item.attriPerPixelIdAll, (i) => {
                        if (expUniqueSourceIdentifierList.includes(i.uniqueSourceIdentifier)) {
                            properties[i.uniqueSourceIdentifier] = i.attribute
                        }   
                    })
                } else {
                    l.map(item.attriPerPixelIdAll, (i) => {
                        properties[i.uniqueSourceIdentifier] = i.attribute
                    })
                }            

                if (!l.isEmpty(properties)) {
                    /**
                     * Calculate pixel polygon
                     * if there is some property in 
                     * property object. Either
                     * data source or exposure
                     */
                    var x_min = item.coordinates[0],
                    y_min = item.coordinates[1],
                    x_max = item.coordinates[2],
                    y_max = item.coordinates[3]
                    var coordinates = [
                        [
                        [
                            x_min,
                            y_min
                        ],
                        [
                            x_max,
                            y_min
                        ],
                        [
                            x_max,
                            y_max
                        ],
                        [
                            x_min,
                            y_max
                        ],
                        [
                            x_min,
                            y_min
                        ]
                        ]
                    ]

                    var feat = {}
                    feat['type'] = 'Feature'
                    feat['properties'] = properties
                    feat['geometry'] = {
                        'type': 'Polygon',
                        'coordinates': coordinates
                    }
                    dataGeoJSON.push(feat)
                }

            })

            return dataGeoJSON
            
        } catch (e) {
            console.log(error('Error - convertPixelId2PixelGeoJSON() - > ' + e.message))
        }

    }

    assignExposure2PixelIdIfRequired(data, fwDefinition, fwExposure) {

        try {

            /**
             * EXPOSURE EQUATIONS
             */
            function expEqAverage(attriPerPixelIdAll) {

                /**
                 * _average exposure equation
                 * as per defined in Framework
                 * Harmoniser documentation 
                 * https://gitlab.com/jrc_osm/edh_db/issues/2
                 */

                try {

                    var attri = l.map(attriPerPixelIdAll, 'attribute')
                    return l.mean(attri)
                    
                } catch (e) {
                    console.log(error('Error - expEqAverage() - > ' + e.message))
                }

            }

            function expEqDivide(attriPerPixelIdAll) {

                /**
                 * _divide exposure equation
                 * as per defined in Framework
                 * Harmoniser documentation 
                 * https://gitlab.com/jrc_osm/edh_db/issues/2
                 */

                try {

                    return NaN
                    
                } catch (e) {
                    console.log(error('Error - expEqDivide() - > ' + e.message))
                }

            }

            function expEqCustomFunction(attriPerPixelIdAll) {

                /**
                 * _customFunction exposure equation
                 * as per defined in Framework
                 * Harmoniser documentation 
                 * https://gitlab.com/jrc_osm/edh_db/issues/2
                 */

                try {

                    return NaN
                    
                } catch (e) {
                    console.log(error('Error - expEqCustomFunction() - > ' + e.message))
                }

            }

            function expEqBooleanAnd(attriPerPixelIdAll) {

                /**
                 * _booleanAnd exposure equation
                 * as per defined in Framework
                 * Harmoniser documentation 
                 * https://gitlab.com/jrc_osm/edh_db/issues/2
                 */

                try {

                    var attri = l.map(attriPerPixelIdAll, 'attribute')
                    var bool = attri.includes(0)

                    if (bool) {
                        var boolExp = 0
                    } else {
                        var boolExp = 1
                    }

                    return boolExp
                    
                } catch (e) {
                    console.log(error('Error - expEqBooleanAnd() - > ' + e.message))
                }

                
            }

            function expEqBooleanOr(attriPerPixelIdAll) {

                /**
                 * _booleanOr exposure equation
                 * as per defined in Framework
                 * Harmoniser documentation 
                 * https://gitlab.com/jrc_osm/edh_db/issues/2
                 */

                try {

                    var attri = l.map(attriPerPixelIdAll, 'attribute')
                    var attriLn = l.without(attri, attri[0]).length
                    
                    if (attri[0] == 0 && attriLn == 0) {
                        var boolExp = 0
                    } else {
                        var boolExp = 1
                    }

                    return boolExp
                    
                } catch (e) {
                    console.log(error('Error - expEqBooleanOr() - > ' + e.message))
                }

            }

            function expEqSum(attriPerPixelIdAll) {
                
                /**
                 * _sum exposure equation
                 * as per defined in Framework
                 * Harmoniser documentation 
                 * https://gitlab.com/jrc_osm/edh_db/issues/2
                 */

                try {

                    var attri = l.map(attriPerPixelIdAll, 'attribute')
                    attri = l.compact(attri) // Removes all NaN values
                    return l.sum(attri)
                    
                } catch (e) {
                    console.log(error('Error - expEqSum() - > ' + e.message))
                }

            }

            var sortIdList = l.uniq(l.map(data, 'sortId'))

            var uniqueSourceIdentifierList = l.uniq(l.map(fwDefinition, 'uniqueSourceIdentifier'))

            var pixelIdAttriMeasuresAll = []

            l.map(sortIdList, (sortId) => {

                var dataPerPixelId = l.filter(data, {sortId:sortId})

                var attriPerPixelIdAll = []

                l.map(uniqueSourceIdentifierList, (uniqueSourceIdentifier) => {      

                    var attriObj = l.filter(dataPerPixelId, {uniqueSourceIdentifier:uniqueSourceIdentifier})

                    if (attriObj.length == 0) {
                        attriPerPixelIdAll.push({
                            'uniqueSourceIdentifier': uniqueSourceIdentifier,
                            'attribute': NaN
                        })
                    } else {
                        var attriValue = l.map(attriObj, 'aggregate.attribute')
                        var attriOperator = l.map(attriObj, 'aggregate.operator')[0]

                        switch (attriOperator) {
                            case '+': 
                                attriPerPixelIdAll.push({
                                    'uniqueSourceIdentifier': uniqueSourceIdentifier,
                                    'attribute': l.sum(attriValue)
                                })
                                break
                            case '-':
                                /**
                                 * Handle other aggregation
                                 * operator type
                                 */
                                break
                            case '*':
                                /**
                                 * Handle other aggregation
                                 * operator type
                                 */
                                break 
                            case '/':
                                /**
                                 * Handle other aggregation
                                 * operator type
                                 */
                                break
                            case '1/0':

                                if (l.sum(attriValue) >= 1) {
                                    attriPerPixelIdAll.push({
                                        'uniqueSourceIdentifier': uniqueSourceIdentifier,
                                        'attribute': 1
                                    })
                                } else {
                                    attriPerPixelIdAll.push({
                                        'uniqueSourceIdentifier': uniqueSourceIdentifier,
                                        'attribute': 0
                                    })
                                }   

                        }
                    }  

                })

                if (fwExposure != undefined) {

                    l.map(fwExposure, (exposure) => {
                
                        switch (exposure.function) {
                            case '_divide': 
                                /**
                                 * Function returns a number
                                 */
                                var measure = expEqDivide(attriPerPixelIdAll)
                                attriPerPixelIdAll.push({
                                    'uniqueSourceIdentifier': exposure.uniqueSourceIdentifier,
                                    'attribute': Math.round(measure * 10000000) / 10000000
                                })
                                break
                            case '_average':
                                /**
                                 * Other exposure equations
                                 * would go here. Function returns
                                 * a number
                                 */
                                var measure = expEqAverage(attriPerPixelIdAll)
                                attriPerPixelIdAll.push({
                                    'uniqueSourceIdentifier': exposure.uniqueSourceIdentifier,
                                    'attribute': Math.round(measure * 10000000) / 10000000
                                })
                                break
                            case '_customFunction':
                                /**
                                 * Other exposure equations
                                 * would go here. Function returns
                                 * a number
                                 */
                                var measure = expEqCustomFunction(attriPerPixelIdAll)
                                attriPerPixelIdAll.push({
                                    'uniqueSourceIdentifier': exposure.uniqueSourceIdentifier,
                                    'attribute': Math.round(measure * 10000000) / 10000000
                                })
                                break
                            case '_booleanAnd':
                                /**
                                 * Function returns boolean based on
                                 * if all data sources have Internal
                                 * attribute != 0 or null or undefined
                                 */
                                var measure = expEqBooleanAnd(attriPerPixelIdAll)
                                attriPerPixelIdAll.push({
                                    'uniqueSourceIdentifier': exposure.uniqueSourceIdentifier,
                                    'attribute': Math.round(measure * 10000000) / 10000000
                                })
                                break
                            case '_booleanOr':
                                /**
                                 * Function returns boolean based on
                                 * if at least one of the
                                 *  data sources has Internal
                                 * attribute != 0 or null or undefined
                                 */
                                var measure = expEqBooleanOr(attriPerPixelIdAll)
                                attriPerPixelIdAll.push({
                                    'uniqueSourceIdentifier': exposure.uniqueSourceIdentifier,
                                    'attribute': Math.round(measure * 10000000) / 10000000
                                })
                                break
                            case '_sum':
                                /**
                                 * Function returns total sum of 
                                 * all passed in Internal
                                 * attribute
                                 */
                                var measure = expEqSum(attriPerPixelIdAll)
                                if (!Number.isNaN(measure)) {
                                    attriPerPixelIdAll.push({
                                        'uniqueSourceIdentifier': exposure.uniqueSourceIdentifier,
                                        'attribute': Math.round(measure * 10000000) / 10000000
                                    })
                                }
                                break
        
                        }
                        
                    })

                }

                pixelIdAttriMeasuresAll.push({
                    'pixelId': dataPerPixelId[0].pixelId,
                    'attriPerPixelIdAll': attriPerPixelIdAll,
                    'coordinates': dataPerPixelId[0].coordinates
                })

            })

            return pixelIdAttriMeasuresAll
            
        } catch (e) {
            console.log(error('Error - assignExposure2PixelIdIfRequired() - > ' + e.message))
        }

    }

    savePixelIdGeoJSON(data, urlArguments, fileNameAggreData) {

        try {

            return new Promise((res, rej) => {

                try {
            
                    if (data.length > 0) {
                        /**
                         * The logic here is I use buffer, length, and postion 
                         * options of fs.writeSync (https://nodejs.org/api/fs.html#fs_fs_read_fd_buffer_offset_length_position_callback)
                         * to write into a file at a certain postion from the
                         * beginning. That's why in the "else" condition I am 
                         * also using " + this.saveRawDataLength" to calculate
                         * where from the beginning should I append next. Everything
                         * get's over written after provided number of characters,
                         * and that's why I have to write "msg.geojsonFooter" over
                         * and over. "saveAggreDataCounter" is being used to handle
                         * commas before each insert.
                         * Motivation - https://stackoverflow.com/questions/17586831/node-js-how-to-insert-string-to-beginning-of-file-but-not-replace-the-original-t , https://www.oreilly.com/library/view/mastering-nodejs-/9781785888960/2642192d-6435-4689-8dc0-a236439ae0b1.xhtml
                         */
            
                        var fd = fs.openSync(fileNameAggreData, 'a+')
            
                        if (this.saveAggreDataCounter == 0) {
                            var dataInsert = JSON.stringify(data).slice(1,-1)
                            var dataLength = dataInsert.length
                            fs.writeSync(fd, dataInsert)
                            this.saveAggreDataLength += dataLength
            
                            this.saveAggreDataCounter += 1
            
                        } else {
                            var dataInsert = ',' + JSON.stringify(data).slice(1,-1)
                            var dataLength = dataInsert.length
                            fs.writeSync(fd, dataInsert)
                            this.saveAggreDataLength += dataLength
            
                        }
        
                        fs.closeSync(fd)
                        
                    } 
                    
                    res()

                } catch (e) {
                    rej(console.log(error('Error - savePixelIdGeoJSON() - > ' + e.message)))
                }
        
            })
            
        } catch (e) {
            console.log(error('Error - savePixelIdGeoJSON() - > ' + e.message))
        }
        
    }

    async crunchPixel(data, urlArguments, fileNameAggreData, fwDefinition, fwExposure) {

        try {
            /**
             * Calculate exposure for each 
             * pixel and assign value as new 
             * attribute. 
             */
            var dataAssignedExp = this.assignExposure2PixelIdIfRequired(data, fwDefinition, fwExposure)
            
            /**
             * Convert pixelId data to actual
             * pixel geometry and properties
             * in GeoJSON format
             */
            var dataPixelId2Geojson = this.convertPixelId2PixelGeoJSON(dataAssignedExp, urlArguments, fwExposure)

            /**
             * Save aggregated data to file
             */
            await this.savePixelIdGeoJSON(dataPixelId2Geojson, urlArguments, fileNameAggreData)

            return
            
        } catch (e) {
            console.log(error('Error - crunchPixel() - > ' + e.message))
        }
    }

    riskMapper(submitId, urlArguments, fwDefinition, fwExposure) {

        try {

            /**
             * Perform defined fw Harmoniser
             * custom exposure and risk 
             * calculation per pixel and 
             * store final result
             */
            var fileNamer = new FileNamer()
            var inputFile = fileNamer.processFileOrDirPath(submitId, 'file', 'pixelId', 'geojson') // Generate input process file with path

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

            /**
             * Initialise FileNamer class
             * to handle different input
             * output files
             */
            var apiEdhHitTime = urlArguments['ohsomeDataTime']
            var fileNameAggreData = fileNamer.processExportFileOrDirPath(submitId, urlArguments, apiEdhHitTime, 'geojson', 'aggre')

            var chunkPending = []

            return new Promise((res, rej) => {

                if (!fs.existsSync(fileNameAggreData)) {
                    /**
                     * Create empty raw export geojson
                     */
                    fs.appendFileSync(fileNameAggreData, msg.geojsonHeader(urlArguments.dataAggregate[2]), 'utf8')
                }

                fs.createReadStream(inputFile)
                .pipe(pick.withParser({filter: 'features'})) // More - https://github.com/uhop/stream-json/wiki/Pick
                .pipe(streamArray())
                .pipe(new Batch({batchSize: config.get('server.batchSize')})) // Takes file in big chunks. Single item means too many Mongo Insert operations and many items mean high memory usage. More - https://github.com/uhop/stream-json/wiki/Batch.
                .pipe(through2.obj(async (chunk, enc, callback) => {

                    chunk = l.map(chunk, 'value') // Get all values from data stream that holds the actual data
                    
                    chunk = chunkPending.concat(chunk) // Merge dataPending data to streamed data

                    var lastSortId = l.last(chunk).sortId // Get last pixel sortId to be used for next chunk

                    chunkPending = l.filter(chunk, {sortId:lastSortId}) // Get all pixels with above sortId

                    chunk = l.difference(chunk, chunkPending) // Use all pixels except those with lastSortId to be used for last chunk

                    this.crunchPixel(chunk, urlArguments, fileNameAggreData, fwDefinition, fwExposure)

                    callback()
                }))
                .on('data', (data) => {
                })
                .on('end', () => {
                    this.crunchPixel(chunkPending, urlArguments, fileNameAggreData, fwDefinition, fwExposure).then((r) => {

                        var fd = fs.openSync(fileNameAggreData, 'a+')
                        fs.appendFileSync(fileNameAggreData, msg.geojsonFooter, 'utf8') 
                        fs.closeSync(fd)

                        res()

                    })   
                })
                .on('error', (e) => {
                    rej(console.log(error('Error - riskMapper() - > ' + e.message)))
                })

            })
            
        } catch (e) {
            console.log(error('Error - riskMapper() - > ' + e.message))
        }

    }

}

module.exports = StreamPixelId