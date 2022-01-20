'use strict'

// Load `require` directives - external
const config = require('config'),
    clc = require("cli-color")
// Load `require` directives - internal

var error = clc.red.bold,
    warn = clc.yellow,
    notice = clc.blue

class DataDb {
    /**
     * Class to update and fetch data_db database
     */
    
    constructor(dbClient) {
        this.dbClient = dbClient
    }

    getFeature(query) {

        try {

            var dataDb = this.dbClient.db(config.get('mongodb.dataDb'))
            var osmColl = dataDb.collection(config.get('mongodb.osmColl'))
            /**
             * Streaming data. Result is an streamer. 
             * The function where it is being called,
             * do not use await. Rather use 
             * result.on('data', fun())
             * result.on('close', fun())
             * More - https://mongodb.github.io/node-mongodb-native/api-generated/cursor.html
             * 
             * 
             * Following example queries are meant for 2dsphere cases (not being used) --
             * Note that 2dsphere queries result in curved responses (considering actual
             * shape of queries bbox on to the sphere of earth). I think it's suitable 
             * for display of data on 3d Earth like WebWorldWind of NASA etc.
             * 
             * Example queries - db.osm_coll.find({ $or: [ {$and:[{geometry:{$geoWithin:{$geometry:{type:"Polygon",coordinates:[[[8.0,49.0],[9.0,49.0],[9.0,50.0],[8.0,50.0],[8.0,49.0]]]}}}},{"properties.@osmType":"NODE"}]}, {$and:[{geometry:{$geoWithin:{$geometry:{type:"Polygon",coordinates:[[[8.0,49.0],[9.0,49.0],[9.0,50.0],[8.0,50.0],[8.0,49.0]]]}}}},{"properties.@osmType":"WAY"}]}]})
             * 
             * db.osm_coll.find({$and:[{geometry:{$geoWithin:{$geometry:{type:"Polygon",coordinates:[[[8.0,49.0],[9.0,49.0],[9.0,50.0],[8.0,50.0],[8.0,49.0]]]}}}},{"properties.aerodrome":{ $exists: true}}]})
             * 
             * Following example query is meant for 2d case (being used) --
             * Note that 2d sphere is suitable for cases where we provide bbox in the 
             * form of 2d surface, mostly for 2d maps.
             * 
             * db.osm_coll.find({"$or":[{"$and":[{"bbox2":{"$geoWithin":{$polygon: [[0,39],[90,39],[90,39.1],[0,39.1],[0,39]]}}},{"properties.aerodrome":{"$exists":true}}]},{"$and":[{"bbox2":{"$geoWithin":{$polygon: [[0,39],[90,39],[90,39.1],[0,39.1],[0,39]]}}},{"properties.aeroway":"aerodrome"}]}]})
             */      

            var result = osmColl.find({$or: query}, {
                timeout: false}).addCursorFlag('noCursorTimeout',true).stream()

            return result
            
        } catch (e) {
            console.log(error('Error - getFeature() - > ' + e.message))
        }

    }

    data2DbUpdate(item) {
        try {

            // Delete old feature
            this.data2DbDelete(item)

            // Insert new modified one
            this.data2DbInsert(item)
            
            return 
            
        } catch (e) {
            console.log(error('Error - data2DbUpdate() - > ' + e.message))
        }
    }

    data2DbDelete(item) {
        try {

            var dataDb = this.dbClient.db(config.get('mongodb.dataDb'))
            var osmColl = dataDb.collection(config.get('mongodb.osmColl'))

            // Find feature that is being deleted
            var query = {"osmId" : item.properties['@osmId']}
            var result = osmColl.deleteOne(query) // checkKeys: false ensures that key could also contain '.' or '$'
            return result
            
        } catch (e) {
            console.log(error('Error - data2DbDelete() - > ' + e.message))
        }
    }

    data2DbInsert(item) {
        try {

            var dataDb = this.dbClient.db(config.get('mongodb.dataDb'))
            var osmColl = dataDb.collection(config.get('mongodb.osmColl'))

            // Find existing feature
            var query = {"osmId" : item.properties['@osmId']}
            var result = osmColl.find(query).toArray()

            if (result.length > 0) {
                return new Promise((res, rej) => {
                    res()
                })
            } else {
                var result = osmColl.insertOne(item, 
                    { checkKeys: false }) // checkKeys: false ensures that key could also contain '.' or '$'
                return result
            }
            
        } catch (e) {
            console.log(error('Error - data2DbInsert() - > ' + e.message))
        }
    }

    insertFeaturesArray(itemArray) {

        try {

            var dataDb = this.dbClient.db(config.get('mongodb.dataDb'))
            var osmColl = dataDb.collection(config.get('mongodb.osmColl'))
            var result = osmColl.insertMany(itemArray, 
                            { checkKeys: false }) // checkKeys: false ensures that key could also contain '.' or '$'
            return result
            
        } catch (e) {
            console.log(error('Error - insertFeaturesArray() - > ' + e.message))
        }

    }

    async removeDups() {
        try {
            var dataDb = this.dbClient.db(config.get('mongodb.dataDb'))
            var osmColl = dataDb.collection(config.get('mongodb.osmColl'))

            var duplicates = [];
            var collDup = await osmColl.aggregate([
                { $group: {
                    _id: { geoDataFetchTime: "$geoDataFetchTime", properties: "$properties.@osmId" },
                    dups: { "$addToSet": "$_id" },
                    count: { $sum: 1 } 
                }}, 
                { $match: { 
                count: { "$gt": 1 } // Duplicates considered as count greater than one
                }}
            ],
            {allowDiskUse: true})
            .forEach(function(doc) {
                doc.dups.shift(); // First element skipped for deleting
                doc.dups.forEach( function(dupId){
                    duplicates.push(dupId); // Getting all duplicate ids
                    }
                )    
            })

            var remDup = await osmColl.deleteMany({_id:{$in:duplicates}})
            
            return
            
        } catch (e) { 
            console.log(error('Error - removeDups() - > ' + e.message))
        }
    }
    
}

module.exports = DataDb