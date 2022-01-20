// var fs = require('fs');
// var readline = require('readline');
// var stream = require('stream');

// var inputfile = "/Users/zzz/Downloads/img/5cd792a633e32a6e5e20e56a.geojson";
// var outputfile = "/Users/zzz/Downloads/img/5cd792a633e32a6e5e20e56a.json";

// var instream = fs.createReadStream(inputfile);
// var outstream = fs.createWriteStream(outputfile, {'flags': 'a'});
// outstream.readable = true;
// outstream.writable = true;

// var rl = readline.createInterface(instream, outstream);

// rl.on('line', function(line){
//     outstream.write(line + '\n');
//     rl.close();
//     instream.destroy()
// });



// https://stackoverflow.com/questions/42896447/parse-large-json-file-in-nodejs-and-handle-each-object-independently/42897498

// https://flaviocopes.com/node-mongodb/

// const StreamObject = require('stream-json/streamers/StreamObject');
// const path = require('path');
// const fs = require('fs');
// const _ = require('underscore');
// const chain  = require('stream-chain');
// const parser = require('stream-json');
// const pick  = require('stream-json/filters/Pick');
// const streamValues = require('stream-json/streamers/StreamValues');
// const jsonStream = StreamObject.withParser();

// const jsonStream = new chain([
// //   fs.createReadStream('/Users/zzz/Downloads/sample.json.gz'),
// //   zlib.createGunzip(),
//   parser(),
// //   new pick({filter: 'data'}),
// //   new ignore({filter: /\b_meta\b/i}),
//   new StreamObject(),
//   data => {
//     const value = data.value;
//     console.log(typeof(value))
//     console.log(value)
//     console.log("----------------")
//     // console.log("ss")
//     // return value && value.department === 'accounting' ? data : null;
//   }
// ]);

//You'll get json objects here
//Key is an array-index here
// jsonStream.on('data', ({key, value}) => {

    

//     if (_.difference(['features'], Object.keys(value)).length === 0 ){
//         console.log(value['features'])
//     }

// });

// jsonStream.on('data', () => {});
// jsonStream.on('end', () => {});

// const filename = path.join('/Users/zzz/Downloads/img/5cd792a633e32a6e5e20e56a.geojson');
// fs.createReadStream(filename).pipe(jsonStream.input);




const chain  = require('stream-chain');

const parser = require('stream-json');
const pick   = require('stream-json/filters/Pick');
const ignore = require('stream-json/filters/Ignore');
const streamValues = require('stream-json/streamers/StreamValues');

const fs   = require('fs');
const zlib = require('zlib');


// jsonStream.on('data', ({key, value}) => {
//     if (_.difference(['features'], Object.keys(value)).length === 0 ){
//         console.log("zz")
//     }
// });


const pipeline = new chain([
  fs.createReadStream('/Users/zzz/Downloads/img/5cd829e258c0f87da18a394d.geojson', ),
//   zlib.createGunzip(),
  parser(),
//   new pick({filter: 'data'}),
//   new ignore({filter: /\b_meta\b/i}),
  new streamValues(),
  data => {
    // const value = data.value;
    console.log(data)
    // return value && value.department === 'accounting' ? data : null;
  }
]);

// let counter = 0;
pipeline.on('data', () => console.log("zz"));
pipeline.on('end', () =>
  console.log(`The accounting department has1 mployees.`));