const fs = require('fs'),
readline = require('readline'),
l = require('lodash'),
flat = require('flat'),
mongoClient = require('mongodb').MongoClient,
unflat = require('flat').unflatten

var mongoUrl = 'mongodb'+'+srv://'+'<mongo atlas username>'+':'+'<mongo atlas password>'+'<mongo atlas clustername including @ as defined under mongo atlas connection tab. More could be found under default.json config file>'
var dir = '/Users/zzz/Desktop/ohsomeMerge'
var dupFile_name = 'mongoimport.json'
var dupFile = dir + '/' + dupFile_name
var db = 'data_db'
var coll = 'osm_coll'

function featArr2MongoDuplicity(dbClient, db, coll, fileName) {
    try {
        
        return new Promise((res, rej) => {

            var lineReader = readline.createInterface({
                input: require('fs').createReadStream(fileName)
            })
            
            lineReader.on('line', (item) => {
        
                if (!l.includes(['[',']',','], item)){
                    data2DbUpdate(db, coll, item)
                }

            })
            .on('close', () => {
                res()
            })
            .on('error', (e) => {
                rej(console.log('Error - txt2Mongo() - > ' + e.message))
            })

        })

    } catch (e) {
        console.log('Error - featArr2MongoDuplicity() - > ' + e.message)
    }
}

function data2DbUpdate(db, coll, item) {
    try {
        var dataDb = db
        var osmColl = coll
        
        /**
         * IT NEEDS TO BE WORKED OUT BASED ON
         * NEWLY DEFINED /contributions/latest/geometry
         * ENDPOINT. MORE INFO COULD BE FIND HERE
         * https://gitlab.com/jrc_osm/edh_server/-/blob/master/db/mongo/src/datadb_connect.js
         */
        console.log("Code is incomplete");
        
        return
    } catch (e) {
        console.log(error('Error - data2DbUpdate() - > ' + e.message))
    }
}

function dbClient(mongoUrl) {// To check number of active connections - Go to mongo CLI "$ mongo --host <host> --port <port>" - Run cmd "$ db.serverStatus().connections;"
    
    try {

        return new Promise((res, rej) => {
    
            mongoClient.connect(mongoUrl, {
                poolSize: 10, 
                // autoReconnect: true,
                socketTimeoutMS: 360000,
                connectTimeoutMS: 360000,
                // reconnectInterval: config.get('mongodb.reconnectIntervalMS'), // 10 sec
                // reconnectTries: config.get('mongodb.reconnectTries'),
                useNewUrlParser: true,
                useUnifiedTopology: true
            }, (err, client) => {
                if (err) {
                    console.log('Error - dbClient() - > ' + err.message)
                    rej(err)
                } else {
                    res(client)
                }
            })
    
        })
        
    } catch (e) {
        console.log('Error - dbClient() - > ' + e.message)
    }

}

async function push(mongoUrl, db, coll, dupFile) {
    var client = await dbClient(mongoUrl)
    await featArr2MongoDuplicity(client, db, coll, dupFile)
}

push(mongoUrl, db, coll, dupFile)
