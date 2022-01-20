var fs = require('fs'),
requestHttp = require('request')

var theme = 'sendaiCulturalHeritageSitev0.0'

var tile = JSON.parse(fs.readFileSync('/Users/zzz/code/heigit/jrc/edh_db/reference_docs/tiles.json', 'utf8'));
var exportFile = '/Users/zzz/Desktop/themeReq.json'

var req = []

var count0 = 0
var count1 = 0
var count2 = 0
var count3 = 0
var count4 = 0
var count5 = 0
var count6 = 0
var count7 = 0
var count8 = 0

for (let i=0; i<tile.length; i++) {

    var z = tile[i]['zoom']

    // if (z == 0 && count0 < 500) {
    //     var coord = tile[i]['tileGeom']['coordinates']
    //     var x = Math.round((coord[0][0][0] + coord[0][2][0]) / 2)
    //     var y = Math.round((coord[0][0][1] + coord[0][2][1]) / 2)

    //     req.push('http://173.249.18.211:8080/api/v1.1/submit?themeNameVersion=' + theme + '&apiToken=123abc&long=' + x + '&lat=' + y + '&zoom=' + z + '&dataAggregate=[1000,1000,3857]&rawData=False&rawCentroid=False&dataSource=False&dataFormat=["geojson"]')
    //     req.push('http://173.249.18.211:8080/api/v1.1/submit?themeNameVersion=' + theme + '&apiToken=123abc&long=' + x + '&lat=' + y + '&zoom=' + z + '&dataAggregate=[250,250,3857]&rawData=False&rawCentroid=False&dataSource=False&dataFormat=["geojson"]')

    //     count0++
    // }

    // if (z == 1 && count1 < 500) {
    //     var coord = tile[i]['tileGeom']['coordinates']
    //     var x = Math.round((coord[0][0][0] + coord[0][2][0]) / 2)
    //     var y = Math.round((coord[0][0][1] + coord[0][2][1]) / 2)

    //     req.push('http://173.249.18.211:8080/api/v1.1/submit?themeNameVersion=' + theme + '&apiToken=123abc&long=' + x + '&lat=' + y + '&zoom=' + z + '&dataAggregate=[1000,1000,3857]&rawData=False&rawCentroid=False&dataSource=False&dataFormat=["geojson"]')
    //     req.push('http://173.249.18.211:8080/api/v1.1/submit?themeNameVersion=' + theme + '&apiToken=123abc&long=' + x + '&lat=' + y + '&zoom=' + z + '&dataAggregate=[250,250,3857]&rawData=False&rawCentroid=False&dataSource=False&dataFormat=["geojson"]')

    //     count1++
    // }

    // if (z == 2 && count2 < 500) {
    //     var coord = tile[i]['tileGeom']['coordinates']
    //     var x = Math.round((coord[0][0][0] + coord[0][2][0]) / 2)
    //     var y = Math.round((coord[0][0][1] + coord[0][2][1]) / 2)

    //     req.push('http://173.249.18.211:8080/api/v1.1/submit?themeNameVersion=' + theme + '&apiToken=123abc&long=' + x + '&lat=' + y + '&zoom=' + z + '&dataAggregate=[1000,1000,3857]&rawData=False&rawCentroid=False&dataSource=False&dataFormat=["geojson"]')
    //     req.push('http://173.249.18.211:8080/api/v1.1/submit?themeNameVersion=' + theme + '&apiToken=123abc&long=' + x + '&lat=' + y + '&zoom=' + z + '&dataAggregate=[250,250,3857]&rawData=False&rawCentroid=False&dataSource=False&dataFormat=["geojson"]')

    //     count2++
    // }

    // if (z == 3 && count3 < 500) {
    //     var coord = tile[i]['tileGeom']['coordinates']
    //     var x = Math.round((coord[0][0][0] + coord[0][2][0]) / 2)
    //     var y = Math.round((coord[0][0][1] + coord[0][2][1]) / 2)

    //     req.push('http://173.249.18.211:8080/api/v1.1/submit?themeNameVersion=' + theme + '&apiToken=123abc&long=' + x + '&lat=' + y + '&zoom=' + z + '&dataAggregate=[1000,1000,3857]&rawData=False&rawCentroid=False&dataSource=False&dataFormat=["geojson"]')
    //     req.push('http://173.249.18.211:8080/api/v1.1/submit?themeNameVersion=' + theme + '&apiToken=123abc&long=' + x + '&lat=' + y + '&zoom=' + z + '&dataAggregate=[250,250,3857]&rawData=False&rawCentroid=False&dataSource=False&dataFormat=["geojson"]')

    //     count3++
    // }

    // if (z == 4 && count4 < 500) {
    //     var coord = tile[i]['tileGeom']['coordinates']
    //     var x = Math.round((coord[0][0][0] + coord[0][2][0]) / 2)
    //     var y = Math.round((coord[0][0][1] + coord[0][2][1]) / 2)

    //     req.push('http://173.249.18.211:8080/api/v1.1/submit?themeNameVersion=' + theme + '&apiToken=123abc&long=' + x + '&lat=' + y + '&zoom=' + z + '&dataAggregate=[1000,1000,3857]&rawData=False&rawCentroid=False&dataSource=False&dataFormat=["geojson"]')
    //     req.push('http://173.249.18.211:8080/api/v1.1/submit?themeNameVersion=' + theme + '&apiToken=123abc&long=' + x + '&lat=' + y + '&zoom=' + z + '&dataAggregate=[250,250,3857]&rawData=False&rawCentroid=False&dataSource=False&dataFormat=["geojson"]')

    //     count4++
    // }

    // if (z == 5 && count5 < 500 && tile[i]['xMin'] > -16 && tile[i]['xMax'] < 41 && tile[i]['yMin'] > 34 && tile[i]['yMax'] < 69) {
    //     var coord = tile[i]['tileGeom']['coordinates']
    //     var x = Math.round((coord[0][0][0] + coord[0][2][0]) / 2)
    //     var y = Math.round((coord[0][0][1] + coord[0][2][1]) / 2)

    //     req.push('http://173.249.18.211:8080/api/v1.1/submit?themeNameVersion=' + theme + '&apiToken=123abc&long=' + x + '&lat=' + y + '&zoom=' + z + '&dataAggregate=[1000,1000,3857]&rawData=False&rawCentroid=False&dataSource=False&dataFormat=["geojson"]')
    //     req.push('http://173.249.18.211:8080/api/v1.1/submit?themeNameVersion=' + theme + '&apiToken=123abc&long=' + x + '&lat=' + y + '&zoom=' + z + '&dataAggregate=[250,250,3857]&rawData=False&rawCentroid=False&dataSource=False&dataFormat=["geojson"]')
    //     req.push('http://173.249.18.211:8080/api/v1.1/submit?themeNameVersion=' + theme + '&apiToken=123abc&long=' + x + '&lat=' + y + '&zoom=' + z + '&dataAggregate=[100,100,3857]&rawData=False&rawCentroid=False&dataSource=False&dataFormat=["geojson"]')

    //     count5++
    // }

    // if (z == 6 && count6 < 500 && tile[i]['xMin'] > -16 && tile[i]['xMax'] < 41 && tile[i]['yMin'] > 34 && tile[i]['yMax'] < 69) {
    //     var coord = tile[i]['tileGeom']['coordinates']
    //     var x = Math.round((coord[0][0][0] + coord[0][2][0]) / 2)
    //     var y = Math.round((coord[0][0][1] + coord[0][2][1]) / 2)

    //     req.push('http://173.249.18.211:8080/api/v1.1/submit?themeNameVersion=' + theme + '&apiToken=123abc&long=' + x + '&lat=' + y + '&zoom=' + z + '&dataAggregate=[1000,1000,3857]&rawData=False&rawCentroid=False&dataSource=False&dataFormat=["geojson"]')
    //     req.push('http://173.249.18.211:8080/api/v1.1/submit?themeNameVersion=' + theme + '&apiToken=123abc&long=' + x + '&lat=' + y + '&zoom=' + z + '&dataAggregate=[250,250,3857]&rawData=False&rawCentroid=False&dataSource=False&dataFormat=["geojson"]')
    //     req.push('http://173.249.18.211:8080/api/v1.1/submit?themeNameVersion=' + theme + '&apiToken=123abc&long=' + x + '&lat=' + y + '&zoom=' + z + '&dataAggregate=[100,100,3857]&rawData=False&rawCentroid=False&dataSource=False&dataFormat=["geojson"]')

    //     count6++
    // }

    // if (z == 7 && count7 < 500 && tile[i]['xMin'] > 6 && tile[i]['xMax'] < 22 && tile[i]['yMin'] > 39 && tile[i]['yMax'] < 60) {
    //     var coord = tile[i]['tileGeom']['coordinates']
    //     var x = Math.round((coord[0][0][0] + coord[0][2][0]) / 2)
    //     var y = Math.round((coord[0][0][1] + coord[0][2][1]) / 2)

    //     req.push('http://173.249.18.211:8080/api/v1.1/submit?themeNameVersion=' + theme + '&apiToken=123abc&long=' + x + '&lat=' + y + '&zoom=' + z + '&dataAggregate=[1000,1000,3857]&rawData=False&rawCentroid=False&dataSource=False&dataFormat=["geojson"]')
    //     req.push('http://173.249.18.211:8080/api/v1.1/submit?themeNameVersion=' + theme + '&apiToken=123abc&long=' + x + '&lat=' + y + '&zoom=' + z + '&dataAggregate=[250,250,3857]&rawData=False&rawCentroid=False&dataSource=False&dataFormat=["geojson"]')
    //     req.push('http://173.249.18.211:8080/api/v1.1/submit?themeNameVersion=' + theme + '&apiToken=123abc&long=' + x + '&lat=' + y + '&zoom=' + z + '&dataAggregate=[100,100,3857]&rawData=False&rawCentroid=False&dataSource=False&dataFormat=["geojson"]')

    //     count7++
    // }

    if (z == 8 && count8 < 500 && tile[i]['xMin'] > 2 && tile[i]['xMax'] < 8 && tile[i]['yMin'] > 44 && tile[i]['yMax'] < 53) {
        var coord = tile[i]['tileGeom']['coordinates']
        var x = Math.round((coord[0][0][0] + coord[0][2][0]) / 2)
        var y = Math.round((coord[0][0][1] + coord[0][2][1]) / 2)

        req.push('http://173.249.18.211:8080/api/v1.1/submit?themeNameVersion=' + theme + '&apiToken=123abc&long=' + x + '&lat=' + y + '&zoom=' + z + '&dataAggregate=[1000,1000,3857]&rawData=False&rawCentroid=False&dataSource=False&dataFormat=["geojson"]')
        // req.push('http://173.249.18.211:8080/api/v1.1/submit?themeNameVersion=' + theme + '&apiToken=123abc&long=' + x + '&lat=' + y + '&zoom=' + z + '&dataAggregate=[250,250,3857]&rawData=False&rawCentroid=False&dataSource=False&dataFormat=["geojson"]')
        // req.push('http://173.249.18.211:8080/api/v1.1/submit?themeNameVersion=' + theme + '&apiToken=123abc&long=' + x + '&lat=' + y + '&zoom=' + z + '&dataAggregate=[100,100,3857]&rawData=False&rawCentroid=False&dataSource=False&dataFormat=["geojson"]')

        count8++
    }
}

async function singleQuery(url) {

    try {
        
        var done = 0
        while (true) {
            requestHttp.get({url:url}, (serverRes) => {
                // console.log('Server Response (Set to true if the timeout was a connection timeout, false or undefined otherwise.) > ', serverRes)
            }) 
                .on('response', (rHttp) => {
                    // console.log(rHttp.statusCode, ' --- rHttp');
                    if (rHttp.statusCode != 200) {
                        console.log('Error - runRequest() - > ' + rHttp.statusCode + ' Server Error!')
                    } 
                })
                .on('data', (data) => {
                    data = data.toString()
                    data = JSON.parse(data)
                    // console.log(data);
                    if (typeof(data['downloadLink']) == 'string') {
                        // console.log('processing done');
                        done = 1
                    }
                })
                .on('end', () => {
                    // res()
                })
                .on('error', (e) => {
                    console.log('Error - requestScript - > ' + e.message)
                    // rej()
                })
    
            // console.log("before timeout");
            await new Promise(resolve => setTimeout(resolve, 1000));
            // console.log("after timeout");

            if (done == 1) {
                break
            }
            
        }

        return

    } catch (e) {
        console.log('singleQuery > error', e);
    }

}
 
async function runReq(req) {
    try {
        
        for (let i=0; i<req.length; i++) {
            console.log(i + '/' + req.length + ' > ' + req[i]);
            await singleQuery(req[i])
        }

    } catch (e) {
        console.log('runReq > error', e);
    }
}

// runReq(req) // -- Run request one by one




async function singleQueryAll(url) {

    try {
        
        requestHttp.get({url:url}, (serverRes) => {
            // console.log('Server Response (Set to true if the timeout was a connection timeout, false or undefined otherwise.) > ', serverRes)
        }) 
            .on('response', (rHttp) => {
                // console.log(rHttp.statusCode, ' --- rHttp');
                if (rHttp.statusCode != 200) {
                    console.log('Error - runRequest() - > ' + rHttp.statusCode + ' Server Error!')
                } 
            })
            .on('data', (data) => {
                // data = data.toString()
                // data = JSON.parse(data)
                // // console.log(data);
                // if (typeof(data['downloadLink']) == 'string') {
                //     // console.log('processing done');
                //     done = 1
                // }
            })
            .on('end', () => {
                // res()
            })
            .on('error', (e) => {
                console.log('Error - request - > ' + e.message)
                // rej()
            })

        return

    } catch (e) {
        console.log('singleQueryAll > error', e);
    }

}

async function runReqAll(req) {
    try {
        
        for (let i=0; i<req.length; i++) {
            console.log(i + '/' + req.length + ' > ' + req[i]);
            singleQueryAll(req[i])
            await new Promise(resolve => setTimeout(resolve, 1000));
        }

    } catch (e) {
        console.log('runReq > error', e);
    }
}

// runReqAll(req) // -- Run all request in one shot after 1 sec diff

for (let i=0; i<req.length; i++) {
    fs.appendFileSync(exportFile, req[i] + '\n')
}