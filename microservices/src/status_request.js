'use strict'

// Load `require` directives - external
const clc = require("cli-color")
// Load `require` directives - internal
const LogDb = require('../../db/mongo/src/logdb_connect'),
    msg = require('../../utils/msg_list')

var error = clc.red.bold,
    warn = clc.yellow,
    notice = clc.blue

class StatusRequest {
    /**
     * Class to check status of submitId
     */
    constructor(dbClient) {
        this.dbClient = dbClient
    }

    getSubmitIdStatus(urlArguments) {

        try {

            var urlArguments = urlArguments

            return new Promise((res, rej) => {
                var logDb = new LogDb(this.dbClient); 
                logDb.checkStatus(urlArguments.submitId)
                    .then((result) => {
                        if (result[0] != undefined) {
                            if (result[0]['status'] == 'success') {
                                res({
                                    percentageDone: 100,
                                    message: msg.downloadReady,
                                    exportFileName: result[0]['exportFileName']
                                })
                            } else {
                                res({
                                    percentageDone: 50,
                                    message: msg.underProcess
                                })
                            }
                        } else {
                            res({
                                percentageDone: -1,
                                message: msg.submitIdNotFound
                            })
                        }
                    })
                    .catch((e) => {
                        rej(console.log(error('Error - getSubmitIdStatus() - > ' + e.message)))
                    })
            })
            
        } catch (e) {
            console.log(error('Error - getSubmitIdStatus() - > ' + e.message))
        }

    }

}

module.exports = StatusRequest