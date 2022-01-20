'use strict'

// Load `require` directives - external
const l = require('lodash'),
    fs = require('fs'),
    gjValidate= require("geojson-validation"),
    createCsvWriter = require('csv-writer').createObjectCsvWriter,
    clc = require("cli-color"),
    del = require("del")
// Load `require` directives - internal
const DataDb = require('../../../db/mongo/src/datadb_connect'),
    LogDb = require('../../../db/mongo/src/logdb_connect'),
    msg = require('../../../utils/msg_list'),
    FileNamer = require('../../../utils/file_namer'),
    ReferenceDb = require('../../../db/mongo/src/referencedb_connect')

var error = clc.red.bold,
    warn = clc.yellow,
    notice = clc.blue

class DownloadGeoData {
    /**
     * Class to deal with Geo Data download
     */

    constructor(dbClient, fwDataSource, submitId, urlArguments) {
        this.dbClient = dbClient
        this.fwDataSource = fwDataSource
        this.submitId = submitId
        this.urlArguments = urlArguments
        this.dataDb = new DataDb(dbClient)
        this.logDb = new LogDb(dbClient)
        this.referenceDb = new ReferenceDb(dbClient)
    }

    async getCropMultipolygon() {

        try {

            var multiPoly = {}
            multiPoly['type'] = 'MultiPolygon'
            multiPoly['coordinates'] = [[[8.7,49.4],[8.8,49.4],[8.8,49.5],[8.7,49.5],[8.7,49.4]],
            [[9.1,49.4],[9.2,49.4],[9.2,49.5],[9.1,49.5],[9.1,49.4]]]
            return multiPoly
            
        } catch (e) {
            console.log(error('Error - getCropMultipolygon() - > ' + e.message))
        }

    }

    async download() {
        try {

            return new Promise((res, rej) => {
                var dataDownloadPromises = []
            
                l.map(this.fwDataSource, (item) => {

                    switch (item.origin) {
                        case 'openstreetmap':
                            dataDownloadPromises.push(this.dwnOsm(item.keyval, this.urlArguments))
                            break
                        case 'globalhumansettlementlayer':
                            dataDownloadPromises.push(this.dwnGhsl(item.keyval, this.urlArguments))
                    }
                })

                Promise.all(dataDownloadPromises).then((r) => {
                    res()
                }).catch((e) => {
                    rej(console.log(error('Error - download() - > ' + e)))
                })

            })
            
        } catch (e) {
            console.log(error('Error - download() - > ' + e.message))
        }
    }

    async raw() {
        try {

            return new Promise((res, rej) => {
                var dataDownloadPromises = []
            
                l.map(this.fwDataSource, (item) => {

                    switch (item.origin) {
                        case 'openstreetmap':
                            dataDownloadPromises.push(this.getOsm(item.keyval, this.urlArguments))
                            break
                        case 'globalhumansettlementlayer':
                            dataDownloadPromises.push(this.getGhsl(item.keyval, this.urlArguments))
                    }
                })

                Promise.all(dataDownloadPromises).then((result) => {

                    var resMergeFeat = []
                    l.map(result, (item) => {
                        resMergeFeat = l.concat(resMergeFeat, item)
                    })

                    var resMergeFinalGeoJSON = {
                        "type": "FeatureCollection",
                        "features": resMergeFeat
                    }

                    res(resMergeFinalGeoJSON)

                }).catch((e) => {
                    rej(console.log(error('Error - raw() - > ' + e.message)))
                })

            })
            
        } catch (e) {
            console.log(error('Error - raw() - > ' + e.message))
        }
    }

    async getOsm(keyval, urlArguments) {
        try {

            /**
             * Get OSM data for given pixel
             * for /raw endpoint
             */

            var query = await this.genOSMQuery(keyval, urlArguments)

            var result = await this.dataDb.getFeature(query) 

            return new Promise((res, rej) => {

                var rawFeat = []

                result.on('end', function() {
                    /**
                     * resolve here
                     */
                    res(rawFeat)
                })
    
                result.on('data', function(data) {
                    rawFeat.push(data)    
                }) 
    
                result.on('error', (e) => {
                    rej(console.log(error('Error - getOsm() - > ' + e.message)))
                })

            })
            
        } catch (e) {
            console.log(error('Error - getOsm() - > ' + e.message))
        }
    }

    async genOSMQuery(keyval, urlArguments){
        try {

            var querySpatialCondition = {}
            var queryGeometry = {}
            var queryGeowithin = {}

            var queryCoord = urlArguments.tileGeom.tileGeom.coordinates[0]
            queryGeometry['$polygon'] = queryCoord
            queryGeowithin['$geoWithin'] = queryGeometry
            querySpatialCondition['bboxGeom'] = queryGeowithin

            return new Promise((res, rej) => {

                try {

                    var query = [] 
                    l.map(keyval, (item) => {

                        var querySingleCondition = {}
                        var conditionsList = []

                        var keyValue = {}
                        var k = 'properties.'+item.key
                        if (item.value != '*'){
                            var v = item.value
                        } else {
                            var v = { '$exists': true}
                        }
                        keyValue[k] = v
                        
                        /**
                         * Order of query condition is important based
                         * on database index. So, if the database index is 
                         * generated liked this - db.osm_coll.createIndex({bboxGeom: "2dsphere", "properties.healthcare": 1}, { sparse: true })
                         * the query condition must have "querySpatialCondition" before "keyValue"
                         */
                        conditionsList.push(querySpatialCondition) // Aoi condition
                        conditionsList.push(keyValue) // Properties condition

                        querySingleCondition['$and'] = conditionsList
                        query.push(querySingleCondition)
                    })
                    res(query)
                    
                } catch (e) {
                    rej(console.log(error('Error - genOSMQuery() - > ' + e.message)))
                }
            })
            
        } catch (e) {   
            console.log(error('Error - genOSMQuery() - > ' + e.message))
        }
    }

    async dwnOsm(keyval, urlArguments){
        try {
           var query = await this.genOSMQuery(keyval, urlArguments) 

           return new Promise((res, rej) => {
               /**
                 * Prepare export storage with stream
                 */
                var fileNamer = new FileNamer()
                var outputFile = fileNamer.processFileOrDirPath(urlArguments['_id'], 'file', 'openstreetmap', 'geojson') // Generate process file with path

                /**
                 * Delete if already existed.
                 * To handle cursor id xxx not
                 * found mongo db error
                 */
                if (fs.existsSync(outputFile)) {
                    del.sync([outputFile], {force: true})
                }

                var outStream = fs.openSync(outputFile, 'w')
                fs.writeSync(outStream, msg.geojsonHeader(4326))

                var result = this.dataDb.getFeature(query) // Streamed response from Mongo

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

                result.on('error', async (e) => {
                    console.log(warn('Error - dwnOsm() - result - > ' + e.message))
                    fs.closeSync(outStream)

                    /**
                     * Below circule call to same
                     * dwnOsm() function is to handle
                     * "cursor id xxx not found" 
                     * mongo db error
                     */
                    await this.dwnOsm(keyval, urlArguments)

                })
                
           })

        } catch (e) { 
            console.log(error('Error - dwnOsm() - > ' + e.message))  
        }
    }

    async dwnGhsl(keyval, urlArguments) {
        try {
 
         } catch (e) {   
            console.log(error('Error - dwnGhsl() - > ' + e.message))  
         }
    }

}

module.exports = DownloadGeoData