'use strict'

// Load `require` directives - external
const express = require('express'),
    router = express.Router(),
    validate = require('express-validation')
// Load `require` directives - internal
const UrlValidator = require('../utils/url_validator/index'),
    {controllerSubmit, 
    controllerRaw,
    controllerVectile,
    controllerInfo,
    controllerMbtile} = require('../controller'),
    route = require('../utils/http_route'),
    config = require('config'),
    {memCacheSend,
    flatCacheDownload} = require('../utils/http_cacher')

const urlValidator = new UrlValidator(); 

function errResponse(err, req, res, next) { // req and next arguments are needed, although not being used.
    res.setHeader('Content-Type', 'application/json');
    res.status(400);
    res.send(JSON.stringify(err));
}

// Submit Controller for GET methods. Validator is being called only once during Server initialisation.
// router.get(route.submitRoute, 
//     memCacheSend(config.get('server.memCacheSubmitTimeoutSec')), // After a while old response has to get deleted as new data might have been downloaded meanwhile. It has to be a long time period depending upon data fetch cron.
//     validate(urlValidator.getMethod().submitParams()),
//     controllerSubmit, 
//     errResponse)

// Raw Controller for GET methods. Validator is being called only once during Server initialisation. 
// router.get(route.rawRoute, 
//     memCacheSend(config.get('server.memCacheRawTimeoutSec')), // Timeout server.memCacheRawTimeoutSec is in seconds.
//     validate(urlValidator.getMethod().rawParams()), 
//     controllerRaw, 
//     errResponse)
    
// Vector Tile Controller for GET methods. Validator is being called only once during Server initialisation. 
// router.get(route.vectileRoute, 
//     memCacheSend(config.get('server.memCacheVectileTimeoutSec')), // Timeout server.memCacheVectileTimeoutSec is in seconds.
//     validate(urlValidator.getMethod().vectileParams()), 
//     controllerVectile, 
//     errResponse)

// Info Controller for GET methods. Validator is being called only once during Server initialisation. 
// router.get(route.infoRoute, 
//     memCacheSend(config.get('server.memCacheInfoTimeoutSec')), // Timeout server.memCacheInfoTimeoutSec is in seconds.
//     validate(urlValidator.getMethod().infoParams()), 
//     controllerInfo, 
//     errResponse)

// MbTile Controller for GET methods. Validator is being called only once during Server initialisation. 
router.get(route.mbtileRoute, 
    memCacheSend(config.get('server.memCacheMbtileTimeoutSec')), // Timeout server.memCacheMbtileTimeoutSec is in seconds.
    // validate(urlValidator.getMethod().mbtileParams()), 
    controllerMbtile, 
    errResponse)

module.exports = {
    router
}
