const l = require('lodash'),
    axios = require('axios'),
    fs = require('fs'),
    del = require('del'),
    gjValidate= require("geojson-validation"),
    fg = require('fast-glob'),
    fsExtra = require('fs-extra'),
    reproject = require('reproject'),
    path = require('path'),
    pick = require('stream-json/filters/Pick'),
    Batch = require('stream-json/utils/Batch'),
    {streamArray} = require('stream-json/streamers/StreamArray'),
    {chain} = require('stream-chain')

var sourceDir = '/Users/zzz/Downloads/s3/merge/aggre/**.geojson'
var mergedGeoJSONFile = '/Users/zzz/Downloads/s3/merge/SendaiWaterTreatmentPlantv00-1000m-EPSG3035-Count-20200626-Global.geojson'
var epsg = 3035





// l.map(filesList, (file) => {


//     var pipeline = chain([ // More - https://github.com/uhop/stream-json/wiki/Pick
//         fs.createReadStream(file),
//         pick.withParser({filter: 'features'}),
//         streamArray(),
//         new Batch({batchSize: 1000}) // Takes file in big chunks. Single item means too many Mongo Insert operations and many items mean high memory usage. More - https://github.com/uhop/stream-json/wiki/Batch. Default is being kept as 1000.
//     ])

//     var counter = 0
//     pipeline.on('data', (data) => {
//             var value = l.map(data, 'value')
//             // var geojs = {}
//             // geojs['type'] = 'FeatureCollection'
//             // geojs['features'] = value

//             /**
//              * Reproject to new CRS a small 
//              * chunk of data as defined above
//              * in batchSize
//              */                    
//             // var featCRSChangedGeoJSON = reprojectCRS(value, 'EPSG:4326', 'EPSG:'+urlArguments.dataAggregate[2])

//             // var featCRSChangedGeoJSON = reproject.reproject(geojs, 'EPSG:4326', 'EPSG:'+urlArguments.dataAggregate[2]) 

//             // var featCRSChanged = featCRSChangedGeoJSON.features
//             var featCRSEdited = JSON.stringify(value[0])

//             console.log(JSON.stringify(value, undefined, 2))
            
//             if (counter != 0) {
//                 // Add comma before each feature except the first one
//                 outStream.write(',')
//             } else {
//                 counter += 1
//             }
//             outStream.write(featCRSEdited)

//         })
//         .on('end', () => {
            
//         })
                    

// })





var filesList = fg.sync(sourceDir, { onlyFiles: false, deep: 1 })

var outStream = fs.createWriteStream(mergedGeoJSONFile);
outStream.writable = true;
outStream.write('{\"type\":\"FeatureCollection\", \"crs\":{\"type\": \"name\", \"properties\":{\"name\": \"urn:ogc:def:crs:EPSG::' + epsg + '\"}}, \"features\":[')

function singleMerge(file, outStream) {

    // console.log(outStream)

    return new Promise((res, rej) => {
        var pipeline = chain([ // More - https://github.com/uhop/stream-json/wiki/Pick
            fs.createReadStream(file),
            pick.withParser({filter: 'features'}),
            streamArray(),
            new Batch({batchSize: 1000}) // Takes file in big chunks. Single item means too many Mongo Insert operations and many items mean high memory usage. More - https://github.com/uhop/stream-json/wiki/Batch. Default is being kept as 10000.
        ])

        pipeline.on('data', (data) => {  

            data = l.map(data, 'value') 

            if (data.length > 0) {

                if (counter != 0) {
                    // Add comma before each feature except the first one
                    outStream.write(',')
                } else {
                    counter += 1
                }
    
                outStream.write(JSON.stringify(data).slice(1, -1))

            }
                  
            })
            .on('end', () => {
                res()
            })
            .on('error', e => {
                // rej(console.log(error('Error - unionIndividualFile() - > ' + e.message)))
            });

    })

}

var counter = 0
async function mergeGeojson(sourceDir, outStream) {
    try {

        
        // console.log(sourceDir)

        for (let i=0;  i<sourceDir.length; i++) {

            // console.log("aa")
            await singleMerge(sourceDir[i], outStream)
            counter++
        }

        outStream.write(']}', () => {
            // outStream.end() // This is needed otherwise stream will not be closed completely
        }) 

        // await l.map(sourceDir, async (file) => {
        //     console.log("aa")
        //     await singleMerge(file, counter, outStream)
        //     counter++
        // })
        
    } catch (e) {
        
    }
}

mergeGeojson(filesList, outStream)

