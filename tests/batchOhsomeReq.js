const requestHttp = require('request'),
    fs = require('fs'),
    progressHttp = require('request-progress')

const bboxFile = '/Users/zzz/Desktop/bbox.txt'
const downPathDir = '/Users/zzz/Desktop/ohsome'

function getOhsome(bbox, outputFile) {

        try {
            var url = 'https://api.ohsome.org/v1/elements/geometry'

            var params = { bboxes: bbox, 
                properties: 'tags,metadata',
                showMetadata: 'true',
                time: '2020-06-29T03:00:00Z',
                clipGeometry: 'false',
                filter: 'man_made=water_works and (geometry:point or geometry:polygon or geometry:line)'}

            var outStream = fs.createWriteStream(outputFile)
            outStream.writable = true

            return new Promise((res, rej) => {
                progressHttp(
                    requestHttp.get({url:url, qs:params}) 
                        .on('response', (rHttp) => {
                            console.log("response");
                            if (rHttp.statusCode != 200) {
                                rej()
                            }
                        })
                        .on('data', (data) => {
                            console.log('decoded chunk')
                            outStream.write(data.toString())
                        })
                        .on('end', () => {
                            res()
                        })
                        .on('error', (e) => {
                            console.log('Error - request - > ' + e)
                            rej()
                        })
                )
                .on('progress', (state) => {
                    console.log('progressing1 > ', state)
                })
                .on('error', (e) => {
                    console.log("progressing2 > ", e);
                    rej() 
                })
                .on('end', () => {
                    console.log("progressing3 > resolved");
                    res()
                })
                // .pipe(fs.createWriteStream(outputFile))
            })
        } catch (e) {
            console.log("getOhsome > ", e);
        }
    
}

async function run() {
    try {
        
        var text = fs.readFileSync(bboxFile)
        var textByLine = text.toString().split("\n")   

        for (let i=0; i<textByLine.length; i++) {
            let outputFile = downPathDir + '/' + i + '.geojson'
            console.log(textByLine[i]);
            await getOhsome(textByLine[i], outputFile)
                .then((r) => {
                    console.log('getOhsome res');
                })
                .catch((e) => {
                    console.log('getOhsome err', e);
                })
        }

        return

    } catch (e) {
        console.log("run > ", e);
    }
}

run()