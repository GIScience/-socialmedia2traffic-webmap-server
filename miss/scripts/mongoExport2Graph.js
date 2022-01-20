const lineReader = require('line-reader'),
    fs = require('fs')

var theme = 'sendaiRailwayv0.0'
var exportCSV = '/Users/zzz/code/heigit/jrc/miss/ppt/datagen_timetaken_spreadsheet-railway-new.csv'

fs.appendFileSync(exportCSV, 'areaInSqDegree, fileSizeInMb, numOfFeaturesProcessed, serverProcessingTimeInMin\n');

lineReader.eachLine('/Users/zzz/Desktop/query_coll.json', function(line) {
    
    var query = JSON.parse(line)

    if (query.numOfFeaturesProcessed != undefined && query.themeNameVersion == theme) {
        var coord = query.tileGeom.tileGeom.coordinates
        // console.log(coord)
        var areaInSqDegree = Math.abs( (coord[0][0][0] - coord[0][2][0]) * (coord[0][0][1] - coord[0][2][1]) )
        fs.appendFileSync(exportCSV, areaInSqDegree + ', ' + query.fileSizeInMb + ', ' + query.numOfFeaturesProcessed + ', ' + query.serverProcessingTimeInMin + '\n');
    }

});
