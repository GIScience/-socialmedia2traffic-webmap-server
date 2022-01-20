const fs = require('fs')

var outputFile = '/Users/zzz/Desktop/fetchColl.json'
var tileFile = '/Users/zzz/code/heigit/jrc/edh_db/reference_docs/tiles.json'
var tileFetchZoom = 3
var ohsomeMetadataTime = '2020-06-29T03:00:00Z' // Obtain from here https://api.ohsome.org/v1/swagger-ui.html?urls.primaryName=Metadata#/Metadata/Metadata
var frameworkKeyVal = [
    {
        'k': 'amenity',
        'v': 'hospital'
    },
    {
        'k': 'amenity',
        'v': 'clinic'
    },
    {
        'k': 'amenity',
        'v': 'doctors'
    },
    {
        'k': 'healthcare',
        'v': '*'
    },
    {
        'k': 'amenity',
        'v': 'college'
    },
    {
        'k': 'amenity',
        'v': 'school'
    },
    {
        'k': 'amenity',
        'v': 'kindergarten'
    },
    {
        'k': 'amenity',
        'v': 'university'
    },
    {
        'k': 'highway',
        'v': 'motorway'
    },
    {
        'k': 'highway',
        'v': 'primary'
    },
    {
        'k': 'highway',
        'v': 'secondary'
    },
    {
        'k': 'highway',
        'v': 'tertiary'
    },
    {
        'k': 'highway',
        'v': 'trunk'
    },
    {
        'k': 'highway',
        'v': 'unclassified'
    },
    {
        'k': 'highway',
        'v': 'residential'
    },
    {
        'k': 'railway',
        'v': 'rail'
    },
    {
        'k': 'railway',
        'v': 'subway'
    },
    {
        'k': 'railway',
        'v': 'tram'
    },
    {
        'k': 'railway',
        'v': 'light_rail'
    },
    {
        'k': 'railway',
        'v': 'monorail'
    },
    {
        'k': 'aeroway',
        'v': 'aerodrome'
    },
    {
        'k': 'aerodrome',
        'v': '*'
    },
    {
        'k': 'man_made',
        'v': 'water_works'
    },
    {
        'k': 'power',
        'v': 'plant'
    },
    {
        'k': 'heritage',
        'v': '*'
    },
    {
        'k': 'bridge',
        'v': 'yes'
    },
    {
        'k': 'amenity',
        'v': 'place_of_worship'
    },
    {
        'k': 'leisure',
        'v': 'stadium'
    },
    {
        'k': 'leisure',
        'v': 'sport_centre'
    },
    {
        'k': 'leisure',
        'v': 'water_park'
    },
    {
        'k': 'amenity',
        'v': 'cinema'
    },
    {
        'k': 'amenity',
        'v': 'food_court'
    },
    {
        'k': 'amenity',
        'v': 'festival_grounds'
    },
    {
        'k': 'amenity',
        'v': 'events_venue'
    },
    {
        'k': 'amenity',
        'v': 'theatre'
    },
    {
        'k': 'amenity',
        'v': 'sports_hall'
    },
    {
        'k': 'amenity',
        'v': 'conference_centre'
    },
    {
        'k': 'shop',
        'v': 'mall'
    },
    {
        'k': 'amenity',
        'v': 'nightclub'
    },
    {
        'k': 'tourism',
        'v': 'theme_park'
    },
    {
        'k': 'tourism',
        'v': 'zoo'
    },
    {
        'k': 'tourism',
        'v': 'museum'
    },
    {
        'k': 'amenity',
        'v': 'marketplace'
    }
]

var tileArr = JSON.parse(fs.readFileSync(tileFile, 'utf8'))

var tileFetchZoomObj = []
for (let i=0; i<tileArr.length; i++) {
    if (tileArr[i]['zoom'] == tileFetchZoom) {
        tileFetchZoomObj.push(tileArr[i])
    }
}

var fetchColl = []
for (let i=0; i<frameworkKeyVal.length; i++) {
    for (let j=0; j<tileFetchZoomObj.length; j++) {

        fetchColl.push({
            'status': 'success',
            'zoom': tileFetchZoom,
            'tileGeom': tileFetchZoomObj[j]['tileGeom'],
            'key': frameworkKeyVal[i]['k'],
            'value': frameworkKeyVal[i]['v'],
            'ohsomeDataTime': ohsomeMetadataTime
        })

    }
}

fs.writeFile(outputFile, JSON.stringify(fetchColl), function(err) {
    console.log('done');
})