'use strict'

// Load `require` directives - external
const l = require('lodash'),
    clc = require("cli-color")
// Load `require` directives - internal

var error = clc.red.bold,
    warn = clc.yellow,
    notice = clc.blue

class UrlParser {
    /**
     * Class to parse url body/params
     */
    constructor() {
    }

    getKeysList(urlArgs) {

        try {
            return l.keys(urlArgs)
        } catch (e) {
            console.log(error('Error - getKeysList() - > ' + e.message))
        }

    }

    getValuesList(urlArgs) {

        try {
            return l.values(urlArgs)
        } catch (e) {
            console.log(error('Error - getValuesList() - > ' + e.message))
        }

    }

    getKeyValueJsObj(urlArgs) {

        try {
            return urlArgs
        } catch (e) {
            console.log(error('Error - getKeyValueJsObj() - > ' + e.message))
        }

    }

    getKeyOfValue(urlArgs, value) {

        try {
            return l.findKey(urlArgs, l.partial(l.isEqual, value))
        } catch (e) {
            console.log(error('Error - getKeyOfValue() - > ' + e.message))
        }

    }

    getValueOfKey(urlArgs, key) {

        try {
            return urlArgs[key]
        } catch (e) {
            console.log(error('Error - getValueOfKey() - > ' + e.message))
        }

    }

    getFilterKeyList(filterList) {

        try {

            var filterKeyListAll = []

            l.map(filterList, (item) => {
                filterKeyListAll.push(item.filterKeyList)
            })

            filterKeyListAll = l.flatten(filterKeyListAll);
            filterKeyListAll = l.uniqWith(filterKeyListAll, l.isEqual)

            return filterKeyListAll
            
        } catch (e) {
            console.log(error('Error - getFilterKeyList() - > ' + e.message))
        }

    }
    
    getFwFilterList(fwDefinition) {
        /**
         * Add originId and filterId
         * to better identify which
         * feature fits which filter type
         * derived from FwHarmoniser
         */

        try {

            l.map(fwDefinition, (item, index) => {
                var originId 
    
                switch (item.source.origin){
                    case 'openstreetmap':
                        originId = '@osmId'
                        break
                    case 'globalhumansettlementlayer':
                        originId = '@ghslId'
                }
    
                if (item.source.key != undefined && item.source.value != '*') {
                    item.filterKeyList = [originId, item.source.key]
                    item.filterValueList = [item.source.value]
                } else if (item.source.key != undefined && item.source.value == '*') {
                    item.filterKeyList = [originId, item.source.key]
                    item.filterValueList = null
                } else {
                    item.filterKeyList = [originId]
                    item.filterValueList = null
                }
                
                item.filterId = index
                return 
            })
    
            return fwDefinition
            
        } catch (e) {
            console.log(error('Error - getFwFilterList() - > ' + e.message))
        }

    }

}

module.exports = UrlParser