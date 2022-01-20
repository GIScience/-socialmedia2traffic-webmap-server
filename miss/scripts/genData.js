const l = require('lodash'),
    fs = require('fs'),
    axios = require('axios'),
    path = require('path'),
    pick = require('stream-json/filters/Pick'),
    {streamArray} = require('stream-json/streamers/StreamArray'),
    Batch = require('stream-json/utils/Batch'),
    {chain} = require('stream-chain'),
    flat = require('flat')
// Load `require` directives - internal

var counter = -1
function refreshData()
{
    x = 0.1;  // 5 Seconds
    counter += 1

    // Do your thing here

    fs.readFile('/root/jrc/genData/data/tilesid_europe.geojson', 'utf8', (err, jsonString) => {
        var arr = JSON.parse(jsonString).features

        var element =  arr[counter]

        var xmin = element.properties.left,
                ymin = element.properties.bottom,
                xmax = element.properties.right,
                ymax = element.properties.top

            var url = 'http://localhost:3003/api/v0.0/query/submit?rawData=True&dataFormat=["geojson","geotif"]&snapshotDate=2019-12-10T23:00:00Z&apiToken=123abc&themeNameVersion=sendaiHealthv0.0&aoi=[' + xmin +','+ ymin +',' + xmax +','+ ymax + ']&dataSource=False&dataAggregate=[1000, 1000, 3035]&tileId=' + element.properties.pid

            console.log(url)

            axios({
                method: 'get',
                url,
                responseType: 'json'
            })
            .then((result) => {
                console.log(counter)
                // res(result.data.extractRegion.temporalExtent.toTimestamp)
            })
            .catch((e) => {
                console.log(e.message)
                // rej(e.message)
            })

    })
	
	if (counter < 125-1) { // 1378 for global and 125 for europe
		setTimeout(refreshData, x*1000);
	} 
    
    // console.log(counter)

    
}


refreshData();

