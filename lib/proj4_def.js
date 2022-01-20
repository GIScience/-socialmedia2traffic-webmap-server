'use strict'

// Load `require` directives - external
const proj4 = require('proj4'),
    clc = require("cli-color"),
    l = require('lodash')
// Load `require` directives - external

var error = clc.red.bold,
    warn = clc.yellow,
    notice = clc.blue

proj4.defs(// Define a projection as a string and reference it.  Some explanation - https://github.com/proj4js/proj4js#named-projections
    
    [ 
        [
            'EPSG:4326',
            '+proj=longlat +datum=WGS84 +no_defs'
        ],
        [
            'EPSG:3857',
            '+proj=merc +a=6378137 +b=6378137 +lat_ts=0.0 +lon_0=0.0 +x_0=0.0 +y_0=0 +k=1.0 +units=m +nadgrids=@null +wktext  +no_defs'
        ],
        [
            'EPSG:3035',
            '+proj=laea +lat_0=52 +lon_0=10 +x_0=4321000 +y_0=3210000 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs'
        ]
    ]
);

function proj4Extent(epsg) { // Define extent of each epsg projection for raster's pixel generation. This is needed to have a standard raster generation where pixels overlap seamlessly other data sources. 

    try {

        var epsg_extents = [
            {
                'espg': 4326,
                'extent': [-180.0, -90.0, 180.0, 90.0]
            },
            {
                'espg': 3857,
                'extent': [-20000000, -20000000, 20000000, 20000000]
            },
            {
                'espg': 3035,
                'extent': [-19999950, -19999950, 20000000, 20000000]
            }
        ]
    
        return l.find(epsg_extents, { espg: epsg})
        
    } catch (e) {
        console.log(error('Error - proj4Extent() - > ' + e.message))
    }

}

module.exports = {
    proj4Extent
}