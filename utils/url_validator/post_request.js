'use strict'

// Load `require` directives - external
const clc = require("cli-color")
// Load `require` directives - internal
const {joiFilter} = require('./joi_filter'),
    msg = require('../msg_list')

var error = clc.red.bold,
    warn = clc.yellow,
    notice = clc.blue

function submitBody() {

    try {

        var {themeNameVersion,
            snapshotDate,
            dataAggregate,
            rawData,
            dataFormat,
            aoiGeoJSON,
            apiToken} = joiFilter()
    
        return {
            options: {
                status: 400,
                statusText: msg.validationError
              },
            body: {
                themeNameVersion: themeNameVersion, 
                snapshotDate: snapshotDate,
                aoi: aoiGeoJSON,
                dataAggregate: dataAggregate, 
                rawData: rawData, 
                dataFormat: dataFormat,
                apiToken: apiToken
            }
        }
        
    } catch (e) {
        console.log(error('Error - submitBody() - > ' + e.message))
    }

}

module.exports = {
    submitBody
}