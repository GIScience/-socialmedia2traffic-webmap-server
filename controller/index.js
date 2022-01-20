'use strict'

// Load `require` directives - external
const config = require('config'),
  fs = require('fs'),
  l = require('lodash'),
  clc = require("cli-color")
// Load `require` directives - internal
const msg = require('../utils/msg_list'),
  UrlValidator = require('../utils/url_validator/index'),
  CreateRequest = require('../microservices/src/create_request'),
  {getCurrentServerTime} = require('../utils/time_keeper'),
  StatusRequest = require('../microservices/src/status_request'),
  FileNamer = require('../utils/file_namer'),
  DownloadRequest = require('../microservices/src/download_request'),
  {workersManager} = require('../utils/workersManager'),
  ExecuteQuery = require('../microservices/src/execute_query')

var error = clc.red.bold,
  warn = clc.yellow,
  notice = clc.blue

const urlValidator = new UrlValidator();

// async function controllerSubmit(req, res) {
//   try {

//     /**
//      * Sample Query - 
//      * http://localhost:3003/api/v1.1/submit?themeNameVersion=sendaiHealthv0.0&apiToken=123abc&long=8.68&lat=49.413&zoom=7&dataAggregate=[1002, 1000, 3857]&rawData=False&rawCentroid=True&dataQuality=False&dataSource=False&dataFormat=["geojson","geotif"]
//      */

//     var urlArguments = (req.method == "GET") 
//                           ? (req.query) 
//                           : ((req.method == "POST") ? 
//                               (req.body) 
//                               : {})

//     var checkParamsDynamic = await urlValidator.getMethod().submitParamsDynamic(req.app.locals.db, urlArguments) // Check if dynamic params are all ok.
//     if (checkParamsDynamic.bool != true) {
//       return res.status(400).send({
//         statusHttp: 400,
//         send: checkParamsDynamic.msg
//       })
//     }

//     /**
//      * Check if query already processed 
//      * or under queue
//      * otherwise, submit new query
//      */
//     var createRequest = new CreateRequest(req.app.locals.db)
//     var apiEdhHitTime = getCurrentServerTime('ISO')
//     var submitQuery = await createRequest.submitQuery(urlArguments, checkParamsDynamic.msg, apiEdhHitTime) // Submit new query, or otherwise prvide previously submitted query status or download link

//     /**
//      * Execute Submit Query
//      */
//     var executeQuery = new ExecuteQuery(req.app.locals.db)
//     executeQuery.submitQuery()

//     return res.status(200).send(submitQuery)
    
//   } catch (e) { // Error here is the reject msg of first failed promise above.
//     console.log(error('Error - controllerSubmit() - > ' + e.message))
//     return res.status(500).send({
//       statusHttp: 500,
//       send: e.message
//     })
//   }
// }

// async function controllerRaw(req, res) {
//   try {

//     /**
//      * Sample Query - 
//      * http://localhost:3003/api/v1.1/raw?themeNameVersion=sendaiHealthv0.0&long=10.2088965&lat=50.325767&dataAggregate=[1002, 1000, 3857]
//      */

//     var urlArguments = (req.method == "GET") 
//                           ? (req.query) 
//                           : ((req.method == "POST") ? 
//                               (req.body) 
//                               : {})

//     var checkParamsDynamic = await urlValidator.getMethod().rawParamsDynamic(req.app.locals.db, urlArguments) // Check if dynamic params are all ok.
//     if (checkParamsDynamic.bool != true) {
//       return res.status(400).send({
//         statusHttp: 400,
//         send: checkParamsDynamic.msg
//       })
//     }

//     /**
//      * Execute Raw Query
//      */
//     var executeQuery = new ExecuteQuery(req.app.locals.db)
//     var rawPixelGeom = await executeQuery.rawPixelGeom(urlArguments)    

//     return res.status(200).send(rawPixelGeom)
    
//   } catch (e) {
//     console.log(error('Error - controllerRaw() - > ' + e.message))
//     return res.status(500).send({
//       statusHttp: 500,
//       send: e.message
//     })
//   }
// }

// async function controllerVectile(req, res) {
//   try {

//     /**
//      * Sample Query - 
//      * http://localhost:3003/api/v1.1/vectortile?themeNameVersion=sendaiHealthv0.0&apiToken=123abc&downloadLink=https://globalexposure.s3.eu-central-1.amazonaws.com/data-export/turkey-motorway.geojson
//      */

//     var urlArguments = (req.method == "GET") 
//                           ? (req.query) 
//                           : ((req.method == "POST") ? 
//                               (req.body) 
//                               : {})

//     var checkParamsDynamic = await urlValidator.getMethod().vectileParamsDynamic(req.app.locals.db, urlArguments) // Check if dynamic params are all ok.
//     if (checkParamsDynamic.bool != true) {
//       return res.status(400).send({
//         statusHttp: 400,
//         send: checkParamsDynamic.msg
//       })
//     }

//     /**
//      * Check if query already processed 
//      * or under queue
//      * otherwise, submit new query
//      */
//     var themeNameVersion = urlArguments.themeNameVersion
//     var themeName = themeNameVersion.substring(0, themeNameVersion.lastIndexOf("v"))
//     var urlArgumentsTheme = {'themeName': themeName}
//     var createRequest = new CreateRequest(req.app.locals.db)
//     var apiEdhHitTime = getCurrentServerTime('ISO')
//     var vecttileQueryBool = await createRequest.vectileQuery(urlArgumentsTheme, apiEdhHitTime) // Submit new vectile query and return true if indeed there was a new submission. Otherwise false

//     if (vecttileQueryBool == true) {
//       /**
//        * Execute Vectortile Query
//        */
//       var executeQuery = new ExecuteQuery(req.app.locals.db)
//       executeQuery.vectileQuery(urlArguments, apiEdhHitTime)

//       return res.status(200).send('Tile Generation Underway!')

//     } else {

//       return res.status(200).send('Tile Generation Already Underway!')
//     }
    
//   } catch (e) {
//     console.log(error('Error - controllerVectile() - > ' + e.message))
//     return res.status(500).send({
//       statusHttp: 500,
//       send: e.message
//     })
//   }
// }

// async function controllerInfo(req, res) {
//   try {

//     /**
//      * Sample Query - 
//      * http://localhost:3003/api/v1.1/info?items=["fullHarmoniserList", "queryColl", "vectileThemes", "pendingQueryColl"]
//      * 
//      * or 
//      * 
//      * http://localhost:3003/api/v1.1/info?themeNameVersion=sendaiAirportv0.0&bbox=[-180,-90,180,90]&zoom=1&dataAggregate=[100,100,3035]&rawData=True&rawCentroid=True&dataQuality=False&dataSource=False&dataFormat=["geojson"]
//      * 
//      */

//     var urlArguments = (req.method == "GET") 
//                           ? (req.query) 
//                           : ((req.method == "POST") ? 
//                               (req.body) 
//                               : {})

//     /**
//      * Execute Info Query
//      */
//     var executeQuery = new ExecuteQuery(req.app.locals.db)
//     var infoList = await executeQuery.infoQuery(urlArguments)  

//     return res.status(200).send(JSON.stringify(infoList))
    
//   } catch (e) {
//     console.log(error('Error - controllerInfo() - > ' + e.message))
//     return res.status(500).send({
//       statusHttp: 500,
//       send: e.message
//     })    
//   }
// }

async function controllerMbtile(req, res) {
  /**
   * Controller to handle mb tiles
   * URL Sample -
   * http://localhost:8081/api/v0.1/mbtile?z=10&x=270&y=390
   */
  try {

    var urlArguments = (req.method == "GET") 
                          ? (req.query) 
                          : ((req.method == "POST") ? 
                              (req.body) 
                              : {})

    /**
     * Execute MbTile Query
     */
    var maxZoomAllowed = config.get('server.mbTile.mbTileMaxZoom')
    var executeQuery = new ExecuteQuery(req.app.locals.db)
    executeQuery.getmbTile(urlArguments, maxZoomAllowed)
      .then((tile) => {

        if (tile == undefined) {

          res.set({
            'Access-Control-Allow-Origin': '*',
          })
          return res.status(204).send()
        }

        res.set({
          'Content-Type': 'application/protobuf',
          'Access-Control-Allow-Origin': '*',
          'Content-Encoding': 'gzip'
        })
        return res.status(200).send(tile)

      })
      .catch((err) => {

        res.set({
          'Access-Control-Allow-Origin': '*',
        })
        return res.status(204).send()
      })

  } catch (e) { 

    console.log(error('Error - controllerMbtile() - > ' + e.message))
    return res.status(500).send({
      statusHttp: 500,
      send: e.message
    })
  }

}

module.exports = {
  // controllerSubmit,
  // controllerRaw,
  // controllerVectile,
  // controllerInfo,
  controllerMbtile
}