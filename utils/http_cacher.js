'use strict'

// Load `require` directives - external
const memoryCacher = require('memory-cache'),
    flatCacher = require('flat-cache'),
    l = require('lodash'),
    del = require('del'),
    config = require('config'),
    fs = require('fs'),
    clc = require("cli-color")
// Load `require` directives - internal
const FileNamer = require('./file_namer'),
    {getCurrentServerTime} = require('../utils/time_keeper')

var error = clc.red.bold,
    warn = clc.yellow,
    notice = clc.blue

/**
 * Memory Cache
 */
const memCache = new memoryCacher.Cache() 
function memCacheSend(duration) {
    /**
     * Use this Middleware for res.send
     */

    try {

        return (req, res, next) => {

            /**
             * apiToken is not being used as key for
             * caching as non authorised used as 
             * although not allowed to submit request
             * can fetch already processed one
             */
            let key =  '__express__' + JSON.stringify(l.omit(req.query, 'apiToken'))
            let cacheContent = memCache.get(key);
            
            if(cacheContent) {

                res.send(cacheContent)

                return
    
            } else {

                res.sendResponse = res.send
                res.send = (body) => {

                    if (!l.has(JSON.stringify(body), 'statusHttp')) {
                        /**
                        * Only cache if status is 200. 
                        * Otherwise hackers can affect API
                        * by making wrong curl putting 
                        * other valid curls in cache mode
                        */
                        memCache.put(key, body, duration*1000);  
                    }
                        
                    res.sendResponse(body)
                }

                next()
   
            }
        }
        
    } catch (e) {
        console.log(error('Error - memCacheSend() - > ' + e.message))
    }

}

function memCacheDownload(duration) {
    /**
     * Use this Middlware for res.download
     */

    try {

        return (req, res, next) => {
            let key = '__express__' + JSON.stringify(req.query['submitId'])
            let cacheContent = memCache.get(key);
            if(cacheContent) {
                res.download(cacheContent);
                return
    
            } else {
                res.downloadResponse = res.download
                res.download = (body) => {
                    memCache.put(key, body, duration*1000);
                    res.downloadResponse(body)
    
                }
                next()
            }
        }
        
    } catch (e) {
        console.log(error('Error - memCacheDownload() - > ' + e.message))
    }

}

/**
 * Flat Cache 
 */
var fileNamer = new FileNamer()
var requestCacherDir = fileNamer.requestCacherDir()
const flatCache = flatCacher.load('httpResFlatCache', requestCacherDir) // urlCacher a tmp directory to store cached info and export files.

function flatCacheDownload(req, res, next) {

    try {

        // Create flat cache routes. More - https://scotch.io/tutorials/how-to-optimize-node-requests-with-simple-caching-strategies
        let key = '__express__' + 'submitId=' + req.query['submitId']
        let cacheContent = flatCache.getKey(key);
        if(cacheContent) {
            res.download(cacheContent.body);

        } else {
            res.downloadResponse = res.download
            res.download = (body) => {
                if (body.status == 200) {
                    var reqTime = getCurrentServerTime('Unix')
                    flatCache.setKey(key, {
                        reqTime: reqTime,
                        body: body.send
                    });
                    flatCache.save();
                    res.downloadResponse(body.send)

                } else if (body.status == 404) {
                    var downloadNotReadyZip = fileNamer.downloadNotReadyZip()
                    res.downloadResponse(downloadNotReadyZip)

                } else if (body.status == 400) {
                    var downloadErrorZip = fileNamer.downloadErrorZip()
                    res.downloadResponse(downloadErrorZip)

                }        
            }
            next()
        }
        
    } catch (e) {
        console.log(error('Error - flatCacheDownload() - > ' + e.message))
    }

};

function flatCacheSend(req, res, next) {

    try {

        // Create flat cache routes. More - https://scotch.io/tutorials/how-to-optimize-node-requests-with-simple-caching-strategies
        let key =  '__express__' + JSON.stringify(l.omit(req.query, 'apiToken'))
        let cacheContent = flatCacher.getKey(key);
        if(cacheContent) {
            res.send(cacheContent);

        } else {
            res.sendResponse = res.send
            res.send = (body) => {
                flatCacher.setKey(key, body);
                flatCacher.save();
                res.sendResponse(body)

            }
            next()
        }
        
    } catch (e) {
        console.log(error('Error - flatCacheSend() - > ' + e.message))
    }

}

/**
 * Flat Cache with Timer
 * More - https://github.com/royriojas/flat-cache/issues/38
 */
class FlatCacheTimer {

    constructor (cacheTime = 0) {
        this.name = 'httpResFlatcacheTimer'
        this.path = requestCacherDir
        this.cache = flatCacher.load(this.name, this.path)
        this.expire = cacheTime === 0 ? false : cacheTime * 1000 * 10
    }

    getKey (key) {

        try {

            var now = new Date().getTime()
            var value = this.cache.getKey(key)
            if (value === undefined) {
                return undefined
            } 
            if (value.expire !== false && value.expire < now) {
                return undefined
            } else {
                return value.data
            }
            
        } catch (e) {
            console.log(error('Error - getKey() - > ' + e.message))
        }

    }

    setKey (key, value) {

        try {

            var now = new Date().getTime()
            this.cache.setKey(key, {
                expire: this.expire === false ? false : now + this.expire,
                data: value
            })
            
        } catch (e) {
            console.log(error('Error - setKey() - > ' + e.message))
        }

    }

    removeKey (key) {

        try {
            this.cache.removeKey(key)
        } catch (e) {
            console.log(error('Error - removeKey() - > ' + e.message))
        }

    }

    save () {

        try {
            this.cache.save(true)
        } catch (e) {
            console.log(error('Error - save() - > ' + e.message))
        }

    }

    remove () {

        try {
            flatCacher.clearCacheById(this.name, this.path)
        } catch (e) {
            console.log(error('Error - remove() - > ' + e.message))
        }

    }
}
var flatCacheTimer = new FlatCacheTimer(1) // Flat-Cache with timer Object, in minutes
function flatCacheTimerDownload(req, res, next) {

    try {

        // Create flat cache routes. More - https://scotch.io/tutorials/how-to-optimize-node-requests-with-simple-caching-strategies
        let key = '__express__' + 'submitId=' + req.query['submitId']
        let cacheContent = flatCacheTimer.getKey(key);
        if(cacheContent) {
            res.download(cacheContent);

        } else {
            res.downloadResponse = res.download
            res.download = (body) => {
                flatCacheTimer.setKey(key, body);
                flatCacheTimer.save();
                res.downloadResponse(body)
                
            }
            next()
        }
        
    } catch (e) {
        console.log(error('Error - flatCacheTimerDownload() - > ' + e.message))
    }

};

/**
 * Clear Flat Cache and corresponding files
 * on cronJob
 */
function flatCacheClearUrlFile() {
    /**
     * The following code will clean http res
     * and corresponding .zip files from 
     * flat-cache and url_cacher/export dir.
     */

    try {

        var currentTime = getCurrentServerTime('Unix')
        var flatCacheAllList = flatCache.all()

        var flatCacheFilterList = l.mapValues(flatCacheAllList, (item) => {
            if (item.reqTime + (config.get('server.flatCacheDownloadTimeoutHr')*3600000) < currentTime){
                return item.body
            }
        })
        flatCacheFilterList = l.pick(flatCacheFilterList, l.identity) // Remove all items where value in undefined. These items are those req that are recent.

        var flatCacheUrlList = l.keys(flatCacheFilterList) // Get deleting reqs
        var flatCacheFileList = l.values(flatCacheFilterList) // Get deleting .zips

        if (flatCacheUrlList.length > 0 && flatCacheFileList.length > 0) {
            l.map(flatCacheUrlList, (item) => {
                flatCache.removeKey(item)
            })
            del.sync(flatCacheFileList, {force: true})
        }

        /**
         * Also delete all .zip files 
         * older than flatCacheDownloadTimeoutHr.
         * There might be cases where someone submitted 
         * a query but never downloaded it. Those 
         * zip files won't be deleted above. Needs to be
         * delete separately
         */
        var cacheFileDir = fileNamer.cacheFileDir()
        fs.readdir(cacheFileDir, (err, files) => {
            //handling error
            if (err) {
                return 
            } 
            l.remove(files, (item) => {
                return item.startsWith('.')
            }) 
            var filesFilter = []
            l.map(files, (item) => {
                var fileNamePath = fileNamer.exportZipFile(item)
                var stats = fs.statSync(fileNamePath)
                var time = new Date(stats.mtime)
                var fileCreationTimeUnix = time.getTime()

                if (fileCreationTimeUnix + (config.get('server.flatCacheDownloadTimeoutHr')*3600000) < currentTime) {
                    filesFilter.push(fileNamePath)
                }
            }) 

            if (filesFilter.length > 0) {
                del.sync(filesFilter, {force: true})
            }
        })
        
    } catch (e) {
        console.log(error('Error - flatCacheClearUrlFile() - > ' + e.message))
    }

}

function flatCacheClearUrlAll() {

    try {
        flatCacher.clearAll()
    } catch (e) {
        console.log(error('Error - flatCacheClearUrlAll() - > ' + e.message))
    }

}

module.exports = {
    memCacheSend,
    memCacheDownload,
    flatCacheDownload,
    flatCacheSend,
    flatCacheTimerDownload,
    flatCacheClearUrlFile,
    flatCacheClearUrlAll
}