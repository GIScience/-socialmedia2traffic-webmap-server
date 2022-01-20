'use strict'

// Load `require` directives - external
const fs = require('fs'),
    fsExtra = require('fs-extra'),
    fg = require('fast-glob'),
    archiver = require('archiver'),
    path = require('path'),
    l = require('lodash'),
    unzipper = require('unzipper'),
    clc = require("cli-color"),
    shell = require('shelljs'),
    exec = require('child_process').exec,
    config = require('config')
// Load `require` directives - internal
const FileNamer = require('../../../utils/file_namer')

var error = clc.red.bold,
    warn = clc.yellow,
    notice = clc.blue

async function exportResult(submitId, urlArguments, urlParser, fwExposure) {
    try {
        var fileNamer = new FileNamer()
        var apiEdhHitTime = urlArguments['ohsomeDataTime']
        var exportDir = fileNamer.processExportFileOrDirPath(submitId, urlArguments, apiEdhHitTime, 'dir', null) 

        fs.mkdirSync(exportDir) // Generate output dir path

        /**
         * Possible osm raw export file
         */
        var fileNameRawData = fileNamer.processExportFileOrDirPath(submitId, urlArguments, apiEdhHitTime, 'geojson', 'osm')
        if (fs.existsSync(fileNameRawData)) {
            /**
             * Old naming - customName in file_namer.js
             */

            /**
             * New naming - customNameNew including tile id in file_namer.js
             */
            var trg = fileNamer.processExportFileOrDirPath(submitId, urlArguments, apiEdhHitTime, 'geojson', 'osmexport')
            trg = trg.replace("ITEM", 'Raw')
            
            fsExtra.copySync(fileNameRawData, trg) 
        }

        // ****************** Other Raw Data Source Exports will go above *******

        /**
         * Possible aggregation export file Geojson
         */
        var fileNameAggreDataGeoJSON = fileNamer.processExportFileOrDirPath(submitId, urlArguments, apiEdhHitTime, 'geojson', 'aggre')
        if (fs.existsSync(fileNameAggreDataGeoJSON) && urlArguments.dataFormat.indexOf("geojson")>-1) {

            /**
             * New naming - customNameNew including tile id in file_namer.js
             */
            var item = fwExposure[0].uniqueSourceIdentifier
            item = item.charAt(0).toUpperCase() + item.slice(1)
            var trg = fileNamer.processExportFileOrDirPath(submitId, urlArguments, apiEdhHitTime, 'geojson', 'aggreexport')
            trg = trg.replace("ITEM", item)

            fsExtra.copySync(fileNameAggreDataGeoJSON, trg)
        }

        var fileNameAggreDataShp = fileNamer.processExportFileOrDirPath(submitId, urlArguments, apiEdhHitTime, 'shp', 'aggre')
        if (fs.existsSync(fileNameAggreDataShp + '.shp')) {

            var base = fileNamer.processExportFileOrDirPath(submitId, urlArguments, apiEdhHitTime, 'shp', 'aggreexport')

            var item = fwExposure[0].uniqueSourceIdentifier
            item = item.charAt(0).toUpperCase() + item.slice(1)

            var input = fileNameAggreDataShp + '.shp'
            var output = base + '.shp'
            output = output.replace("ITEM", item)
            fsExtra.copySync(input, output)

            var input = fileNameAggreDataShp + '.dbf'
            var output = base + '.dbf'
            output = output.replace("ITEM", item)
            fsExtra.copySync(input, output)

            var input = fileNameAggreDataShp + '.prj'
            var output = base + '.prj'
            output = output.replace("ITEM", item)
            fsExtra.copySync(input, output)

            var input = fileNameAggreDataShp + '.shx'
            var output = base + '.shx'
            output = output.replace("ITEM", item)
            fsExtra.copySync(input, output)

        }

        var fileNameAggreDataKml = fileNamer.processExportFileOrDirPath(submitId, urlArguments, apiEdhHitTime, 'kml', 'aggre')
        if (fs.existsSync(fileNameAggreDataKml)) {
            var item = fwExposure[0].uniqueSourceIdentifier
            item = item.charAt(0).toUpperCase() + item.slice(1)
            var trg = fileNamer.processExportFileOrDirPath(submitId, urlArguments, apiEdhHitTime, 'kml', 'aggreexport')
            trg = trg.replace("ITEM", item)
            fsExtra.copySync(fileNameAggreDataKml, trg)
        }

        var fileNameAggreDataGpkg = fileNamer.processExportFileOrDirPath(submitId, urlArguments, apiEdhHitTime, 'gpkg', 'aggre')
        if (fs.existsSync(fileNameAggreDataGpkg)) {
            var item = fwExposure[0].uniqueSourceIdentifier
            item = item.charAt(0).toUpperCase() + item.slice(1)
            var trg = fileNamer.processExportFileOrDirPath(submitId, urlArguments, apiEdhHitTime, 'gpkg', 'aggreexport')
            trg = trg.replace("ITEM", item)
            fsExtra.copySync(fileNameAggreDataGpkg, trg)
        }

        var fileNameAggreDataGeotifDir = fileNamer.processExportFileOrDirPath(submitId, urlArguments, apiEdhHitTime, 'geotif', 'dir')
        if (fs.existsSync(fileNameAggreDataGeotifDir)) {
            var fileNameList = fs.readdirSync(fileNameAggreDataGeotifDir)
            l.map(fileNameList, (file) => {
                fsExtra.moveSync(fileNameAggreDataGeotifDir + '/' + file, exportDir + '/' + file)
            })
        }

        // ****************** Other Aggregation Exports formats will go above *******

        /**
         * Prepare Export
         */
        var exportFiles = fg.sync(path.join(exportDir, '**.**'), { onlyFiles: false, deep: 1 }) // Get list of export ready files

        if (exportFiles.length > 1) {

            /**
             * Prepare Zip
             */

            /**
             * New naming - customNameNew including tile id in file_namer.js
             */
            var item = fwExposure[0].uniqueSourceIdentifier
            item = item.charAt(0).toUpperCase() + item.slice(1)
            var outputZip = fileNamer.processExportFileOrDirPath(submitId, urlArguments, apiEdhHitTime, 'dir', 'zip')
            outputZip = outputZip.replace("ITEM", item)
            
            var outStream = fs.createWriteStream(outputZip)
            outStream.writable = true;
            var archive = archiver('zip', {
                zlib: { level: 9 } // Sets the compression level. Maximum I assume.
            });

            archive.directory(exportDir, false)
                    .on('error', e => reject(e))
                    .pipe(outStream)
                    
            archive.finalize()

            return new Promise((res, rej) => {
                /**
                 * Promises needed to properly close 
                 * outStream by res().
                 * Note: Async Return does not mean 
                 * will be returned after resolve
                 * kind of status. If not explicit 
                 * Promise is returned, async return 
                 * a wrapped up Promise which is different 
                 * from just "return". 
                 * Best is to use Async with Try/Catch
                 * with lots of Awaits and one final 
                 * Return where explicits that a new Promise()
                 * is returned.
                 */
                outStream.on('close', function() {
                    /**
                     * Move to S3 bucket
                     * AWS_ACCESS_KEY_ID=xxx AWS_SECRET_ACCESS_KEY=xxx1 aws s3 cp /Users/zzz/code/heigit/jrc/edh_server/tmp/process_core/5f5734818ef2c47dd34f7bf2/SendaiHealthv00-1002m-EPSG3857-Count-20200629-Tile7010049.zip s3://globalexposure/data-export/ --acl public-read
                     */ 
                    var awsAccessKeyId = config.get('aws.AWS_ACCESS_KEY_ID')
                    var awsSecretAccessKey = config.get('aws.AWS_SECRET_ACCESS_KEY')
                    var s3DataExportBucket = config.get('aws.s3Bucket') + '/' + config.get('aws.dataExportFolder') + '/'
                    var cmd = 'AWS_ACCESS_KEY_ID=' + awsAccessKeyId + ' AWS_SECRET_ACCESS_KEY=' + awsSecretAccessKey + ' aws s3 cp ' + outputZip + ' s3://' + s3DataExportBucket + ' --acl public-read'

                    exec(cmd, (e) => {
                        if (e) {
                            rej(console.log(error('Error - exportResult() - > ' + e.message)))
                        }
                        var exportFileName = path.basename(outputZip)
                        var stats = fs.statSync(outputZip)
                        var fileSizeInBytes = stats["size"]
                        var fileSizeInMb = Math.round(fileSizeInBytes/1000000)
                        res({
                            'fileName': exportFileName,
                            'fileSizeMb': fileSizeInMb
                        })
                    })

                })
                .on('error', (e) => {
                    rej(console.log(error('Error - exportResult() - > ' + e.message)))
                })
            })

        } else if (exportFiles.length == 1) {

            return new Promise((res, rej) => {
                try {
                    var exportFileName = fileNamer.processExportFileOrDirPath(submitId, urlArguments, apiEdhHitTime, 'dir', null)
                    var exportFileExtension = path.extname(exportFiles[0])
                    
                    fsExtra.copySync(exportFiles[0], exportFileName+exportFileExtension)
          
                    /**
                     * Move to S3 bucket
                     * AWS_ACCESS_KEY_ID=xxx AWS_SECRET_ACCESS_KEY=xxx1 aws s3 cp /Users/zzz/code/heigit/jrc/edh_server/tmp/process_core/5f5734818ef2c47dd34f7bf2/SendaiHealthv00-1002m-EPSG3857-Count-20200629-Tile7010049.zip s3://globalexposure/data-export/ --acl public-read
                     */ 
                    var awsAccessKeyId = config.get('aws.AWS_ACCESS_KEY_ID')
                    var awsSecretAccessKey = config.get('aws.AWS_SECRET_ACCESS_KEY')
                    var s3DataExportBucket = config.get('aws.s3Bucket') + '/' + config.get('aws.dataExportFolder') + '/'
                    var cmd = 'AWS_ACCESS_KEY_ID=' + awsAccessKeyId + ' AWS_SECRET_ACCESS_KEY=' + awsSecretAccessKey + ' aws s3 cp ' + exportFiles[0] + ' s3://' + s3DataExportBucket + ' --acl public-read'

                    exec(cmd, (e, stdout, stderr) => {
                        if (e) {
                            rej(console.log(error('Error - exportResult() - > ' + e.message)))
                        }
                        var exportFileName = path.basename(exportFiles[0])
                        var stats = fs.statSync(exportFiles[0])
                        var fileSizeInBytes = stats["size"]
                        var fileSizeInMb = Math.round(fileSizeInBytes/1000000)
                        res({
                            'fileName': exportFileName,
                            'fileSizeMb': fileSizeInMb
                        })
                    })
                } catch (e) {
                    rej(console.log(error('Error - exportResultlength1() - > ' + e.message)))
                }
            })
            
        } else {

            return new Promise((res, rej) => {
                try {
                    res()
                } catch (e) {
                    rej(console.log(error('Error - exportResultlengthNaN() - > ' + e.message)))
                }
            })

        }
  
    } catch (e) {
        console.log(error('Error - exportResult() - > ' + e.message))
    }
}

module.exports = {
    exportResult
}