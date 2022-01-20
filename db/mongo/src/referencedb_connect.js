'use strict'

// Load `require` directives - external
const config = require('config'),
    l = require('lodash'),
    clc = require("cli-color")
// Load `require` directives - internal

var error = clc.red.bold,
    warn = clc.yellow,
    notice = clc.blue

class ReferenceDb {
    /**
     * Class to query reference_db database
     */
    
    constructor(dbClient) {
        this.dbClient = dbClient
    }

    getUniqueThemeIdentifier() {
        
        /**
         * Return a list of uniqueThemeIdentifiers from 
         * framework_harmoniser_coll
         */

        try {

            var refDb = this.dbClient.db(config.get('mongodb.refDb'))
            var themeColl = refDb.collection(config.get('mongodb.themeColl'));
            var query = {}
            var result = themeColl.distinct("uniqueThemeIdentifier", query)
            return result
            
        } catch (e) {
            console.log(error('Error - getUniqueThemeIdentifier() - > ' + e.message))
        }

    }

    getCustomFwHarmoniser(themeNameVersion) {

        /**
         * Get custom list of framework_harmoniser_coll
         */

        try {

            var refDb = this.dbClient.db(config.get('mongodb.refDb'))
            var themeColl = refDb.collection(config.get('mongodb.themeColl'));
            var query = {}
            if (themeNameVersion != null) {
                query["uniqueThemeIdentifier"] = themeNameVersion
            } 
            var result = themeColl.find(query).toArray()
            return result
            
        } catch (e) {
            console.log(error('Error - getCustomFwHarmoniser() - > ' + e.message))
        }

    }

    getBboxTilesGeom(NAME_Unique) {

        /**
         * Get geom of provided bbox_tile NAME_Unqiue
         */

        try {

            var refDb = this.dbClient.db(config.get('mongodb.refDb'))
            var bboxTilesColl = refDb.collection(config.get('mongodb.bboxTilesColl'));
            var query = {}
            query["NAME_Unique"] = NAME_Unique
            var result = themeColl.find(query).toArray()
            return 'result'
            
        } catch (e) {
            console.log(error('Error - getBboxTilesGeom() - > ' + e.message))
        }

    }

    getApproxBbox() {

        try {
            return
        } catch (e) {
            console.log(error('Error - getApproxBbox() - > ' + e.message))
        }
 
    }

    getAoiList_dep() {
        /**
         * Get AOI list from regions_list_coll
         */
        var refDb = this.dbClient.db(config.get('mongodb.refDb'))
        var regionColl = refDb.collection(config.get('mongodb.regionColl'));
        var query = {}
        var result = regionColl.distinct("NAME_Unique", query)
        return result

    }

    getRegionsList() {

        /**
         * Get AOI list from regions_list_coll
         */

        try {

            var refDb = this.dbClient.db(config.get('mongodb.refDb'))
            var regionColl = refDb.collection(config.get('mongodb.regionColl'));
            var query = {}
            var result = regionColl.distinct("NAME_Unique", query)
            return result
            
        } catch (e) {
            console.log(error('Error - getRegionsList() - > ' + e.message))
        }

    }

    getBboxTilesList() {

        /**
         * Get AOI list from bbox_tiles_coll
         */

        try {

            var refDb = this.dbClient.db(config.get('mongodb.refDb'))
            var bboxTilesColl = refDb.collection(config.get('mongodb.bboxTilesColl'));
            var query = {}
            var result = bboxTilesColl.distinct("NAME_Unique", query)
            return result
            
        } catch (e) {
            console.log(error('Error - getBboxTilesList() - > ' + e.message))
        }

    }

    async getAoiList() {

        /**
         * Get AOI list from regions_list_coll
         * and bbox_tiles_coll
         */

        try {

            var regionsList = await this.getRegionsList()
            var bboxTiles = await this.getBboxTilesList()
            var aoiList = l.concat(regionsList, bboxTiles)
            return aoiList 
            
        } catch (e) {
            console.log(error('Error - getAoiList() - > ' + e.message))
        }
     
    }

    getApiTokenList() {

        /**
         * Get valid API Token list from api_token_coll
         */

        try {

            var refDb = this.dbClient.db(config.get('mongodb.refDb'))
            var apiTokenColl = refDb.collection(config.get('mongodb.apiTokenColl'));
            var query = {}
            var result = apiTokenColl.find(query).toArray()
            // var result = apiTokenColl.distinct("apiToken", query)
            return result
            
        } catch (e) {
            console.log(error('Error - getApiTokenList() - > ' + e.message))
        }

    }

    async getFwDataSource(themeNameVersion = null) {

        /**
         * Return framwork_harmoniser.json's data source
         * with optional key-value
         * defined inside themes, based on passed on 
         * themeNameVersion. All by default.
         */

        try {
            var fullHarmoniser = await this.getCustomFwHarmoniser(themeNameVersion)
            var osmKyVal = [] 
            var origin = []
            var fullDataSourceInfo = []
            
            l.map(fullHarmoniser, (item) => { // Iterate over the whole framwork_harmoniser.json array
                
                l.map(item['dataSource'], (i) => { // Iterate over dataSource array.
                    origin.push(i['source']['origin'])
                    if (i['source']['origin'] == 'openstreetmap') { // Check if the provider is Ohsome
                        osmKyVal.push({'key': i['source']['key'], 'value': i['source']['value']})

                    }
                })
            })

            origin = l.uniqWith(origin, l.isEqual) // Remove duplicate Origins
            osmKyVal = l.uniqWith(osmKyVal, l.isEqual) // Remove duplicate Key-values

            /**
             * Following will remove cases where healthcare=emergency
             * and healthcare=*. healthcare=emergency needs to be 
             * removed.
             */
            var osmKyValSub1 = l.filter(osmKyVal, {value: '*'}) // List of Key-values for value = '*'
            var allValKeys = l.map(osmKyValSub1, 'key') // List of Keys of Key-values for value = '*'
            var osmKyValSub2 = l.remove(osmKyVal, (item) => { // List of Key-values for remaining keys where value != '*'
                return !l.includes(allValKeys, item['key'])
            })
            osmKyVal = l.concat(osmKyValSub1, osmKyValSub2)

            l.map(origin, (item) => {
                if (item == 'openstreetmap') {
                    fullDataSourceInfo.push({
                        origin: item,
                        keyval: osmKyVal
                    })
                } else {
                    fullDataSourceInfo.push({
                        origin: item,
                        keyval: 'NA'
                    })
                } 
            })
            return fullDataSourceInfo

        } catch (e) {
            console.log(error('Error - getFwDataSource() - > ' + e.message))
        }
    
    }

    async getFwExposure(themeNameVersion = null) {

        /**
         * Return framwork_harmoniser.json's full
         * exposure definitions, based on passed
         * on themeNameVersion. All by default.
         */

        try {
            var fullHarmoniser = await this.getCustomFwHarmoniser(themeNameVersion)

            return fullHarmoniser[0]['exposureEq']
            
        } catch (e) {
            console.log(error('Error - getFwExposure() - > ' + e.message))
        }

    }

    async getFwDefinition(themeNameVersion = null) {

        /**
         * Return framwork_harmoniser.json's full definition
         * of dataSource with optional key-value
         * defined inside themes, based on passed on 
         * themeNameVersion. All by default.
         */
        
        try {
            var fullHarmoniser = await this.getCustomFwHarmoniser(themeNameVersion)

            return fullHarmoniser[0]['dataSource']
            
        } catch (e) {  
            console.log(error('Error - getFwDefinition() - > ' + e.message))
        }
    }

    async getFwFullDefinition(themeNameVersion = null) {

        /**
         * Return framwork_harmoniser.json's full definition
         * based on passed on themeNameVersion. All by default.
         */
        
        try {
            var fullHarmoniser = await this.getCustomFwHarmoniser(themeNameVersion)

            return fullHarmoniser
            
        } catch (e) {  
            console.log(error('Error - getFwFullDefinition() - > ' + e.message))
        }
    }

    async getTileGeom(long, lat, zoom) {
        try {

            /**
             * Get tile geom from long, lat, and zoom
             */
            var refDb = this.dbClient.db(config.get('mongodb.refDb'))
            var tilesColl = refDb.collection(config.get('mongodb.tilesColl'));

            /**
             * Using xMin, yMin, xMax, and yMax 
             * to find tileGeom
             * 
             * example - {"$and":[{ "xMin": { $lte: 9.801242 } }, {"yMin": { $lte: 49.105344 } }, {"xMax": { $gt: 9.801242 } }, {"yMax":{ $gt: 49.105344 } },{"zoom":2}]}
             */
            var query = {
                $and: [
                    {"xMin": { $lte: long } },
                    {"yMin": { $lte: lat } },
                    {"xMax": { $gt: long } },
                    {"yMax": { $gt: lat } },
                    {"zoom": zoom}
                ]
            }
            
            var result = tilesColl.find(query).toArray()
            return result
            
        } catch (e) {
            console.log(error('Error - getTileGeom() - > ' + e.message))
        }
    }

    async tilesCoveredByTileGeom(tileGeom) {
        try {

            var refDb = this.dbClient.db(config.get('mongodb.refDb'))
            var tilesColl = refDb.collection(config.get('mongodb.tilesColl'));

            /**
             * Using xMin, yMin, xMax, and yMax 
             * to find tileGeom
             * 
             * example - {"$and":[{ "xMin": { $lte: 9.801242 } }, {"yMin": { $lte: 49.105344 } }, {"xMax": { $gt: 9.801242 } }, {"yMax":{ $gt: 49.105344 } },{"zoom":2}]}
             */
            var xMin = tileGeom.coordinates[0][0][0]
            var yMin = tileGeom.coordinates[0][0][1]
            var xMax = tileGeom.coordinates[0][2][0]
            var yMax = tileGeom.coordinates[0][2][1]
            var query = {$or: [
                {
                    $and: [
                        {"xMin": { $lte: xMin } },
                        {"xMin": { $lte: xMax } },
                        {"yMin": { $gte: yMin } },
                        {"yMin": { $lte: yMax } },
                        {"xMax": { $gte: xMin } },
                        {"xMax": { $lte: xMax } },
                        {"yMax": { $gte: yMin } },
                        {"yMax": { $gte: yMax } },
                        {"zoom": config.get('osm.ohsome.downloadTileZoomLevel')}
                    ]
                },
                {
                    $and: [
                        {"xMin": { $lte: xMin } },
                        {"xMin": { $lte: xMax } },
                        {"yMin": { $gte: yMin } },
                        {"yMin": { $lte: yMax } },
                        {"xMax": { $gte: xMin } },
                        {"xMax": { $lte: xMax } },
                        {"yMax": { $gte: yMin } },
                        {"yMax": { $lte: yMax } },
                        {"zoom": config.get('osm.ohsome.downloadTileZoomLevel')}
                    ]
                },
                {
                    $and: [
                        {"xMin": { $lte: xMin } },
                        {"xMin": { $lte: xMax } },
                        {"yMin": { $lte: yMin } },
                        {"yMin": { $lte: yMax } },
                        {"xMax": { $gte: xMin } },
                        {"xMax": { $lte: xMax } },
                        {"yMax": { $gte: yMin } },
                        {"yMax": { $lte: yMax } },
                        {"zoom": config.get('osm.ohsome.downloadTileZoomLevel')}
                    ]
                },
                {
                    $and: [
                        {"xMin": { $gte: xMin } },
                        {"xMin": { $lte: xMax } },
                        {"yMin": { $gte: yMin } },
                        {"yMin": { $lte: yMax } },
                        {"xMax": { $gte: xMin } },
                        {"xMax": { $lte: xMax } },
                        {"yMax": { $gte: yMin } },
                        {"yMax": { $gte: yMax } },
                        {"zoom": config.get('osm.ohsome.downloadTileZoomLevel')}
                    ]
                },
                {
                    $and: [
                        {"xMin": { $gte: xMin } },
                        {"xMin": { $lte: xMax } },
                        {"yMin": { $gte: yMin } },
                        {"yMin": { $lte: yMax } },
                        {"xMax": { $gte: xMin } },
                        {"xMax": { $lte: xMax } },
                        {"yMax": { $gte: yMin } },
                        {"yMax": { $lte: yMax } },
                        {"zoom": config.get('osm.ohsome.downloadTileZoomLevel')}
                    ]
                },
                {
                    $and: [
                        {"xMin": { $lte: xMin } },
                        {"xMin": { $lte: xMax } },
                        {"yMin": { $lte: yMin } },
                        {"yMin": { $lte: yMax } },
                        {"xMax": { $gte: xMin } },
                        {"xMax": { $gte: xMax } },
                        {"yMax": { $gte: yMin } },
                        {"yMax": { $gte: yMax } },
                        {"zoom": config.get('osm.ohsome.downloadTileZoomLevel')}
                    ]
                },
                {
                    $and: [
                        {"xMin": { $gte: xMin } },
                        {"xMin": { $lte: xMax } },
                        {"yMin": { $lte: yMin } },
                        {"yMin": { $lte: yMax } },
                        {"xMax": { $gte: xMin } },
                        {"xMax": { $lte: xMax } },
                        {"yMax": { $gte: yMin } },
                        {"yMax": { $lte: yMax } },
                        {"zoom": config.get('osm.ohsome.downloadTileZoomLevel')}
                    ]
                },
                {
                    $and: [
                        {"xMin": { $gte: xMin } },
                        {"xMin": { $lte: xMax } },
                        {"yMin": { $gte: yMin } },
                        {"yMin": { $lte: yMax } },
                        {"xMax": { $gte: xMin } },
                        {"xMax": { $gte: xMax } },
                        {"yMax": { $gte: yMin } },
                        {"yMax": { $gte: yMax } },
                        {"zoom": config.get('osm.ohsome.downloadTileZoomLevel')}
                    ]
                },
                {
                    $and: [
                        {"xMin": { $gte: xMin } },
                        {"xMin": { $lte: xMax } },
                        {"yMin": { $gte: yMin } },
                        {"yMin": { $lte: yMax } },
                        {"xMax": { $gte: xMin } },
                        {"xMax": { $gte: xMax } },
                        {"yMax": { $gte: yMin } },
                        {"yMax": { $lte: yMax } },
                        {"zoom": config.get('osm.ohsome.downloadTileZoomLevel')}
                    ]
                },
                {
                    $and: [
                        {"xMin": { $gte: xMin } },
                        {"xMin": { $lte: xMax } },
                        {"yMin": { $lte: yMin } },
                        {"yMin": { $lte: yMax } },
                        {"xMax": { $gte: xMin } },
                        {"xMax": { $gte: xMax } },
                        {"yMax": { $gte: yMin } },
                        {"yMax": { $lte: yMax } },
                        {"zoom": config.get('osm.ohsome.downloadTileZoomLevel')}
                    ]
                }
            ]}

            var result = tilesColl.find(query).toArray()
            return result
            
        } catch (e) {
            console.log(error('Error - tilesCoveredByTileGeom() - > ' + e.message))
        }
    }

}

module.exports = ReferenceDb