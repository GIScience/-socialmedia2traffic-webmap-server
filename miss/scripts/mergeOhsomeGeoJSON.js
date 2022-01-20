const fs = require('fs'),
pick = require('stream-json/filters/Pick'),
{streamArray} = require('stream-json/streamers/StreamArray'),
Batch = require('stream-json/utils/Batch'),
through2 = require('through2'),
l = require('lodash')

var dirGeoJSON = '<path-to-ohsome-download-geojson-dir>'
var outputMergedFileName = 'merged.geojson'
var outFileFullPath = dirGeoJSON + '/' + outputMergedFileName

function singleTile2Txt(outStream, fileName) {
    try {

        return new Promise((res, rej) => {
            fs.createReadStream(fileName)
            .pipe(pick.withParser({filter: 'features'})) // More - https://github.com/uhop/stream-json/wiki/Pick
            .pipe(streamArray())
            .pipe(new Batch({batchSize: 1000})) // Takes file in big chunks. Single item means too many Mongo Insert operations and many items mean high memory usage. More - https://github.com/uhop/stream-json/wiki/Batch.
            .pipe(through2.obj(async (chunk, enc, callback) => {

                chunk = l.map(chunk, 'value')
                l.map(chunk, (item) => {
                    fs.writeSync(outStream, JSON.stringify(item) + '\n')
                })
                
                callback()
            }))
            .on('data', (data) => {
            })
            .on('end', () => {
                console.log("2");
                res()
            })
            .on('error', (e) => {
                rej(console.log(error('Error - singleTile2Txt() - > ' + e.message)))
            })
        })
        
    } catch (e) {
        console.log('Error - singleTile2Txt() - > ' + e.message)
    }
}

async function tmpMergeTile2RowFile(tmpCSVTileMerged, downloadFileNamesListAll) {
    try {

        var outStream = fs.openSync(tmpCSVTileMerged, 'w')

        for (let i=0; i<downloadFileNamesListAll.length; i++) {
            console.log(downloadFileNamesListAll[i]);
            await singleTile2Txt(outStream, downloadFileNamesListAll[i])
        }

        fs.closeSync(outStream)

        return 
        
    } catch (e) {
        console.log('Error - tmpMergeTile2RowFile() - > ' + e.message)
    }
}

var files = fs.readdirSync(dirGeoJSON)

var fileFullPathList = []
for (let i=0; i<files.length; i++) {
    if (files[i] != '.DS_Store') {
        var fileFullPathGen = dirGeoJSON + '/' + files[i]
        fileFullPathList.push(fileFullPathGen)
    }
}

tmpMergeTile2RowFile(outFileFullPath, fileFullPathList)