'use strict'

// Load `require` directives - external
const l = require('lodash'),
    clc = require("cli-color")
// Load `require` directives - internal
const {joiFilter} = require('./joi_filter'),
    msg = require('../msg_list'),
    ReferenceDb = require('../../db/mongo/src/referencedb_connect'),
    {proj4Extent} = require('../../lib/proj4_def'),
    UrlParser = require('../url_parser'),
    LogDb = require('../../db/mongo/src/logdb_connect')
const { object } = require('underscore')

var error = clc.red.bold,
    warn = clc.yellow,
    notice = clc.blue

function submitParams() {

    try {

        var {themeNameVersion,
            apiToken,
            long,
            lat,
            zoom,
            dataAggregate,
            rawData,
            rawCentroid,
            dataQuality,
            dataSource,
            dataFormat} = joiFilter()
    
        return {
            options: {
                status: 400,
                statusText: msg.validationError
            },
            query: {
                themeNameVersion: themeNameVersion,
                apiToken: apiToken,                
                long: long,
                lat: lat,
                zoom: zoom,
                dataAggregate: dataAggregate,
                rawData: rawData,
                rawCentroid: rawCentroid,
                dataQuality: dataQuality,
                dataSource: dataSource,
                dataFormat: dataFormat  
            }
        }
        
    } catch (e) {
        console.log(error('Error - submitParams() - > ' + e.message))
    }

}

async function submitParamsDynamic(dbClient, urlArgs) {
    try {
        var referenceDb = new ReferenceDb(dbClient); 
        var urlParser = new UrlParser();

        /**
         * Get all available unique theme identifiers from Db.
         * If params contain themeNameVersion key (which should be required), 
         * check if it's value is valid. Return true otherwise false. 
         */
        var themeNameVersionList = await referenceDb.getUniqueThemeIdentifier() 
        var boolUniqueThemeIdentifier = (l.has(urlArgs, 'themeNameVersion')) 
                                            ? (l.includes(themeNameVersionList, urlParser.getValueOfKey(urlArgs, 'themeNameVersion'))) 
                                            : (false)

        /**
         * Check if dataAggregate key exists or not.
         * If it does then check if it's valid one as defined in 
         * lib/proj4Extent(). 
         */
        var boolDataAggregate = (l.has(urlArgs, 'dataAggregate')) 
                                    ? ((typeof proj4Extent(urlParser.getValueOfKey(urlArgs, 'dataAggregate')[2]) !== "undefined") 
                                        ? (true) 
                                        : (false)) 
                                    : (false)

        /**
         * Check valid API Token
         */
        var apiTokenListObj = await referenceDb.getApiTokenList()
        var apiTokenList = l.map(apiTokenListObj, 'apiToken')
        if (!l.has(urlArgs, 'apiToken')) {
            var boolApiToken = true
        } else {
            var boolApiToken = (l.has(urlArgs, 'apiToken')) 
                                            ? (l.includes(apiTokenList, urlParser.getValueOfKey(urlArgs, 'apiToken'))) 
                                            : (false)
        }

        /**
         * Check if provided API Token has given privilege
         */
        if (!l.has(urlArgs, 'apiToken')) {
            var privilege = 'guest'
            var premissionObj = l.find(apiTokenListObj, ['apiToken', 'null'])
            if (urlParser.getValueOfKey(urlArgs, 'zoom') < premissionObj.minZoom) {
                var apiTokenPrivilegeMsg = 'zoom level - Permissible value for Guest Usage is >= ' + premissionObj.minZoom
                var boolApiTokenPrivilege = false
            } else if (!l.includes(premissionObj.allowedThemeList, urlParser.getValueOfKey(urlArgs, 'themeNameVersion'))) {
                var apiTokenPrivilegeMsg = 'themeNameVersion - Permissible value for Guest Usage is ' + premissionObj.allowedThemeList
                var boolApiTokenPrivilege = false
            } else {
                var boolApiTokenPrivilege = true  
            }
        } else {
            var premissionObj = l.find(apiTokenListObj, ['apiToken', urlParser.getValueOfKey(urlArgs, 'apiToken')])
            if (typeof(premissionObj) == 'object') {
                var privilege = premissionObj.privilege
                if (urlParser.getValueOfKey(urlArgs, 'zoom') < premissionObj.minZoom) {
                    var apiTokenPrivilegeMsg = 'zoom level - Permissible value for current API Token is >= ' + premissionObj.minZoom
                    var boolApiTokenPrivilege = false
                } else if (premissionObj.allowedThemeList != '*' &&
                            !l.includes(premissionObj.allowedThemeList, urlParser.getValueOfKey(urlArgs, 'themeNameVersion'))) {
                    var apiTokenPrivilegeMsg = 'themeNameVersion - Permissible value for current API Token is ' + premissionObj.allowedThemeList
                    var boolApiTokenPrivilege = false
                } else {
                    var boolApiTokenPrivilege = true  
                }
            } else {
                var boolApiTokenPrivilege = false
            }
        }

        if (boolUniqueThemeIdentifier &&
            boolDataAggregate &&
            boolApiToken &&
            boolApiTokenPrivilege) 
            {
                return {
                    'bool': true,
                    'msg': privilege
                }

            } else {
                if (!boolUniqueThemeIdentifier) 
                    return {
                        'bool': false,
                        'msg': 'Error: Check params - Input value is ' + urlArgs['themeNameVersion'] + ', but valid values are ' + themeNameVersionList
                    }
                if (!boolDataAggregate) 
                    return {
                        'bool': false,
                        'msg': 'Error: Data Aggregation is wrong. Please consult documentation for valid format type'
                    }
                if (!boolApiToken) 
                    return {
                        'bool': false,
                        'msg': 'Error: Invalid API Token'
                    }
                if (!boolApiTokenPrivilege) 
                    return {
                        'bool': false,
                        'msg': 'Error: Forbidden Submit params - Check for ' + apiTokenPrivilegeMsg
                    }
            }
  
    } catch (e) {
        // throw new Error(e.message);
        console.log(error('Error - submitParamsDynamic() - > ' + e.message))
    }

}

function rawParams() {

    try {

        var {themeNameVersion,
            long,
            lat,
            dataAggregate} = joiFilter()

        return {
            options: {
                status: 400,
                statusText: msg.validationError
            },
            query: {
                themeNameVersion: themeNameVersion,
                long: long,
                lat: lat,
                dataAggregate: dataAggregate
            }
        }
        
    } catch (e) {
        console.log(error('Error - rawParams() - > ' + e.message))
    }

} 

async function rawParamsDynamic(dbClient, urlArgs) {
    try {

        var referenceDb = new ReferenceDb(dbClient); 
        var urlParser = new UrlParser();

        /**
         * Get all available unique theme identifiers from Db.
         * If params contain themeNameVersion key (which should be required), 
         * check if it's value is valid. Return true otherwise false. 
         */
        var themeNameVersionList = await referenceDb.getUniqueThemeIdentifier() 
        var boolUniqueThemeIdentifier = (l.has(urlArgs, 'themeNameVersion')) 
                                            ? (l.includes(themeNameVersionList, urlParser.getValueOfKey(urlArgs, 'themeNameVersion'))) 
                                            : (false)

        /**
         * Check if dataAggregate key exists or not.
         * If it does then check if it's valid one as defined in 
         * lib/proj4Extent(). 
         */
        var boolDataAggregate = (l.has(urlArgs, 'dataAggregate')) 
                                    ? ((typeof proj4Extent(urlParser.getValueOfKey(urlArgs, 'dataAggregate')[2]) !== "undefined") 
                                        ? (true) 
                                        : (false)) 
                                    : (false)

        if (boolUniqueThemeIdentifier &&
            boolDataAggregate) 
            {
                return {
                    'bool': true,
                    'msg': 'NA'
                }

            } else {
                if (!boolUniqueThemeIdentifier) 
                    return {
                        'bool': false,
                        'msg': 'Error: Check params - Input value is ' + urlArgs['themeNameVersion'] + ', but valid values are ' + themeNameVersionList
                    }
                if (!boolDataAggregate) 
                    return {
                        'bool': false,
                        'msg': 'Error: Data Aggregation is wrong. Please consult documentation for valid format type'
                    }
            }
        
    } catch (e) {
        console.log(error('Error - rawParamsDynamic() - > ' + e.message))
    }
}

function vectileParams() {

    try {

        var {themeNameVersion,
            apiToken,
            downloadLink} = joiFilter()

        return {
            options: {
                status: 400,
                statusText: msg.validationError
            },
            query: {
                themeNameVersion: themeNameVersion,
                apiToken: apiToken,
                downloadLink: downloadLink
            }
        }
        
    } catch (e) {
        console.log(error('Error - vectileParams() - > ' + e.message))
    }

} 

async function vectileParamsDynamic(dbClient, urlArgs) {
    try {
        var referenceDb = new ReferenceDb(dbClient); 
        var urlParser = new UrlParser();

        /**
         * Get all available unique theme identifiers from Db.
         * If params contain themeNameVersion key (which should be required), 
         * check if it's value is valid. Return true otherwise false. 
         */
        var themeNameVersionList = await referenceDb.getUniqueThemeIdentifier() 
        var boolUniqueThemeIdentifier = (l.has(urlArgs, 'themeNameVersion')) 
                                            ? (l.includes(themeNameVersionList, urlParser.getValueOfKey(urlArgs, 'themeNameVersion'))) 
                                            : (false)

        /**
         * Check valid API Token
         */
        var apiTokenListObj = await referenceDb.getApiTokenList()
        var apiTokenList = l.map(apiTokenListObj, 'apiToken')
        if (!l.has(urlArgs, 'apiToken')) {
            var boolApiToken = false // Guest user with no API Token cannot make Vector Tile request
        } else {
            var boolApiToken = (l.has(urlArgs, 'apiToken')) 
                                            ? (l.includes(apiTokenList, urlParser.getValueOfKey(urlArgs, 'apiToken'))) 
                                            : (false)
        }

        /**
         * Check if provided API Token has given privilege
         */
        if (!l.has(urlArgs, 'apiToken')) {
            var boolApiTokenPrivilege = false
        } else {
            var premissionObj = l.find(apiTokenListObj, ['apiToken', urlParser.getValueOfKey(urlArgs, 'apiToken')])
            if (typeof(premissionObj) == 'object') {
                var privilege = premissionObj.privilege
                if (privilege == 'superman') {
                    var boolApiTokenPrivilege = true
                } else {
                    var boolApiTokenPrivilege = false  
                }
            } else {
                var boolApiTokenPrivilege = false
            }
        }

        if (boolUniqueThemeIdentifier &&
            boolApiToken &&
            boolApiTokenPrivilege) 
            {
                return {
                    'bool': true,
                    'msg': privilege
                }

            } else {
                if (!boolUniqueThemeIdentifier) 
                    return {
                        'bool': false,
                        'msg': 'Error: Check params - Input value is ' + urlArgs['themeNameVersion'] + ', but valid values are ' + themeNameVersionList
                    }
                if (!boolApiToken) 
                    return {
                        'bool': false,
                        'msg': 'Error: Invalid or Missing API Token'
                    }
                if (!boolApiTokenPrivilege) 
                    return {
                        'bool': false,
                        'msg': 'Error: Forbidden Vector Tile Request'
                    }
            }
  
    } catch (e) {
        // throw new Error(e.message);
        console.log(error('Error - vectileParamsDynamic() - > ' + e.message))
    }

}

function infoParams() {

    try {

        var {items} = joiFilter()

        return {
            options: {
                status: 400,
                statusText: msg.validationError
            },
            query: {
                items: items
            }
        }
        
    } catch (e) {
        console.log(error('Error - infoParams() - > ' + e.message))
    }

}

function mbtileParams() {

    try {

        var {
            // themeName,
            z,
            x,
            y} = joiFilter()

        return {
            options: {
                status: 400,
                statusText: msg.validationError
            },
            query: {
                // themeName: themeName,
                z: z,
                x: x,
                y: y
            }
        }
        
    } catch (e) {
        console.log(error('Error - mbtileParams() - > ' + e.message))
    }

} 

async function mbtileParamsDynamic(dbClient, urlArgs) {
    try {

        var referenceDb = new ReferenceDb(dbClient); 
        var urlParser = new UrlParser();

        /**
         * Get all available unique theme identifiers from Db.
         * If params contain themeNameVersion key (which should be required), 
         * check if it's value is valid. Return true otherwise false. 
         */
        var themeNameVersionList = await referenceDb.getUniqueThemeIdentifier()
        var themeNameList = l.map(themeNameVersionList, (theme) => {return theme.substring(0, theme.lastIndexOf("v"))})
        console.log(themeNameVersionList, themeNameList);
        var boolUniqueThemeIdentifier = (l.has(urlArgs, 'themeName')) 
                                            ? (l.includes(themeNameList, urlParser.getValueOfKey(urlArgs, 'themeName'))) 
                                            : (false)

        if (boolUniqueThemeIdentifier) 
            {
                return {
                    'bool': true,
                    'msg': 'MbTiles for given theme exists'
                }

            } else {
                if (!boolUniqueThemeIdentifier) 
                    return {
                        'bool': false,
                        'msg': 'Error: Check params - Input value is ' + urlArgs['themeName'] + ', but valid values are ' + themeNameList
                    }
            }
  
    } catch (e) {
        // throw new Error(e.message);
        console.log(error('Error - mbtileParamsDynamic() - > ' + e.message))
    }

}

module.exports = {
    submitParams,
    submitParamsDynamic,
    rawParams,
    rawParamsDynamic,
    vectileParams,
    vectileParamsDynamic,
    infoParams,
    mbtileParams,
    mbtileParamsDynamic
}