'use strict'

// Load `require` directives - external
const clc = require("cli-color")
// Load `require` directives - internal
const {
    submitParams,
    submitParamsDynamic,
    statusParams,
    downloadParams,
    rawParams,
    rawParamsDynamic,
    vectileParams,
    vectileParamsDynamic,
    infoParams,
    mbtileParams,
    mbtileParamsDynamic} = require('./get_request'),
    {submitBody} = require('./post_request')

var error = clc.red.bold,
    warn = clc.yellow,
    notice = clc.blue

class UrlValidator {
    /**
     * Class to validate all static parts of url
     */
    constructor() {
    }

    getMethod() {

        try {

            return {
                // submitParams,
                // submitParamsDynamic,
                // rawParams,
                // rawParamsDynamic,
                // vectileParams,
                // vectileParamsDynamic,
                // infoParams,
                mbtileParams
                // mbtileParamsDynamic
            }
            
        } catch (e) {
            console.log(error('Error - getMethod() - > ' + e.message))
        }

    }

    postMethod() {

        try {

            return {
                submitBody
            }

        } catch (e) {
            console.log(error('Error - postMethod() - > ' + e.message))
        }

    }
}

module.exports = UrlValidator