'use strict'

// Load `require` directives - external
const joi = require('joi').extend(require('joi-date-extensions')),
    // Joi = require('@hapi/joi')
    config = require('config'),
    clc = require("cli-color")
// Load `require` directives - internal

joi.objectId = require('joi-objectid')(joi)

var error = clc.red.bold,
    warn = clc.yellow,
    notice = clc.blue

function joiFilter() {

    try {

        return {
            themeNameVersion: joi.string().required(), // Check theme version combination fetched from framework harmoniser.

            apiToken: joi.string().optional(), // Check for valid API Token string
        
            long: joi.number().min(-180).max(180).required(), // Check for valid longitude value in degree

            lat: joi.number().min(-90).max(90).required(), // Check for valid latitude value in degree

            zoom: joi.number().min(0).max(9).integer().required(), // Check for valid zoom value in numbers for query submission

            dataAggregate: joi.array().items(joi.number()).length(3).required(), // Check if aggregation array is all correct with three numbers ie. width, height, epsg. Needs to be checked is provided x_res, y_res, and epsg fits together. It's a required field.

            bbox: joi.array().items(joi.number()).length(4).required(), // Check if bbox is a valid array of numbers
    
            rawData: joi.boolean().optional(), // Check if raw data needs to be provided. Optional field.

            rawCentroid: joi.boolean().optional(), // Check if raw data centroid is needed for polygons. Optional field.

            dataQuality: joi.boolean().optional(), // Check if data sources need to be provided. Required field.
    
            dataSource: joi.boolean().optional(), // Check if data sources need to be provided. Required field.
    
            dataFormat: joi.array().items(joi.string().valid(config.get('defaults.allGeoFormat'))).optional(), // Check requested data formats.

            downloadLink: joi.string().uri().trim().required(), // Check if valid joi uri is provided.
    
            items: joi.array().items(joi.string().valid(config.get('defaults.allInfoItems'))).optional(), // Check requested items for Info endpoint.

            themeName: joi.string().required(), // Check theme combination fetched from framework harmoniser.

            z: joi.number().min(0).max(13).integer().required(), // Check for z / zoom value in numbers for theme tiles

            x: joi.number().integer().required(), // Check for x / long for theme tiles

            y: joi.number().integer().required() // Check for y / lat for theme tiles
        }
        
    } catch (e) {
        console.log(error('Error - joiFilter() - > ' + e.message))
    }

}

module.exports = {
    joiFilter
}

