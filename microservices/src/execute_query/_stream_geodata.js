'use strict'

// Load `require` directives - external
const l = require('lodash'),
    fs = require('fs'),
    path = require('path'),
    gjValidate= require("geojson-validation"),
    pick = require('stream-json/filters/Pick'),
    {streamArray} = require('stream-json/streamers/StreamArray'),
    Batch = require('stream-json/utils/Batch'),
    {chain} = require('stream-chain'),
    through2 = require('through2'),
    flat = require('flat'),
    clc = require("cli-color")
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

class StreamGeoData {
    /**
     * Class to deal with Geo Data classification,
     * aggregation, export and other custom
     * calculation.
     */

    constructor() {
        this.saveRawDataLength = 0,
        this.saveRawDataCounter = 0
    }

    async assignFilter2Data(data, filterList) {

        try {

            var assignedFilter2Data = []

            l.map(data, (item) => {

                var propertiesKeys = l.keys(item.properties) 
                var propertiesValues = l.values(item.properties)
                
                l.map(filterList, (filter) => {
                    var singleData = {}
                    singleData['data'] = item

                    var diffKeys = l.difference(filter.filterKeyList,propertiesKeys)
                    
                    if (diffKeys.length == 0 && filter.filterValueList != null) {

                        var diffValues = l.difference(filter.filterValueList,propertiesValues)

                        if (diffValues.length == 0) {
                            singleData['filterId'] = filter.filterId
                            assignedFilter2Data.push(singleData)
                        }

                    } else if (diffKeys.length == 0 && filter.filterValueList == null) {
                        singleData['filterId'] = filter.filterId
                        assignedFilter2Data.push(singleData)

                    } 
        
                })  
            })

            return assignedFilter2Data
            
        } catch (e) {
            console.log(error('Error - assignFilter2Data() - > ' + e.message))
        }

    }

    ifQueryBuilder(prefix, filter) {

        /**
         * If Query builder based on 
         * filter clause of Fw Harmoniser
         * definition
         */

        try {

            var ifQuery = ''
            var operator

            switch (filter.logicalOperator) {
                case 'AND':
                    operator = ' && '
                    break
                case 'OR':
                    operator = ' || '
            }

            var counter = 0
            l.map(filter.condition, (item) => {

                if (item.value != 'null') {
                    var val = '\'' + item.value + '\''
                } else {
                    var val = item.value
                }

                if (counter == 0) {
                    ifQuery += prefix + '[\'' + item.key + '\']'
                    ifQuery += item.operator
                    ifQuery += val
                    counter += 1

                } else {
                    ifQuery += operator
                    ifQuery += prefix + '[\'' + item.key + '\']'
                    ifQuery += item.operator
                    ifQuery += val

                }

            })

            return ifQuery
            
        } catch (e) {
            console.log(error('Error - ifQueryBuilder() - > ' + e.message))
        }

    }

    async applyFilter2Data(assignedFilter2Data, filterList) {

        try {

            var appliedFilter2Data = []

            l.map(assignedFilter2Data, (item) => {
                var singleData = {}
                singleData['filterId'] = item.filterId

                var filterId = item.filterId
                var filterItem = l.find(filterList, {filterId:filterId})
                
                var ifQuery = 'true'
                if (filterItem.filter != undefined) {
                    /**
                     * Check if filter claus exists
                     * in Fw Harmoniser definition
                     */
                    ifQuery = this.ifQueryBuilder('item.data.properties', filterItem.filter)
                }
                
                if (eval(ifQuery)) {
                    singleData['data'] = item.data
                    appliedFilter2Data.push(singleData)
                }
            })

            return appliedFilter2Data
            
        } catch (e) {
            console.log(error('Error - applyFilter2Data() - > ' + e.message))
        }
    
    }

    saveRawData(appliedFilter2Data, urlArguments, filterList, fileNameRawData) {

        try {

            return new Promise((res, rej) => {
            
                try {
                    if (urlArguments.rawData == true) {
    
                        var rawDataList = []
            
                        l.map(appliedFilter2Data, (item) => {
                            /**
                             * Apply rawAttribute condition
                             * to retain only those fields into 
                             * rawExport file that are
                             * defined under rawAttribute
                             * clause of fw harmoniser
                             */
                            var filterId = item.filterId
                            var filterItem = l.find(filterList, {filterId:filterId})
            
                            if (filterItem.rawAttribute == '*') {
                                var properties = item.data.properties
                            } else {
                                var properties = l.pick(item.data.properties, filterItem.rawAttribute)
                            }
            
                            var singleData = {}
                            singleData['_id'] = item.data._id
                            singleData['type'] = item.data.type
                            singleData['geometry'] = item.data.geometry
                            singleData['_uniqueSourceIdentifier'] = filterItem.uniqueSourceIdentifier // Add _uniqueSourceIdentifier to differentiate between otherwise identical features that satisfied two or more data source in fwHarmoniser
                            singleData['properties'] = properties
            
                            rawDataList.push(singleData)
                        })
        
                        /**
                         * Group features based on geometry. This will 
                         * remove any duplicacy in raw feature in case
                         * it satisfies more than one dataSource definition
                         */
                        var featGrouped = l.groupBy(rawDataList, (feat) => {
                            return feat._id
                        })
                        
                        var rawDataListReduced = []
                        l.map(featGrouped, (feat) => {
        
                            var uniqueSourceIdentifierAll = l.map(feat, '_uniqueSourceIdentifier')
                            var propertiesAll = l.map(feat, 'properties')
                            
                            /**
                             * Take properties only once
                             */
                            var properties = {}
                            l.map(propertiesAll, (v, p) => {
                                l.extend(properties, v)
                            })
        
                            var singleData = {}
                            singleData['type'] = feat[0].type
                            singleData['geometry'] = feat[0].geometry
                            properties['_uniqueSourceIdentifier'] = uniqueSourceIdentifierAll.join()
                            singleData['properties'] = properties
        
                            rawDataListReduced.push(singleData)
                        })
                        
                        if (!fs.existsSync(fileNameRawData)) {
                            /**
                             * Create empty raw export geojson
                             */
                            fs.appendFileSync(fileNameRawData, msg.geojsonHeader(urlArguments.dataAggregate[2]), 'utf8')
                        }
            
                        if (rawDataListReduced.length > 0) {
                            /**
                             * The logic here is I use buffer, length, and postion 
                             * options of fs.writeSync (https://nodejs.org/api/fs.html#fs_fs_read_fd_buffer_offset_length_position_callback)
                             * to write into a file at a certain postion from the
                             * beginning. That's why in the "else" condition I am 
                             * also using " + this.saveRawDataLength" to calculate
                             * where from the beginning should I append next. Everything
                             * get's over written after provided number of characters,
                             * and that's why I have to write "msg.geojsonFooter" over
                             * and over. "saveRawDataCounter" is being used to handle
                             * commas before each insert.
                             * Motivation - https://stackoverflow.com/questions/17586831/node-js-how-to-insert-string-to-beginning-of-file-but-not-replace-the-original-t , https://www.oreilly.com/library/view/mastering-nodejs-/9781785888960/2642192d-6435-4689-8dc0-a236439ae0b1.xhtml
                             */
            
                            var fd = fs.openSync(fileNameRawData, 'a+')
            
                            if (this.saveRawDataCounter == 0) {
                                var dataInsert = JSON.stringify(rawDataListReduced).slice(1,-1)
                                var dataLength = dataInsert.length
                                fs.writeSync(fd, dataInsert)
                                this.saveRawDataLength += dataLength
            
                                this.saveRawDataCounter += 1
            
                            } else {
        
                                var dataInsert = ',' + JSON.stringify(rawDataListReduced).slice(1,-1)
                                var dataLength = dataInsert.length
                                fs.writeSync(fd, dataInsert)
                                this.saveRawDataLength += dataLength
            
                            }
        
                            fs.closeSync(fd)
                            
                        } 
                        
                        res()
        
                    } else {
                        res()
                    }

                } catch (e) {
                    rej(console.log(error('Error - saveRawData() - > ' + e.message)))
                }
                
            })
            
        } catch (e) {
            console.log(error('Error - saveRawData() - > ' + e.message))
        }
  
    }

    async convertData2PixelAndAttribute(dbClient, appliedFilter2Data, filterList, dataAggregate, crsExtent) {

        try {

            var convertedData2PixelAndAttribute = []

            l.map(appliedFilter2Data, (item) => {

                var filterId = item.filterId
                var filterItem = l.find(filterList, {filterId:filterId})

                /**
                 * If aggregation claus is undefined
                 * in fw Harmoniser definition for a 
                 * given source, we won't perform any 
                 * pixelation and aggregation etc.
                 */

                if (filterItem.aggregation != undefined) {

                    /**
                     * Method defines how we want to 
                     * calculate pixel from geometry.
                     * Possible options are 'intersect',
                     * 'gradient' etc.For gradient we 
                     * also need to define order, which
                     * could be 'sharp' or 'smooth'. 
                     * OPEN QUESTION HOW TO DEFINE GRADIENT!
                     */
                    var pixelIdAndAggreAttriList = transformFeat2PixelAndAggreAttri(dbClient, item, filterItem.aggregation.attribute, dataAggregate, filterItem.aggregation.classifier, crsExtent)
        
                    l.map(pixelIdAndAggreAttriList, (pixel) => {

                        var singlePixel = {}
                        singlePixel['pixelId'] = pixel.pixelId,
                        singlePixel['coordinates'] = pixel.coordinates,
                        singlePixel['uniqueSourceIdentifier'] = filterItem.uniqueSourceIdentifier
                        singlePixel['aggregate'] = {
                            'attribute': pixel.aggreAttribute,
                            'operator': filterItem.aggregation.operator
                        }
                        singlePixel['dataProperties'] = item.data.properties

                        convertedData2PixelAndAttribute.push(singlePixel)
                    })
                }   
            })  

            return convertedData2PixelAndAttribute
            
        } catch (e) {
            console.log(error('Error - convertData2PixelAndAttribute() - > ' + e.message))
        }

    }

    sortAndSavePixelId(convertedData2PixelAndAttribute, urlArguments, fileNameTmpPixelId) {

        try {

            return new Promise((res, rej) => {
                try {
                    var pixelListSorted = l.sortBy(convertedData2PixelAndAttribute, 'pixelId')
    
                    if (!fs.existsSync(fileNameTmpPixelId) && pixelListSorted.length > 0) {
                        /**
                         * Create and save sorted pixelIds
                         */
                        fs.appendFileSync(fileNameTmpPixelId, msg.geojsonHeader(urlArguments.dataAggregate[2])+JSON.stringify(pixelListSorted).slice(1,-1)+msg.geojsonFooter, 'utf8')
                    } 
        
                    res()
                } catch (e) {
                    rej(console.log(error('Error - sortAndSavePixelId() - > ' + e.message)))
                }
            })
            
        } catch (e) {
            console.log(error('Error - sortAndSavePixelId() - > ' + e.message))
        }

    }

    async crunchData(dbClient, data, urlArguments, fwDefinition, filterList, fileNameRawData, fileNameTmpPixelId, crsExtent){

        /**
         * Assign respective filter to data.
         * Note that a single feature may
         * satisfy more than one filters.
         */

        try {
        
            var assignedFilter2Data = await this.assignFilter2Data(data, filterList)

            /**
             * Retain only those features that
             * satisfy respective filtering 
             * condition based on "filter" field
             * in FwHarmoniser definition
             */
            var appliedFilter2Data = await this.applyFilter2Data(assignedFilter2Data, filterList)

            /**
             * Save rawData as well 
             * if asked by the user.
             * All different VGI data would 
             * go into one raw file, with
             * required properties
             */
            await this.saveRawData(appliedFilter2Data, urlArguments, filterList, fileNameRawData)

            /**
             * Assign pixels corresponding to 
             * feature's geometry. There could 
             * be different ways of assigning 
             * pixels to a given geometry.
             * Two identified ways are "intersect"
             * and "gradient" (with "order"). 
             * IT IS AN OPEN QUESTION how to exactly
             * define gradient corresponding order though.
             * Simplistic approach has been taken 
             * for now. IF there are multiple polygons
             * representing a hospital this function
             * will only deal with how to assign 
             * pixels to each of the polygon. 
             * Merging different polygons representing
             * same entity would come in subsequent 
             * functions. For scenario where there
             * are two polygons representing same entity, 
             * and one big pixel covers both of them - 
             * aggregation of attribute value would
             * deal whether they should be counted as 
             * one or two (not in the scope of current
             * function). 
             */            
            var convertedData2PixelAndAttribute = await this.convertData2PixelAndAttribute(dbClient, appliedFilter2Data, filterList, urlArguments.dataAggregate, crsExtent)

            /**
             * Sort pixels along with other attributes
             * extracted from downsampled features.
             * Save results to text file.
             */
            await this.sortAndSavePixelId(convertedData2PixelAndAttribute, urlArguments, fileNameTmpPixelId)

            return 

        } catch (e) {
            console.log(error('Error - crunchData() - > ' + e.message))
        }
    
    }

    crsExtentCal(urlArguments) {
        try {
            
            if (urlArguments.dataAggregate[2] == 3035) {
                var extent = 'Extent-Europe'
            } else {
                var extent = 'Extent-Globe'
            }
            var crsExtentGeoJSON = reprojectCRS(extent, 'EPSG:4326', 'EPSG:'+urlArguments.dataAggregate[2])            
            var nestedCoord = l.map([crsExtentGeoJSON.features[0].geometry], 'coordinates')
            var flatCoord = flat(nestedCoord)
            var coordXY = l.values(flatCoord)
            var xArr = []
            var yArr = []
            l.map(coordXY, (item, index) => {
                (index%2 == 0) ? (xArr.push(item)) : (yArr.push(item))
            })
            var crsExtent = [
                l.min(xArr),
                l.min(yArr),
                l.max(xArr),
                l.max(yArr)
            ]

            return crsExtent

        } catch (e) {
            console.log(error('Error - crsExtentCal() - > ' + e.message))
        }
    }

    dataHarmoniser(dbClient, submitId, urlArguments, fwDefinition){

        try {

            /**
             * Prepare export storage with stream 
             */
            var urlParser = new UrlParser()

            /**
             * Prepare filters
             */
            var filterList = urlParser.getFwFilterList(fwDefinition)

            /**
             * EPSG Extent using reproject
             */  
            var crsExtent = this.crsExtentCal(urlArguments)          
            
            /**
             * Initialise FileNamer class
             * to handle different input
             * output files
             */
            var fileNamer = new FileNamer()
            var apiEdhHitTime = urlArguments['ohsomeDataTime']
            var fileNameRawData = fileNamer.processExportFileOrDirPath(submitId, urlArguments, apiEdhHitTime, 'geojson', 'osm')

            return new Promise((res, rej) => {
                var inputFile = fileNamer.processFileOrDirPath(submitId, 'file', 'crs', 'geojson') // Generate input process file with path

                var counter = 0
                fs.createReadStream(inputFile)
                .pipe(pick.withParser({filter: 'features'})) // More - https://github.com/uhop/stream-json/wiki/Pick
                .pipe(streamArray())
                .pipe(new Batch({batchSize: config.get('server.batchSize')})) // Takes file in big chunks. Single item means too many Mongo Insert operations and many items mean high memory usage. More - https://github.com/uhop/stream-json/wiki/Batch.
                .pipe(through2.obj(async (chunk, enc, callback) => {

                    chunk = l.map(chunk, 'value')

                    var fileNameTmpPixelId = fileNamer.processFileOrDirPath(submitId, 'file', 'pixelId'+counter, 'geojson') // File where tmp sorted pixel ids are saved

                    await this.crunchData(dbClient, chunk, urlArguments, fwDefinition, filterList, fileNameRawData, fileNameTmpPixelId, crsExtent)
                    
                    counter++
                    callback()
                }))
                .on('data', (data) => {
                })
                .on('end', () => {
                    if (urlArguments.rawData == true) {

                        if (counter == 0 && !fs.existsSync(fileNameRawData)) {
                            /**
                             * For case when there is not data
                             * obtained by provided query
                             */

                            /**
                             * Create empty raw export geojson
                             */
                            var fd = fs.openSync(fileNameRawData, 'a+')
                            fs.appendFileSync(fileNameRawData, msg.geojsonHeader(urlArguments.dataAggregate[2]), 'utf8')
                            fs.appendFileSync(fileNameRawData, msg.geojsonFooter, 'utf8') 
                            fs.closeSync(fd)

                        } else {
                            var fd = fs.openSync(fileNameRawData, 'a+')
                            fs.appendFileSync(fileNameRawData, msg.geojsonFooter, 'utf8') 
                            fs.closeSync(fd)
                        } 
                    }
                    res()
                })
                .on('error', (e) => {
                    rej(console.log(error('Error - dataHarmoniser() - > ' + e.message)))
                })

            })
            
        } catch (e) {
            console.log(error('Error - dataHarmoniser() - > ' + e.message))
        }
        
    }

}

module.exports = StreamGeoData