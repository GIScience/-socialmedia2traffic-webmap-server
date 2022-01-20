
const l = require('lodash'),
del = require('del'),
fs = require('fs'),
path = require('path'),
gjValidate= require("geojson-validation"),
pick = require('stream-json/filters/Pick'),
{streamArray} = require('stream-json/streamers/StreamArray'),
Batch = require('stream-json/utils/Batch'),
{chain} = require('stream-chain'),
through2 = require('through2'),
flat = require('flat'),
turf = require('@turf/turf'),
clc = require("cli-color"),
exec = require('child_process').exec,
appRoot = require('app-root-path')

var tileGeoJSONFile = '/Users/zzz/code/heigit/jrc/edh_server/db/local/zoom6-tiles-selected.geojson'
var dataQualityFile = '/Users/zzz/code/heigit/jrc/edh_server/db/local/data-quality-osm-health.geojson'
var dataQualityTileFile = '/Users/zzz/code/heigit/jrc/edh_server/db/local/data-quality-osm-health2.geojson'

function loopDataQuality(item) {

    var finalQuality
    var qualityList = []

    return new Promise((res, rej) => {

        fs.createReadStream(dataQualityFile)
        .pipe(pick.withParser({filter: 'features'})) // More - https://github.com/uhop/stream-json/wiki/Pick
        .pipe(streamArray())
        .pipe(new Batch({batchSize: 1000})) // Takes file in big chunks. Single item means too many Mongo Insert operations and many items mean high memory usage. More - https://github.com/uhop/stream-json/wiki/Batch.
        .pipe(through2.obj(async (chunk, enc, callback) => {

            chunk = l.map(chunk, 'value') // Get all values from data stream that holds the actual data

            var pixelGeom = turf.polygon(item.geometry.coordinates)

            for await (let dqgeom of chunk) {
                var dqFeatGeom = turf.polygon(dqgeom.geometry.coordinates)
                var intersection = turf.intersect(pixelGeom, dqFeatGeom)

                if (intersection !== null) {
                    qualityList.push(dqgeom['properties']['data-quality'])
                }
            }

            callback()
        }))
        .on('data', (data) => {
        })
        .on('end', () => {

            finalQuality = parseFloat((l.sum(qualityList)/qualityList.length).toFixed(2))

            item['properties']['data-quality'] = finalQuality

            res([item, finalQuality])
        })
        .on('error', (e) => {
            rej(console.log(error('Error - burnOSMQualityBandInternal() - > ' + e.message)))
        })
    })
}

function main() {

    var count = 0

    return new Promise((res, rej) => {
        fs.appendFileSync(dataQualityTileFile, '{"type":"FeatureCollection", "crs":{"type": "name", "properties":{"name": "urn:ogc:def:crs:EPSG::4326"}}, "features":[', 'utf8') 

        fs.createReadStream(tileGeoJSONFile)
        .pipe(pick.withParser({filter: 'features'})) // More - https://github.com/uhop/stream-json/wiki/Pick
        .pipe(streamArray())
        .pipe(new Batch({batchSize: 1})) // Takes file in big chunks. Single item means too many Mongo Insert operations and many items mean high memory usage. More - https://github.com/uhop/stream-json/wiki/Batch.
        .pipe(through2.obj(async (chunk, enc, callback) => {

            chunk = l.map(chunk, 'value') // Get all values from data stream that holds the actual data

            // Calculate data quality
            var newTile = await loopDataQuality(chunk[0])

            // if (!isNaN(newTile[1])) {
                if (count > 0) {
                    fs.appendFileSync(dataQualityTileFile, ',', 'utf8')
                }
    
                fs.appendFileSync(dataQualityTileFile, JSON.stringify(newTile[0]), 'utf8')
                count += 1   
            // }

            callback()
        }))
        .on('data', (data) => {
        })
        .on('end', () => {
            fs.appendFileSync(dataQualityTileFile, ']}', 'utf8') 
            res()
        })
        .on('error', (e) => {
            rej(console.log(error('Error - burnOSMQualityBandInternal() - > ' + e.message)))
        })
    })

}

main()
