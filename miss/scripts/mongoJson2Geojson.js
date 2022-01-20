const fs = require('fs'),
readline = require('readline'),
l = require('lodash'),
flat = require('flat'),
unflat = require('flat').unflatten

function readfile(fileName) {
    try {
        
        var count = 0
        return new Promise((res, rej) => {

            var lineReader = readline.createInterface({
                input: require('fs').createReadStream(fileName)
            })
            
            var count = 0
            lineReader.on('line', (item) => {
                if (count == 0) {
                    count++
                    fs.writeSync(outStream, item + '\n')
                } else {
                    fs.writeSync(outStream, ',' + '\n')
                    fs.writeSync(outStream, item + '\n')
                }
            })
            .on('close', () => {
                fs.writeSync(outStream, ']}' + '\n')
                res()
            })
            .on('error', (e) => {
                rej(console.log(error('Error - txt2Mongo() - > ' + e.message)))
            })

        })

    } catch (e) {
        console.log('Error - ohsome2FeatArr() - > ' + e.message)
    }
}

var outStream = fs.openSync('/Users/zzz/Downloads/airport40-24-44.geojson', 'w')
fs.writeSync(outStream, '{"type": "FeatureCollection","crs":{"type": "name", "properties":{"name": "urn:ogc:def:crs:EPSG::4326"}},"features": [' + '\n')

readfile('/Users/zzz/Downloads/airport40-24-44.json')