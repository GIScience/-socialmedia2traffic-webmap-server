'use strict'

// Load `require` directives - external
const clc = require("cli-color")
// Load `require` directives - internal
const LogDb = require('../../db/mongo/src/logdb_connect')

var error = clc.red.bold,
    warn = clc.yellow,
    notice = clc.blue

class DownloadRequest {
    /**
     * Class to download request submitId
     */
    constructor(dbClient) {
        this.dbClient = dbClient
    }

    downloadZipSubmitId(exportFileName, exportFileNamePath) {

        try {

            return new Promise((res, rej) => {
                var logDb = new LogDb(this.dbClient) 
                logDb.fetchZip(exportFileName, exportFileNamePath)
                    .then((result) => {
                        res(result)
                    })
                    .catch((e) => {
                        rej(console.log(error('Error - downloadZipSubmitId() - > ' + e.message)))
                    })
            })
            
        } catch (e) {
            console.log(error('Error - downloadZipSubmitId() - > ' + e.message))
        }

    }

}

module.exports = DownloadRequest