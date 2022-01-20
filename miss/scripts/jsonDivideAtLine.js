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
            var counter = 0
            lineReader.on('line', (item) => {
                counter++
                if (counter > 20517996) {
                    if (!l.includes(['[{}',']',','], item)) {
                        if (count == 0) {
                            fs.writeSync(outStream, item + '\n')
                            count++
                        } else {
                            fs.writeSync(outStream, ',' + '\n')
                            fs.writeSync(outStream, item + '\n')
                        }
                }      
                }    

            })
            .on('close', () => {
                fs.writeSync(outStream, ']' + '\n')
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

var outStream = fs.openSync('/Users/zzz/Desktop/mongoimportExploded5-2.json', 'w')
fs.writeSync(outStream, '[' + '\n')

readfile('/Users/zzz/Desktop/mongoimportExploded5.json')