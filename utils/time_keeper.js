'use strict'

// Load `require` directives - external
const clc = require("cli-color")
// Load `require` directives - internal

var error = clc.red.bold,
    warn = clc.yellow,
    notice = clc.blue

function getCurrentServerTime(format) {

    try {

        if (format == 'ISO') {
            return new Date().toISOString()
        }
        if (format == 'Unix') {
            return new Date().getTime() 
        }
        
    } catch (e) {
        console.log(error('Error - getCurrentServerTime() - > ' + e.message))
    }

}

module.exports = {
    getCurrentServerTime
}