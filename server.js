'use strict'

// Load `require` directives - external
const express = require('express'),
    os = require('os'),
    app = express(),
    net = require('net'),
    clc = require("cli-color"),
    bodyParser = require('body-parser'),
    config = require('config'),
    morgan = require('morgan'),
    CronJob = require('cron').CronJob,
    pretty = require('express-prettify'),
    del = require('del'),
    cors = require('cors'),
    execSync = require('child_process').execSync,
    randomString = require("randomstring")
// Load `require` directives - internal
const {router} = require('./router'),
    msg = require('./utils/msg_list'),
    {dbClient} = require('./db/mongo/src'),
    winston = require('./utils/winston_logger'),
    {dataFetch} = require('./microservices/src/data_fetch'),
    {getCurrentServerTime} = require('./utils/time_keeper'),
    FileNamer = require('./utils/file_namer'),
    {flatCacheClearUrlFile,
    flatCacheClearUrlAll} = require('./utils/http_cacher'),
    {workersManager} = require('./utils/workersManager'),
    LogDb = require('./db/mongo/src/logdb_connect'),
    TmpDb = require('./db/mongo/src/tmpdb_connect'),
    {systemInfo} = require('./utils/system_info'),
    ExecuteQuery = require('./microservices/src/execute_query')

var error = clc.red.bold,
    warn = clc.yellow,
    notice = clc.blue

/**
 * Following section clears all flat cached info.
 */
var fileNamer = new FileNamer() 
var tmpDirs = fileNamer.tmpDirs() // url_cacher/request and url_cacher/export
del.sync(tmpDirs, {force: true})
flatCacheClearUrlAll() // Clear all flat cache in memory
 
// Use morgan combined format, a standard Apache log format
app.use(morgan('combined', {stream: winston.stream}));

// Use CORS
app.use(cors());

// Use body parser json
app.use(bodyParser.json());

// Use pretty to send pretty response
app.use(pretty({query: 'pretty'}));

// User body parser urlencoded
app.use(bodyParser.urlencoded({ extended: true }));

// Base route for GET, POST etc.
app.all('/', (req, res) => res.status(200).json({message: msg.landingRouteWelcome}))

// API routes. Works for all GET, POST etc. HTTP methods.
app.use('/api/'+config.get('server.apiVersion'), router)

// Catch all bad routes for GET, POST etc.
app.all('*', (req, res) => res.status(404).json({message: msg.routeNotFound}))

process.on('uncaughtException', (e) => {
    /**
     * Needed to handle Node's toString() Buffer error.
     * No other way to catch this internal Node error.
     */
    winston.error('Uncaught Exception -> '+ e.message)
})
.on('unhandledRejection', (reason, p) => {
    winston.error('Unhandled Rejection -> ' + reason + ' | ' + + p)
})
.on('warning', (e) => {
    winston.error('Uncaught Warning -> '+ e.stack)
});

app.listen(config.get('server.port'), () => console.log(msg.serverLaunchWelcome))
            .on('error', function(err) {
                winston.error('Uncaught Port Error -> '+ err.code)
            });
  
module.exports = {
    app
}