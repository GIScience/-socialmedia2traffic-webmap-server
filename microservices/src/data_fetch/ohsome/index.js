'use strict'

// Load `require` directives - external
const l = require('lodash'),
    clc = require("cli-color"),
    del = require('del'),
    execSync = require('child_process').execSync
// Load `require` directives - internal

const {newFetchBool,
    getOSMData,
    pushOSMData,
    rollbackOSMData,
    newTileDownloads,
    tmpMergeTile2RowFile,
    txt2Mongo,
    updateDownloadTiles} = require('./_internal'),
    LogDb = require('../../../../db/mongo/src/logdb_connect'),
    ReferenceDb = require('../../../../db/mongo/src/referencedb_connect')

var error = clc.red.bold,
    warn = clc.yellow,
    notice = clc.blue

class OhsomeUpdateDb {
    /**
     * Class to fetch Ohsome data to database
     */

    constructor(dbClient, fileNamer) {
        this.dbClient = dbClient
        this.fileNamer = fileNamer
    }

    async updateLatest(geoDataFetchTime) {

        /**
         * The whole process of data download to
         * data insert. 
         */
        
        try {

            var logDb = new LogDb(this.dbClient);

            var {fetchBool, ohsomeLatestDataTime} = await newFetchBool(logDb)

            if (fetchBool) {
                var referenceDb = new ReferenceDb(this.dbClient); 
                var fwDataSource = await referenceDb.getFwDataSource()
                var osmKeysValues = l.find(fwDataSource, { origin: 'openstreetmap'})['keyval'] // Get OSM Key Values from framework_harmoniser.json
                
                var osmDataDownloadBool = await getOSMData(osmKeysValues, this.dbClient, geoDataFetchTime, this.fileNamer, ohsomeLatestDataTime) // Get boolean on weather downloaded OSM Data from Ohsome should be inserted to Db or not.

                if (osmDataDownloadBool) {
                    /**
                     * Verify all downloaded data for valid Geojson. 
                     * If found any invalid, do not proceed 
                     * to insert into Db.
                     */
                    var osmDataPushBool = await pushOSMData(this.fileNamer, this.dbClient, ohsomeLatestDataTime) // Push OSM Data into Db.

                    if (osmDataPushBool) {
                        logDb.putFetchAttempt(geoDataFetchTime, 'success', ohsomeLatestDataTime, 'All Done :)') // Update fetch log for recent fetch attempt. Contains fetch attempt for all data sources like OSM, GHSL etc.
                    } else {
                        logDb.putFetchAttempt(geoDataFetchTime, 'failure', ohsomeLatestDataTime, 'Data push failed :(') 
                    }

                } else {
                    logDb.putFetchAttempt(geoDataFetchTime, 'failure', ohsomeLatestDataTime, 'Data download failed :(')
                }

                await rollbackOSMData(this.fileNamer) // Delete downloaded Ohsome files

            }
            return
            
        } catch (e) {
            console.log(error('Error - updateLatest() - > ' + e.message))
        }
    }



    async updateDiff(submitId, dataDb, logDb, tiles, keyval, ohsomeDataTime) {
        try {

            /**
             * Check if tile for given key of given
             * data already downloaded or not
             */
            var newTileDownloadsList = await newTileDownloads(logDb, tiles, keyval, ohsomeDataTime) // Returns tile, key-val, start date, end date that needs to be downloaded

            /**
             * Download tiles for first fetch 
             * or to update existing ones
             */
            if (newTileDownloadsList.length > 0) {
                var getOSMDataRes = await getOSMData(logDb, newTileDownloadsList, this.fileNamer)
                var downloadFileNamesListAll = getOSMDataRes.downloadFileNamesListAll
                var fetchedTilesListAll = getOSMDataRes.fetchedTilesListAll

                /**
                 * Merge downloaded tiles
                 * into one single txt
                 */
                var tmpTxtTileMerged = this.fileNamer.dwnDir() + '/' + submitId + '.txt'
                await tmpMergeTile2RowFile(tmpTxtTileMerged, downloadFileNamesListAll)
                del.sync(downloadFileNamesListAll, {force: true}) // Delete files

                /**
                 * Remove duplicate features
                 */
                var tmpTxtTileMergedWODup = this.fileNamer.dwnDir() + '/' + submitId + '-woDup.txt'
                execSync('sort -u ' + tmpTxtTileMerged + ' > ' + tmpTxtTileMergedWODup)
                del.sync([tmpTxtTileMerged], {force: true}) // Delete file

                /**
                 * Insert features to Mongo - 
                 * Check each feature if it exists or not
                 * Update if yes, otherwise insert
                 */
                await txt2Mongo(dataDb, tmpTxtTileMergedWODup)
                del.sync([tmpTxtTileMergedWODup], {force: true}) // Delete file

                /**
                 * Update log
                 */
                await updateDownloadTiles(logDb, fetchedTilesListAll, 'success')

            } 

            return 
            
        } catch (e) {
            console.log(error('Error - updateDiff() - > ' + e.message))
        }
    }

}

module.exports = OhsomeUpdateDb