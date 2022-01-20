'use strict'

// Load `require` directives - external
const l = require('lodash'),
    fs = require('fs'),
    http = require('http'),
    del = require('del')
// Load `require` directives - internal

const process_corePath = '/root/jrc/production/run-cron-edh_server/edh_server/tmp/process_core'
// const process_corePath = '/Users/zzz/code/heigit/jrc/edh_server/tmp/process_core' // DELETE IT

const tmpLogFile = '/tmp/api-tile-req.txt'
// const tmpLogFile = '/Users/zzz/code/heigit/jrc/edh_server/tests/run/api-tile-req.txt' // DELETE IT

const apiSubmitEndPoint = 'http://173.249.18.211:8081/api/v1.1/submit'
// const apiSubmitEndPoint = 'http://localhost:3003/api/v1.1/submit' // DELETE IT

const numParallelReq = 8

const theme = [
    'sendaiHealthv0.0',
    'sendaiRefugeeSitesv0.0',
    'sendaiCoastalExposurev0.0',
    'sendaiEducationv0.0',
    'sendaiMassGatheringSitesv0.0',
    'sendaiCulturalHeritageSitev0.0',
    'sendaiWaterTreatmentPlantv0.0',
    'sendaiPowerGenerationPlantv0.0',
    'sendaiAirportv0.0',
    'sendaiBridgev0.0',
    'sendaiRailwayv0.0',
    'sendaiRoadv0.0'  
]

const dataAggregationProjPair = [
    [100,100,3035],
    [1,1,4326],
    [1000,1000,3857],
    [0.001,0.001,4326],
    [250,250,3857],
    [100,100,3857]
]

const dataFormatList = [
    'geojson',
    'geotif',
    'geopackage'
]

const rawDataBool = 'True'

const poly2centroidBool = 'True'

const dataSourceBool = 'False'

const zoomLevelsWithTileWidth = [
    {
        'zoom': 0,
        'xWidth': 180,
        'yWidth': 90
    },
    {
        'zoom': 1,
        'xWidth': 90,
        'yWidth': 20
    },
    {
        'zoom': 2,
        'xWidth': 40,
        'yWidth': 10
    },
    {
        'zoom': 3,
        'xWidth': 20,
        'yWidth': 5
    },
    {
        'zoom': 4,
        'xWidth': 10,
        'yWidth': 3
    },
    {
        'zoom': 5,
        'xWidth': 5,
        'yWidth': 2
    },
    {
        'zoom': 6,
        'xWidth': 2,
        'yWidth': 1
    },
    {
        'zoom': 7,
        'xWidth': 1,
        'yWidth': 0.5
    },
    {
        'zoom': 8,
        'xWidth': 0.5,
        'yWidth': 0.2
    }
]

function isEmpty(path) {
    return fs.readdirSync(path).length == 1;
}

function timeout() {
    return new Promise((res, rej) => {
        setTimeout(function(){ 
            res()
        }, 1000);
    })
}

var alreadyRan = false
var count = 0

async function main() {
    while(true) {

        for await (var i of theme) {
            
            let timeTheme0 = Date.now()/1000

            for await (var j of dataAggregationProjPair) {

                let timeDataAggregation0 = Date.now()/1000

                for await (var k of zoomLevelsWithTileWidth) {

                    let timeZoom0 = Date.now()/1000

                    var zoom = k['zoom'],
                        xWidth = k['xWidth'],
                        yWidth = k['yWidth']
    
                    var xTileList = l.range(-180+xWidth, 180, xWidth),
                        yTileList = l.range(-90+yWidth, 90, yWidth)

                    var dataAggregationProjPairList = []
                    for await (var a of xTileList) {
                        for await (var b of yTileList) {

                            if (j[2] == 3035) {
                                // Select only EU tiles
                                if (a >= -24 &&
                                    a <= 60 &&
                                    b >= 36 &&
                                    b <= 90) {
                                    dataAggregationProjPairList.push([a, b, zoom])
                                }
                            } else {
                                dataAggregationProjPairList.push([a, b, zoom])
                            }

                        }
                    }

                    var urlList = []
                    for await (var c of dataAggregationProjPairList) {
                        var url = apiSubmitEndPoint + '?themeNameVersion=' + i + '&apiToken=123abc&long=' + c[0] + '&lat=' + c[1] + '&zoom=' + c[2] + '&dataAggregate=[' + j + ']&rawData=' + rawDataBool + '&rawCentroid=' + poly2centroidBool + '&dataSource=' + dataSourceBool + '&dataFormat=' + JSON.stringify(dataFormatList)
    
                        urlList.push(url)
                    }
                    
                    for (let d=0; d<urlList.length; d += numParallelReq) {
                        var urlListChunk = urlList.slice(d,d+numParallelReq)

                        if (fs.existsSync(tmpLogFile)) {
                            var urlDone = fs.readFileSync(tmpLogFile, {encoding:'utf8', flag:'r'})
                            var urlContains = l.includes(urlListChunk, urlDone)
                        }

                        if (!fs.existsSync(tmpLogFile) || (alreadyRan || urlContains)) {

                            for (let e=0; e<urlListChunk.length; e++) {
                                // Hit API GET
                                count += 1
                                http.get(urlListChunk[e], (res) => {
                                    // console.log('status:', res.statusCode, res.statusMessage, ', count:', count, ', url:', urlListChunk[e]) // Log status, download count and API url

                                    return
                                }).on('error', (e) => {
                                    console.error(e)
                                })
                            }
        
                            var emptyBool = false
                            while(!emptyBool) {
                                emptyBool = isEmpty(process_corePath)
                                await timeout()
                            }
                               
                            if (urlListChunk[numParallelReq-1] != undefined) {
                                fs.writeFileSync(tmpLogFile, urlListChunk[numParallelReq-1])
                                alreadyRan = true
                            }
                            
                        } 
                        
                    }

                    let timeZoom1 = Date.now()/1000
                    let timeZoom = (timeZoom1 - timeZoom0) / (60*60)
                    console.log(k, ' zoom with tile width of ', i, ' theme took ', timeZoom, ' hours to complete whole zoom with tile width.');
                }

                let timeDataAggregation1 = Date.now()/1000
                let timeDataAggregation = (timeDataAggregation1 - timeDataAggregation0) / (60*60)
                console.log(j, ' data aggregation of ', i, ' theme took ', timeDataAggregation, ' hours to complete whole data aggregation.');
            }

            let timeTheme1 = Date.now()/1000
            let timeTheme = (timeTheme1 - timeTheme0) / (60*60)
            console.log(i, ' theme took ', timeTheme, ' hours to complete whole globe.');
        }
        del.sync(tmpLogFile, {force: true})
    }
}

main()
