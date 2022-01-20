'use strict'

// Load `require` directives - external
const clc = require("cli-color"),
  l = require('lodash')
// Load `require` directives - internal
const OhsomeUpdateDb = require('./ohsome')

var error = clc.red.bold,
    warn = clc.yellow,
    notice = clc.blue

function dataFetch(dbClient, geoDataFetchTime, fileNamer) {

  try {

    return new Promise((res, rej) => {
      var ohsomeUpdateDb = new OhsomeUpdateDb(dbClient, fileNamer); 

      /**
       * All Other Data Sources will come above
       */

      var allDataSources = [
        ohsomeUpdateDb.updateLatest(geoDataFetchTime)
      ]

      /**
       * // Resolve here no matter whether data fetch 
       * succeeded or not. Otherwise next fetch event 
       * won't trigger. Consult server.js for more. 
       */
      Promise.all(allDataSources)
        .then((r) => 
          res('Data Fetch event attempted, Successfully')
        )
        .catch((e) => {
          res('Data Fetch event attempted, with ERROR! >' + e.message)
        })

    })
    
  } catch (e) {
    console.log(error('Error - dataFetch() - > ' + e.message))
  }
    
}

function dataFetchTiles(dbClient, submitId, dataDb, logDb, fileNamer, tiles, fwDataSource, ohsomeDataTime) {
  try {

    return new Promise((res, rej) => {
      var ohsomeUpdateDb = new OhsomeUpdateDb(dbClient, fileNamer); 

      /**
       * OSM Download
       */
      var keyval = l.find(fwDataSource, ['origin', 'openstreetmap']);
      var allDataSources = [
        ohsomeUpdateDb.updateDiff(submitId, dataDb, logDb, tiles, keyval, ohsomeDataTime)
      ]
    
      /**
       * Other data sources download should go here
       */

      /**
       * // Resolve here no matter whether data fetch 
       * succeeded or not. Otherwise next fetch event 
       * won't trigger. Consult server.js for more. 
       * Return download status
       */
      Promise.all(allDataSources)
        .then((r) => 
          res(true)
        )
        .catch((e) => {
          res(false)
        })

    })
    
  } catch (e) {
    console.log(error('Error - dataFetchTiles() - > ' + e.message))
  }
}

module.exports = {
    dataFetch,
    dataFetchTiles
}