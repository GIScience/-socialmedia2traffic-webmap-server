'use strict'

// Load `require` directives - external
const randomString = require("randomstring"),
    fg = require('fast-glob'),
    path = require('path'),
    clc = require("cli-color")
// Load `require` directives - internal
const appRoot = require('app-root-path'),
    config = require('config'),
    UrlParser = require('./url_parser')

var error = clc.red.bold,
    warn = clc.yellow,
    notice = clc.blue

class FileNamer {
    /**
     * Class to generate file names per styling
     * guide - 
     * https://gitlab.com/jrc_osm/edh_server/issues/9
     */
    constructor() {
        this.urlParser = new UrlParser() 
    }

    getOhsomeFileName(keyvalue) {

        try {

            let key = keyvalue['key']
            let val = (keyvalue['value'] == '*') 
                        ? ('all') 
                        : (keyvalue['value'])

            let subString = `ohsome_${key}-${val}_`
            let randInt = randomString.generate({
                length: 50-subString.length, // Assures almost constant file length
                charset: 'numeric'
            })

            let fileName = `${appRoot}/${config.get('server.tmpDir')}/${config.get('server.tmpDirDwn')}/${subString}${randInt.toString()}.geojson` // Format is 'ohsome_key-value_randInt.geojson'

            return fileName
            
        } catch (e) {
            console.log(error('Error - getOhsomeFileName() - > ' + e.message))
        }

    }

    dwnDir() {

        try {

            return `${appRoot}/${config.get('server.tmpDir')}/${config.get('server.tmpDirDwn')}`// Download dir path
            
        } catch (e) {
            console.log(error('Error - dwnDir() - > ' + e.message))
        }

    }

    dwnFilesList() {

        try {

            var filesList = fg.sync(path.join(this.dwnDir(), 'ohsome_**.geojson'), { onlyFiles: false, deep: 1 }) // Get list of downloaded ohsome files
            return filesList
            
        } catch (e) {
            console.log(error('Error - dwnFilesList() - > ' + e.message))
        }

    }

    themeDirs(themeDir) {

        try {

            var filesList = fg.sync(`${themeDir}/**`, { onlyFiles: false, deep: 1 }) // Get list of all under process dirs i.e. requests
            return filesList
            
        } catch (e) {
            console.log(error('Error - themeDirs() - > ' + e.message))
        }

    }

    numDirInTheme(processDir, themeName) {
        try {

            var filesList = fg.sync(`${processDir}/${themeName}/**`, { onlyFiles: false, deep: 1 }) // Get list of all under process dirs i.e. requests
            return filesList
            
        } catch (e) {
            console.log(error('Error - numDirInTheme() - > ' + e.message))
        }
    }

    processFilesList() {

        try {

            var filesList = fg.sync(`${appRoot}/${config.get('server.tmpDir')}/${config.get('server.tmpDirProcess')}/**`, { onlyFiles: false, deep: 1 }) // Get list of all under process dirs i.e. requests
            return filesList
            
        } catch (e) {
            console.log(error('Error - processFilesList() - > ' + e.message))
        }

    }

    pixelIdFilesList(submitId, origin, format) {

        try {

            var filesList = fg.sync(`${appRoot}/${config.get('server.tmpDir')}/${config.get('server.tmpDirProcess')}/${submitId}/${submitId}-${origin}**.${format}`, { onlyFiles: false, deep: 1 }) // Get list of pixelID files
            return filesList
            
        } catch (e) {
            console.log(error('Error - pixelIdFilesList() - > ' + e.message))
        }

    }

    requestCacherDir() {

        try {

            return `${appRoot}/${config.get('server.tmpDir')}/${config.get('server.urlCacher.root')}/${config.get('server.urlCacher.requestCacher')}`
            
        } catch (e) {
            console.log(error('Error - requestCacherDir() - > ' + e.message))
        }

    }

    tmpDirs() {

        try {

            return [
                `${appRoot}/${config.get('server.tmpDir')}/${config.get('server.urlCacher.root')}/${config.get('server.urlCacher.requestCacher')}/*`,
                `${appRoot}/${config.get('server.tmpDir')}/${config.get('server.urlCacher.root')}/${config.get('server.urlCacher.exportCacher')}/*`,
                `${appRoot}/${config.get('server.tmpDir')}/${config.get('server.tmpDirDwn')}/*`,
                `${appRoot}/${config.get('server.tmpDir')}/${config.get('server.tmpDirProcess')}/*`
            ]
            
        } catch (e) {
            console.log(error('Error - tmpDirs() - > ' + e.message))
        }

    }

    cacheFileDir() {

        try {

            return `${appRoot}/${config.get('server.tmpDir')}/${config.get('server.urlCacher.root')}/${config.get('server.urlCacher.exportCacher')}/`
            
        } catch (e) {
            console.log(error('Error - cacheFileDir() - > ' + e.message))
        }

    }

    processRollbackFilesAndDirs(submitId, urlArguments){

        try {

            return [
                `${appRoot}/${config.get('server.tmpDir')}/${config.get('server.tmpDirProcess')}/${submitId}*`
            ]
            
        } catch (e) {
            console.log(error('Error - processRollbackFilesAndDirs() - > ' + e.message))
        }

    }

    processFileOrDirPath(submitId, type, origin, format) {

        try {

            switch (type) {
                case 'dir':
                    return `${appRoot}/${config.get('server.tmpDir')}/${config.get('server.tmpDirProcess')}/${submitId}/`
                case 'file':
                    return `${appRoot}/${config.get('server.tmpDir')}/${config.get('server.tmpDirProcess')}/${submitId}/${submitId}-${origin}.${format}`
                case 'file-crs':
                    return `${appRoot}/${config.get('server.tmpDir')}/${config.get('server.tmpDirProcess')}/${submitId}/${submitId}-${origin}-crs.${format}`
                case 'exportdir':
                    return `${appRoot}/${config.get('server.tmpDir')}/${config.get('server.tmpDirProcess')}/${submitId}`
            }
            
        } catch (e) {
            console.log(error('Error - processFileOrDirPath() - > ' + e.message))
        }

    }

    processExportFileOrDirPath(submitId, urlArguments, apiEdhHitTime, type, source) {

        try {

            /**
             * Custom Name - 2020-4-13_sendaiAirportv0-0_10001x-10001y_EPSG-3857_aggregation-count
             */
            var apiEdhHitTime = new Date(apiEdhHitTime);
            
            apiEdhHitTime = apiEdhHitTime.getFullYear()+'-'+("0"+(apiEdhHitTime.getMonth() + 1)).slice(-2)+'-'+("0"+apiEdhHitTime.getDate()).slice(-2) // Get Date only in YYYY-MM-DD
            
            var themeNameVersion = this.urlParser.getValueOfKey(urlArguments, 'themeNameVersion').replace(/\./g,'-')

            var dataAggregate = this.urlParser.getValueOfKey(urlArguments, 'dataAggregate')
            var resolutionMeters = (dataAggregate[0]+'x-'+dataAggregate[1]+'y').replace(/\./g,'-')
            var projectionEPSG = 'EPSG-'+dataAggregate[2]
            var submitId = submitId

            var basePath = `${appRoot}/${config.get('server.tmpDir')}/${config.get('server.tmpDirProcess')}` // Base path
            var customName = `${apiEdhHitTime}_${themeNameVersion}_${resolutionMeters}_${projectionEPSG}` // Custom export name. Detail - https://gitlab.com/jrc_osm/edh_server/issues/9

            /**
             * Custom Name New (considering tile id) 
             * - Sendai-Education-v1-250m-EPSG3857-Count-20200420-Tile001
             */
            var apiEdhHitTimeNew = new Date(apiEdhHitTime);
            apiEdhHitTimeNew = apiEdhHitTimeNew.getFullYear()+''+("0"+(apiEdhHitTimeNew.getMonth() + 1)).slice(-2)+''+("0"+apiEdhHitTimeNew.getDate()).slice(-2) // Get Date only in YYYY-MM-DD
            var themeNameVersionNew = this.urlParser.getValueOfKey(urlArguments, 'themeNameVersion').replace(/\./g,'')
            themeNameVersionNew = themeNameVersionNew.charAt(0).toUpperCase() + themeNameVersionNew.slice(1)
            var resolutionUnitNew = dataAggregate[0]+'unit'
            var projectionEPSGNew = 'EPSG'+dataAggregate[2]

            /**
             * Tile Id
             */
            var coord = urlArguments['tileGeom']['tileGeom']['coordinates']
            var z = urlArguments['tileGeom']['zoom']
            var x = Math.round((coord[0][0][0] + coord[0][2][0]) / 2)
            var y = Math.round((coord[0][0][1] + coord[0][2][1]) / 2)
            if (x < 0) {
                x = Math.abs(x)
                var xStr = x.toString().padStart(3, "0")
                xStr = 'w' + xStr
            } else {
                var xStr = x.toString().padStart(3, "0")
                xStr = 'e' + xStr
            }
            if (y < 0) {
                y = Math.abs(y)
                var yStr = y.toString().padStart(2, "0")
                yStr = 's' + yStr
            } else {
                var yStr = y.toString().padStart(2, "0")
                yStr = 'n' + yStr
            }
            var tileIDInt = 'z' + z + '' + xStr + '' + yStr
            var tileIDNew = 'Tile'+tileIDInt
            var customNameNew = `theme${themeNameVersionNew}-Res${resolutionUnitNew}-Proj${projectionEPSGNew}-ITEM-Date${apiEdhHitTimeNew}-${tileIDNew}` // Custom export name including tile ids. Detail - https://gitlab.com/jrc_osm/edh_server/issues/9

            switch (type+source) {
                case 'geojsonosm':
                    return `${basePath}/${submitId}/${customName}_src-osm.geojson`
                case 'shposm':
                    return `${basePath}/${submitId}/${customName}_src-osm.shp`
                case 'tifosm':
                    return `${basePath}/${submitId}/${customName}_src-osm.tif`
                case 'geojsonaggre':
                    return `${basePath}/${submitId}/${customName}_aggregation.geojson`
                case 'geojsontmpaggre':
                    return `${basePath}/${submitId}/${customName}_aggregation-tmp.geojson`
                case 'geojsonpixeltmpaggre':
                    return `${basePath}/${submitId}/${customName}_aggregation-pixel-tmp.geojson`
                case 'shpaggredir':
                    return `${basePath}/${submitId}/${customName}_aggregation-shp.zip`
                case 'shpaggre':
                    return `${basePath}/${submitId}/${customName}_aggregation`
                case 'kmlaggre':
                    return `${basePath}/${submitId}/${customName}_aggregation.kml`
                case 'geotifaggre':
                    // return `${basePath}/${submitId}/${customName}_aggregation-tif/${customName}_aggregation-.tif`
                    return `${basePath}/${submitId}/${customName}_aggregation-tif/${customNameNew}.tif`
                case 'gpkgaggre':
                    return `${basePath}/${submitId}/${customName}_aggregation.gpkg`
                case 'geotifdir':
                    return `${basePath}/${submitId}/${customName}_aggregation-tif`

                case 'dirnull':
                    return `${basePath}/${submitId}/${customName}_${submitId}`
                case 'dirzip':
                    return `${basePath}/${submitId}/${customNameNew}.zip`
                case 'geojsonosmexport':
                    return `${basePath}/${submitId}/${customName}_${submitId}/${customNameNew}.geojson`
                case 'geojsonaggreexport':
                    return `${basePath}/${submitId}/${customName}_${submitId}/${customNameNew}.geojson`
                case 'shpaggreexport':
                    return `${basePath}/${submitId}/${customName}_${submitId}/${customNameNew}`
                case 'kmlaggreexport':
                    return `${basePath}/${submitId}/${customName}_${submitId}/${customNameNew}.kml`
                case 'gpkgaggreexport':
                    return `${basePath}/${submitId}/${customName}_${submitId}/${customNameNew}.gpkg`
                case 'geotifaggreexport':
                    return `${basePath}/${submitId}/${customName}_${submitId}/${customNameNew}.zip`
            }
            
        } catch (e) {
            console.log(error('Error - processExportFileOrDirPath() - > ' + e.message))
        }

    }

    downloadNotReadyZip() {

        try {

            return `${appRoot}/${config.get('server.refDir')}/${config.get('server.downloadZipNotReadyZip')}`

        } catch (e) {
            console.log(error('Error - downloadNotReadyZip() - > ' + e.message))
        }

    }

    downloadErrorZip() {

        try {

            return `${appRoot}/${config.get('server.refDir')}/${config.get('server.downloadErrorZip')}`

        } catch (e) {
            console.log(error('Error - downloadErrorZip() - > ' + e.message))
        }

    }

    exportZipFile(exportFileName) {

        try {

            return `${appRoot}/${config.get('server.tmpDir')}/${config.get('server.urlCacher.root')}/${config.get('server.urlCacher.exportCacher')}/${exportFileName}`
            
        } catch (e) {
            console.log(error('Error - exportZipFile() - > ' + e.message))
        }

    }

}

module.exports = FileNamer