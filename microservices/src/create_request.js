'use strict'

// Load `require` directives - external
const clc = require("cli-color"),
    config = require('config')
// Load `require` directives - internal
const LogDb = require('../../db/mongo/src/logdb_connect')

var error = clc.red.bold,
    warn = clc.yellow,
    notice = clc.blue

class CreateRequest {
    /**
     * Class to create new request submitId
     */
    constructor(dbClient) {
        this.dbClient = dbClient
    }

    getNewSubmitId(urlArguments, apiEdhHitTime) {

        try {

            return new Promise((res, rej) => {
                var logDb = new LogDb(this.dbClient) 
                var submitIdNew = logDb.getNewOrExistRequest(urlArguments, apiEdhHitTime)
                submitIdNew.then((result) => {
                    res(result)
                }).catch((e) => {
                    rej(console.log(error('Error - getNewSubmitId() - > ' + e.message)))
                })
            })
            
        } catch (e) {
            console.log(error('Error - getNewSubmitId() - > ' + e.message))
        }

    }

    submitQuery(urlArguments, checkParamsDynamicMsg, apiEdhHitTime) {
        try {

            if (typeof(urlArguments.rawData) == 'undefined') {
                urlArguments.rawData = config.get('defaults.params.rawData')
            }
            if (typeof(urlArguments.rawCentroid) == 'undefined') {
                urlArguments.rawCentroid = config.get('defaults.params.rawCentroid')
            }
            if (typeof(urlArguments.dataQuality) == 'undefined') {
                urlArguments.dataQuality = config.get('defaults.params.dataQuality')
            }
            if (typeof(urlArguments.dataSource) == 'undefined') {
                urlArguments.dataSource = config.get('defaults.params.dataSource')
            }
            if (typeof(urlArguments.dataFormat) == 'undefined') {
                urlArguments.dataFormat = config.get('defaults.params.dataFormat')
            }

            return new Promise((res, rej) => {
                var logDb = new LogDb(this.dbClient) 
                var submitQuery = logDb.submitQuery(urlArguments, checkParamsDynamicMsg, apiEdhHitTime)
                submitQuery.then((r) => {
                    res(r)
                }).catch((e) => {
                    rej(console.log(error('Error - submitQuery() - > ' + e.message)))
                })
            })
            
        } catch (e) {
            console.log(error('Error - submitQuery() - > ' + e.message))
        }
    }

    vectileQuery(urlArgumentsTheme, apiEdhHitTime) {
        try {

            return new Promise((res, rej) => {
                var logDb = new LogDb(this.dbClient) 
                var submitQueryBool = logDb.vectileQuery(urlArgumentsTheme, apiEdhHitTime)
                submitQueryBool.then((r) => {
                    res(r)
                }).catch((e) => {
                    rej(console.log(error('Error - vectileQuery() - > ' + e.message)))
                })
            })
            
        } catch (e) {
            console.log(error('Error - vectileQuery() - > ' + e.message))
        }
    }

}

module.exports = CreateRequest