'use strict'

// Load `require` directives - external
const config = require('config'),
    mongoClient = require('mongodb').MongoClient,
    clc = require("cli-color")
// Load `require` directives - internal

var error = clc.red.bold,
    warn = clc.yellow,
    notice = clc.blue

function dbClient() {// To check number of active connections - Go to mongo CLI "$ mongo --host <host> --port <port>" - Run cmd "$ db.serverStatus().connections;"
    
    try {

        return new Promise((res, rej) => {

            if (config.get('mongodb.platform') == 'mongoDbAtlas') {
                var mongoUrl = config.get('mongodb.driver')+'+srv://'+config.get('mongodb.mongoDbAtlas.username')+':'+config.get('mongodb.mongoDbAtlas.password')+config.get('mongodb.mongoDbAtlas.clusterConn')
    
            } else if (config.get('mongodb.platform') == 'mongoDbDocker') {
                var mongoUrl = config.get('mongodb.driver')+'://'+config.get('mongodb.mongoDbDocker.host')+':'+config.get('mongodb.mongoDbDocker.port')
    
            }
    
            mongoClient.connect(mongoUrl, {
                poolSize: config.get('mongodb.connectionPool'), 
                socketTimeoutMS: config.get('mongodb.socketTimeoutMS'),
                connectTimeoutMS: config.get('mongodb.connectTimeoutMS'),
                keepAlive: true,
                useNewUrlParser: true,
                useUnifiedTopology: true
            }, (err, client) => {
                if (err) {
                    console.log(error('Error - dbClient() - > ' + err.message))
                    rej(err)
                } else {
                    res(client)
                }
            })
    
        })
        
    } catch (e) {
        console.log(error('Error - dbClient() - > ' + e.message))
    }

}

module.exports = {
    dbClient
}