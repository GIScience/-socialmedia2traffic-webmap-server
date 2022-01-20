'use strict'

// Load `require` directives - external
const config = require('config'),
    l = require('lodash'),
    mongodb = require('mongodb'),
    fs = require('fs'),
    mongoObjId = require('mongodb').ObjectId,
    clc = require("cli-color")
// Load `require` directives - external

var error = clc.red.bold,
    warn = clc.yellow,
    notice = clc.blue

class TmpDb {
    /**
     * Class to create and fetch tmp_db database
     */
    
    constructor(dbClient) {
        this.dbClient = dbClient
    }

    createIndexPixelId(submitId) {
        
        /**
         * Create index on sortId 
         * to allow sorting in 
         * getPixelId().
         * More - https://jira.mongodb.org/browse/NODE-784?focusedCommentId=1341389&page=com.atlassian.jira.plugin.system.issuetabpanels:comment-tabpanel#comment-1341389
         */

        try {

            var tmpDb = this.dbClient.db(config.get('mongodb.tmpDb'))
            var tmpColl = tmpDb.collection('tmp_'+submitId.toString())

            return new Promise((res, rej) => {
                try {
                    tmpColl.createIndex(
                        { sortId : 1 },
                        (e, r) => {
                            res()
                        }
                    )
                } catch (e) {
                    rej(console.log(error('Error - createIndexPixelId() - > ' + e.message)))
                }
            })
            
        } catch (e) {
            console.log(error('Error - createIndexPixelId() - > ' + e.message))
        }

    }

    getPixelId(submitId) {

        try {

            var tmpDb = this.dbClient.db(config.get('mongodb.tmpDb'))
            var tmpColl = tmpDb.collection('tmp_'+submitId.toString())
            
            /**
             * Streaming data. Result is an streamer. 
             * The function where it is being called,
             * do not use await. Rather use 
             * result.on('data', fun())
             * result.on('close', fun())
             * More - https://mongodb.github.io/node-mongodb-native/api-generated/cursor.html
             * 
             * Example queries - db.osm_coll.find({ $or: [ {$and:[{geometry:{$geoWithin:{$geometry:{type:"Polygon",coordinates:[[[8.0,49.0],[9.0,49.0],[9.0,50.0],[8.0,50.0],[8.0,49.0]]]}}}},{"properties.@osmType":"NODE"}]}, {$and:[{geometry:{$geoWithin:{$geometry:{type:"Polygon",coordinates:[[[8.0,49.0],[9.0,49.0],[9.0,50.0],[8.0,50.0],[8.0,49.0]]]}}}},{"properties.@osmType":"WAY"}]}]})
             * 
             * db.osm_coll.find({$and:[{geometry:{$geoWithin:{$geometry:{type:"Polygon",coordinates:[[[8.0,49.0],[9.0,49.0],[9.0,50.0],[8.0,50.0],[8.0,49.0]]]}}}},{"properties.aerodrome":{ $exists: true}}]})
             * 
             * Data is being sorted by sortId while streaming
             */
            
            var options = {
                'sort': 'sortId'
            }

            var result = tmpColl.find({}, options).stream()

            return result
            
        } catch (e) {
            console.log(error('Error - getPixelId() - > ' + e.message))
        }

    }

    insertPixelIdArray(itemArray, submitId) {

        try {

            return new Promise((res, rej) => {
                var tmpDb = this.dbClient.db(config.get('mongodb.tmpDb'))
                var tmpColl = tmpDb.collection('tmp_'+submitId.toString())
                var result = tmpColl.insertMany(itemArray, 
                                { checkKeys: false }).then((r) => { // checkKeys: false ensures that key could also contain '.' or '$'
                                    res()
                                }).catch((e) => {
                                    rej(console.log(error('Error - insertPixelIdArray() - > ' + e.message)))
                                })
            })  
            
        } catch (e) {
            console.log(error('Error - insertPixelIdArray() - > ' + e.message))
        }

    }


    deleteTmpColl(collName) {

        try {

            var tmpDb = this.dbClient.db(config.get('mongodb.tmpDb'))
            var result = tmpDb.collection(collName).drop()

            return result
            
        } catch (e) {
            console.log(error('Error - deleteTmpColl() - > ' + e.message))
        }

    }

    dropAllColl() {

        try {

            var tmpDb = this.dbClient.db(config.get('mongodb.tmpDb'))
            tmpDb.listCollections().toArray( (e, collInfos) => {
                l.map(collInfos, (coll) => {
                    this.deleteTmpColl(coll.name)
                })
            })

        } catch (e) {
            console.log(error('Error - dropAllColl() - > ' + e.message))
        }

    }
    

}

module.exports = TmpDb