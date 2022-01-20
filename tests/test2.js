// const StreamObject = require('stream-json/streamers/StreamObject');
// const fs = require('fs');
// const _ = require('underscore');
// const jsonStream = StreamObject.withParser();

// var inputfile = "/Users/zzz/Downloads/img/5cd829e258c0f87da18a394d.geojson";
// var outputfile = "/Users/zzz/Downloads/img/5cd829e258c0f87da18a394d.json";

// var outstream = fs.createWriteStream(outputfile);
// outstream.readable = true;
// outstream.writable = true;

// jsonStream.on('data', ({key, value}) => {
//     if (_.difference(['features'], Object.keys(value)).length === 0 ){
//         outstream.write(JSON.stringify(Object(value['features'])) + '\n');
//         console.log(value['features'])
//     }
// });

// jsonStream.on('end', () => {});

// fs.createReadStream(inputfile).pipe(jsonStream.input);

const StreamObject = require('stream-json/streamers/StreamObject');
const fs = require('fs');
const _ = require('underscore');
const jsonStream = StreamObject.withParser();

var inputfile = "/Users/zzz/Downloads/img/test.geojson";
var outputfile = "/Users/zzz/Downloads/img/5cd829e258c0f87da18a394d.json";

var outstream = fs.createWriteStream(outputfile);
outstream.writable = true;

jsonStream.on('data', ({key, value}) => {
    if (_.difference(['features'], Object.keys(value)).length === 0 ){
        outstream.write(JSON.stringify(Object.values(value['features'])));
    }
});

jsonStream.on('end', () => console.log('Done Export!'));

fs.createReadStream(inputfile).pipe(jsonStream.input);