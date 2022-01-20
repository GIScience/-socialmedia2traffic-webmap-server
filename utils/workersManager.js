'use strict'

// Load `require` directives - external
const clc = require("cli-color"),
    fs = require('fs'),
    l = require('lodash'),
    del = require('del'),
    config = require('config')
// Load `require` directives - internal
const ExecuteQuery = require('../microservices/src/execute_query/index'),
    FileNamer = require('../utils/file_namer'),
    LogDb = require('../db/mongo/src/logdb_connect')

var error = clc.red.bold,
    warn = clc.yellow,
    notice = clc.blue

var fileNamer = new FileNamer()

async function workersManager(dbClient) {
    /**
     * Workers Manager to handle queued requests
     */

    try {

        var processFilesList = fileNamer.processFilesList()

        if (processFilesList.length < config.get('server.workersQueueMaxLimit')) {
            
            /**
             * Process queued requests if slot is available
             */
            var availableSlotsCount = config.get('server.workersQueueMaxLimit') - processFilesList.length

            var logDb = new LogDb(dbClient)
            var getQueuedSubmit = await logDb.getQueuedSubmit(availableSlotsCount)

            l.map(getQueuedSubmit, (queue) => {
                var executeQuery = new ExecuteQuery(dbClient, queue.urlArguments, queue._id, queue.apiEdhHitTime)
            })

        }
        
        return
        
    } catch (e) {
        console.log(error('Error - workersManager() - > ' + e.message))
    }

}

module.exports = {
    workersManager
}