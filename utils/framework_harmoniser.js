'use strict'

// Load `require` directives - external
const l = require('lodash'),
    clc = require("cli-color")
// Load `require` directives - internal
const ReferenceDb = require('../db/mongo/src/referencedb_connect')

var error = clc.red.bold,
    warn = clc.yellow,
    notice = clc.blue

class FrameworkHarmoniser {
    /**
     * Class to deal with Framework Harmoniser
     */

    constructor() {
    }

    fwDataSource(referenceDb, themeNameVersion) {

        try {

            var dataSource = referenceDb.getFwDataSource(themeNameVersion)

            return dataSource
            
        } catch (e) {
            console.log(error('Error - fwDataSource() - > ' + e.message))
        }

    }

    fwDefinition(referenceDb, themeNameVersion) {

        try {

            var definition = referenceDb.getFwDefinition(themeNameVersion)

            return definition
            
        } catch (e) {
            console.log(error('Error - fwDefinition() - > ' + e.message))
        }

    }

    fwExposure(referenceDb, themeNameVersion) {

        try {

            var exposure = referenceDb.getFwExposure(themeNameVersion)

            return exposure
            
        } catch (e) {
            console.log(error('Error - fwExposure() - > ' + e.message))
        }

    }

    async fwUniqueSourceIdentifier(referenceDb, themeNameVersion) {
        try {

            var definition = await referenceDb.getFwDefinition(themeNameVersion)
            var exposure = await referenceDb.getFwExposure(themeNameVersion)

            var uniqueSourceIdentifierDataSource = l.map(definition, 'uniqueSourceIdentifier')
            var uniqueSourceIdentifierExposureEq = l.map(exposure, 'uniqueSourceIdentifier')

            var uniqueSourceIdentifierAll = uniqueSourceIdentifierDataSource.concat(uniqueSourceIdentifierExposureEq)

            return uniqueSourceIdentifierAll
            
        } catch (e) {
            console.log(error('Error - fwUniqueSourceIdentifier() - > ' + e.message))
        }
    }

}

module.exports = FrameworkHarmoniser