

'use strict'

//Load express module with `require` directive
const express = require('express')
const _ = require('underscore');
const mongo = require('mongodb').MongoClient
const axios = require('axios');
const querystring = require('querystring');
const fs = require('fs')  
const Path = require('path') 
const JSONC = require('circular-json');
const readline = require('readline');
const stream = require('stream');
const async = require('async');
const concat = require('concat');
const StreamObject = require('stream-json/streamers/StreamObject');
const StreamArray = require('stream-json/streamers/StreamArray');
const {convert} = require('geojson2shp')
const app = express()

//Define request response in root URL (/)
// app.get('/', function (req, res) {
//   res.status(200).send('Welcome to the JRC OSM Exposure API! :)')
// })

const mongo_conn = 'mongodb://173.249.18.211:8002'
const raw_dir = '/server'

var pipeline = []
app.get('/submitquery', function (req, res) {
    var parameter = Object.keys(req.query)

    if (_.difference(['framework', 'element'], parameter).length === 0 && _.intersection(['bbox', 'bname'], parameter).length === 1) {
        
        const url = mongo_conn;
        mongo.connect(url, (err, client) => {
            if (err) {
              res.status(500).send('500 Server Internal Error while submitting the request. Error: ' + err)
            }
            const db = client.db('log_db');
            const collection = db.collection('submit_query_coll');
            
            var query = {};
            for (const key of parameter) {
                query[key] = req.query[key];
            }
            query['_timestamp'] = Date.now();
            query['_status'] = 'pending';

            collection.insertOne(query)
                .then(result => {
                    var pipeline_log = {};
                        pipeline_log = query
                        pipeline_log['_download'] = 'pending';
                        pipeline_log['_tojson'] = 'pending';
                        pipeline_log['_insert'] = 'pending';
                        pipeline_log['_geojson'] = 'pending';
                        // pipeline_log['_test'] = 'pending';
                        pipeline_log['_shp'] = 'pending';
                        pipeline.push(pipeline_log)
                    console.log(pipeline)
                    res.status(200).send('Query successfully submitted!')
                })
                .catch(err => {
                    console.error(err)
                    res.status(500).send('500 Server Internal Error while submitting the request. Error: ' + err)
            })

            client.close()

          })

    } else {
        res.status(400).send('400 Bad Request - Essential query parameters missing!');
    }
})


app.get('/processedquery', function (req, res) {
    
    // res.status(200).send("zoia")

    const url = mongo_conn;
    mongo.connect(url, (err, client) => {
        if (err) {
            res.status(500).send('500 Server Internal Error while submitting the request. Error: ' + err)
        }
        const db = client.db('log_db');
        const collection = db.collection('submit_query_coll');

        console.log("aa")

        collection.find({'_status': 'done'}).toArray((err, items) => {
            console.log("2")
            res.status(200).send(items)
          })

        // client.close()

        })
})


app.get('/download', function(req, res){

    if (req.query.format === 'shp'){
        const outputfile = Path.resolve(raw_dir, 'raw', req.query.id.toString() + '_shp.zip')
        res.download(outputfile); // Set disposition and send it.
    } else if (req.query.format === 'geojson'){
        const outputfile = Path.resolve(raw_dir, 'raw', req.query.id.toString() + '_geojson.geojson')
        res.download(outputfile); // Set disposition and send it.
    }

    // var file = __dirname + '/upload-folder/dramaticpenguin.MOV';
    // res.download(file); // Set disposition and send it.
  });

// // Catch all bad routes
// app.get('*', function(req, res){
//     res.status(404).send('404 Endpoint Not found')
// });

// //Launch listening server on port 8080
// app.listen(8080, function () {
//   console.log('server listening on port 8080!')
// })

// Check for new queries
// var query_list = []
// setInterval(function() {
//     console.log("--- Scanning New Queries ---")

//     const url1 = 'mongodb://localhost:3001';
//     mongo.connect(url1, (err, client) => {
//         if (err) {
//             res.status(500).send('500 Server Internal Error while submitting the request. Error: ' + err)
//         }
//         const db = client.db('log_db')
//         const collection = db.collection('submit_query_coll')

//         collection.find({'status': 'pending'}).toArray()
//             .then(items => {
//                 if (items.length > 0) { 
//                     for (const single_query of items){
//                         if (!query_list.includes(single_query)) {query_list.push(single_query)}
//                     }
//                 }
//             })
//             .catch(err => {
//                 res.status(500).send('500 Server Internal Error while getting pending request. Error: ' + err)
//             })
        
//         client.close()

//     })

// }, 2000); 


var get_ohsome = setInterval(function() {
    
    for (const key of pipeline) {
        if (key['_download'] == 'pending') {
            getOhsome(pipeline.indexOf(key), key['_id'], key['bbox'], key['element'])
        }
    }

}, 5000); 

async function getOhsome(index, id, bbox, element) {  
    try {
        // const url = 'https://unsplash.com/photos/AaEQmoufHLk/download?force=true'
        // const url = 'http://api.ohsome.org/v0.9/elements/geometry?bboxes=8.675474,49.411605,8.683034,49.415998&properties=tags&showMetadata=false&time=2016-01-01,2017-01-01&types=way'
        const url = 'http://api.ohsome.org/v0.9/elements/geometry?bboxes=' + bbox + '&keys=amenity&properties=tags,metadata&showMetadata=false&time=2016-01-01,2017-01-01&types=node,way&values=' + element
        const path = Path.resolve(raw_dir, 'raw', id.toString() + '.geojson')
        const writeStream = fs.createWriteStream(path)

        axios({
            method: 'get',
            url,
            responseType: 'json'
        })
            .then(function (response) {
                // console.log(response)
                writeStream.write(JSONC.stringify(response));
                writeStream.on('finish', () => {  
                    console.log('wrote all data to file')
                });
                writeStream.end()
                console.log("--------")
                pipeline[index]['_download'] = 'done'
            })
            .catch(error => {
                console.log(error)
            });;

    } catch (error) {
        console.log(err)
    }

  }



var tojson_ohsome = setInterval(function() {
    
    for (const key of pipeline) {
        if (key['_download'] == 'done' && key['_tojson'] == 'pending') {
            
            tojsonOhsome(pipeline.indexOf(key), key['_id'])
        }
    }

}, 5000); 

async function tojsonOhsome(index, id) { 
    try {

        const jsonStream = StreamObject.withParser();
        const inputfile = Path.resolve(raw_dir, 'raw', id.toString() + '.geojson')
        const outputfile = Path.resolve(raw_dir, 'raw', id.toString() + '_tojson.json')

        var outstream = fs.createWriteStream(outputfile);
        outstream.writable = true;

        var check_json = 0
        jsonStream.on('data', ({key, value}) => {
            if (_.difference(['features'], Object.keys(value)).length === 0 ){
                if (Object.values(value['features']).length >= 0){
                    check_json = 1
                    outstream.write(JSON.stringify(Object.values(value['features'])));
                }
            }
        });
        
        jsonStream.on('end', () => {
            if (check_json == 1){
                pipeline[index]['_tojson'] = 'done'
            }
            
        });
        
        fs.createReadStream(inputfile).pipe(jsonStream.input);

    } catch (error) {
        console.log(err)
    }

}



var insert_ohsome = setInterval(function() {
    
    for (const key of pipeline) {
        if (key['_download'] == 'done' && key['_tojson'] == 'done' && key['_insert'] == 'pending') {
            
            insertOhsome(pipeline.indexOf(key), key['_id'])
        }
    }

}, 5000); 


async function insertOhsome(index, id) { 

    try {
        
    

        const jsonStream = StreamArray.withParser();
        const inputfile = Path.resolve(raw_dir, 'raw', id.toString() + '_tojson.json')

        const url = mongo_conn;
        mongo.connect(url, (err, client) => {
            if (err) {
                res.status(500).send('500 Server Internal Error while mongo insert the request. Error: ' + err)
            }
            const db = client.db('raw_db');
            const collection = db.collection(id.toString());



            //         jsonStream.on('data', ({key, value}) => {
            //             collection.insertOne({key, value})
            //                 .then(result => {
            //                     // callback(null);
            //                     console.log('Mongo insert successfully submitted!')
            //                 })
            //                 .catch(err => {
            //                     console.log(err)
            //                 })
            //         }, ca)

            // () => {
            //     mongodb.close();
            // })

            // async.series([
            //     (callback) => {

            //         jsonStream.on('data', ({key, value}) => {
            //             collection.insertOne({key, value})
            //                 .then(result => {
            //                     // callback(null);
            //                     console.log('Mongo insert successfully submitted!')
            //                 })
            //                 .catch(err => {
            //                     console.log(err)
            //                 })
            //         }, ca)

            //     }
            // ],
            // () => {
            //     mongodb.close();
            // })

            jsonStream.on('data', ({key, value}) => {
                collection.insertOne(value)
                    .then(result => {
                        console.log('Mongo insert successfully submitted!')
                    })
                    .catch(err => {
                        console.log(err)
                    })
            })
            // if (response.err) { console.log('error');}
            //     else { 
            //         console.log('Mongo connection closed')
            //         client.close();}

            // jsonStream.on('data', ({key, value}) => {
            //     collection.insertOne({key, value})
            //         .then(result => {
            //             console.log('Mongo insert successfully submitted!')
            //         })
            //         .catch(err => {
            //             console.log(err)
            //         })
            // })

            // client.close()

            //////// DANGER CLIENT NOT CLOSED

            })
            // client.close()
        
        jsonStream.on('end', () => {
            pipeline[index]['_insert'] = 'done'
        });
        
        fs.createReadStream(inputfile).pipe(jsonStream.input);

    } catch (error) {
        console.log(err)
    }
}



var geojson_ohsome = setInterval(function() {
    // console.log(pipeline)
    
    for (const key of pipeline) {
        if (key['_download'] == 'done' && key['_tojson'] == 'done' && key['_insert'] == 'done' && key['_geojson'] == 'pending') {
            
            geojsonOhsome(pipeline.indexOf(key), key['_id'])
        }
    }

}, 5000); 


async function geojsonOhsome(index, id) { 

    try {

        const outputfile = Path.resolve(raw_dir, 'raw', id.toString() + '_geojson.geojson')

        var outstream = fs.createWriteStream(outputfile);
        // outstream.writable = true;

        const url = mongo_conn;
        mongo.connect(url, (err, client) => {
            if (err) {
                res.status(500).send('500 Server Internal Error while mongo insert the request. Error: ' + err)
            }
            const db = client.db('raw_db');
            const collection = db.collection(id.toString());

            // collection.find().toArray((err, items) => {
            //     console.log(items)
            //     outstream.write(JSON.stringify(items));
            // })

            outstream.write('{"type": "FeatureCollection","features":');
            console.log('1')

            let removeGarbage = function(items){
                outstream.write(JSON.stringify(items));
                return new Promise (function(resolve, reject){
                    console.log('2')
                    resolve ('inserted')
                })
            }

            let closeFile = function(){
                console.log('3')
                outstream.write('}');
            }

            collection.find().toArray()
                .then(items => {
                    console.log('4')
                    removeGarbage(items)
                }  
                ).then(
                    result => {
                        console.log('5')
                        closeFile()
                    }
                )
                .catch(err => {
                    console.log(err)
                })

            // collection.find().toArray()
            //     .then(items => {
            //         outstream.write(JSON.stringify(items));
            //     })
            //     .catch(err => {
            //         console.log(err)
            //     })



            

            // function one() {
            //     return new Promise(resolve => {
            //         outstream.write('{"type": "FeatureCollection","features":');
            //       resolve();
            //     });
            //   }

              
            //   function two() {
            //     return new Promise(resolve => {
            //         collection.find().toArray((err, items) => {
            //             outstream.write(JSON.stringify(items));
            //           })
            //       resolve();
            //     });
            //   }

            //   function three(){
            //     return new Promise(resolve => {
            //         outstream.write('}');
            //       resolve();
            //     });
            //  }
              
              
              
            //    function run() {
            //     one().then(two()).then(three());
            //     // two();
            //     // three();
            //   }
            //   run();


            //   async function main() {
            //     console.log('First call started');
            //     let response1 = await $.ajax({url: "https://api.stackexchange.com/2.2/questions/269754/answers/?order=desc&site=meta.stackoverflow&client_id=3519&callback=?"})
            //     console.log('First call finished', response1);
            //     console.log('Second call started');
            //     let response2 = await $.ajax({url: "https://api.stackexchange.com/2.2/questions/269754/answers/?order=desc&site=meta.stackoverflow&client_id=3519&callback=?"})
            //     console.log('Second call finished',response2);
            //   }
              
            //   main();

            // outstream.write('------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------');

        })
        
        pipeline[index]['_geojson'] = 'done'

        // outstream.on('finish', function(){ 
        //     pipeline[index]['_geojson'] = 'done'
        // });
   

    } catch (error) {
        console.log(error)
    }
}



// var test_var = setInterval(function() {
    
//     for (const key of pipeline) {
//         if (key['_download'] == 'done' && key['_tojson'] == 'done' && key['_insert'] == 'done' && key['_geojson'] == 'done' && key['_test'] == 'pending') {
            
//             test(pipeline.indexOf(key), key['_id'])
//         }
//     }

// }, 25000); 


// function test(index, id) { 

//         const outputfile0 = Path.resolve(raw_dir, 'raw', id.toString() + '_gjson.geojson')
//         const outputfile1 = Path.resolve(raw_dir, 'raw', id.toString() + '_geojson.geojson')
//         const outputfile2= Path.join(raw_dir, 'raw', id.toString() + '_geojson1.geojson')

//         fs.writeFileSync(outputfile2, '', "UTF-8",{'flags': 'a+'});

//         pipeline[index]['_test'] = 'done'

//         concat([outputfile1, outputfile2], outputfile0)

// }




var shp_ohsome = setInterval(function() {
    
    for (const key of pipeline) {
        if (key['_download'] == 'done' && key['_tojson'] == 'done' && key['_insert'] == 'done' && key['_geojson'] == 'done' && key['_shp'] == 'pending') {
            
            shpOhsome(pipeline.indexOf(key), key['_id'])
        }
    }

}, 30000); 


function shpOhsome(index, id) { 
    const options = {
        layer: 'my-layer',
        targetCrs: 4326
    }
    
    const inputfile = Path.resolve(raw_dir, 'raw', id.toString() + '_geojson.geojson')
    const outputfile = Path.resolve(raw_dir, 'raw', id.toString() + '_shp.zip')
    convert(inputfile, outputfile, options)

    pipeline[index]['_shp'] = 'done'
    
    const url = mongo_conn;
    mongo.connect(url, (err, client) => {
        if (err) {
            res.status(500).send('500 Server Internal Error while submitting the request. Error: ' + err)
        }
        const db = client.db('log_db');
        const collection = db.collection('submit_query_coll');

        collection.updateMany({'_status': 'pending'}, {'$set': {'_status': 'done'}}, (err, item) => {
            // console.log(item)
        })
    })
    
}


// var getData = function(pending_query) {

//     axios.get('http://api.ohsome.org/v0.9/elements/geometry?bboxes=8.675474%2C49.411605%2C8.683034%2C49.415998&properties=tags&showMetadata=false&time=2016-01-01%2C2017-01-01&types=way')
//         .then(response => {
//             console.log("dd")
//             console.log(response.data.url);
//             console.log(response.data.explanation);
//         })
//         .catch(error => {
//             console.log(error);
//         });
// }