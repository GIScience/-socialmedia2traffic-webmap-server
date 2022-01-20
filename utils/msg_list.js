'use strict'

// Load `require` directives - external
const config = require('config'),
    clc = require("cli-color")
// Load `require` directives - internal

var error = clc.red.bold,
    warn = clc.yellow,
    notice = clc.blue

// Individual messages
const landingRouteWelcome = 'Welcome to the SM2T API :)',
    routeNotFound = '404 Routed Endpoint Not found :(',
    serverLaunchWelcome = 'Server listening on port ' + config.get('server.port') + '!',
    validationError = 'Bad params.',
    dbNotReady = 'Oops :( Database is not ready. Please try again after sometime. Thanks for your cooperation.',
    submitIdNotFound = 'Submitted Id not found :/',
    checkStatus = 'To get query status, use /status endpoint as directed in the documentation.',
    downloadReady = 'Export is ready to be downloaded. Please hit /download endpoint as directed in the documentation.',
    underProcess = 'Processing on it\'s way. Please check again.',
    geojsonFooter = ']}',
    downloadNotReady = 'Download .zip is not ready.',
    downloadError = 'Oops.. Something went wrong. Please try again. Thanks for your cooperation.'
    
function geojsonHeader(epsg = 4326) {

    try {
        
        return '{"type":"FeatureCollection", "crs":{"type": "name", "properties":{"name": "urn:ogc:def:crs:EPSG::' + epsg.toString() + '"}}, "features":['

    } catch (e) {
        console.log(error('Error - geojsonHeader() - > ' + e.message))
    }

}

const controller_closed_msg = 'Controller touched'
const submit_controller_try_msg = 'Submit Controller tried with internal messages'
const submit_conditions_not_met_msg = 'Submit conditions not met'
const has_param_error = 'Either query string is empty or one or more of the values is not string'
const has_param_success = 'Has param check passed successfully'
const pair_param_success = 'Param pair condition met successfully'
const valid_param_success = 'Valid pair condition met successfully'
const valid_param_error = 'Valid pair condition failed'
const pair_param_error_msg = 'Param pair condition failed'
const controller_error = 'Controller internal catch error'
const main_service_error = 'Main Service internal catch error'
const main_service_closed_msg = 'Main Service touched'
const main_service_try_msg = 'Main Service tried with internal messages'
const data_download_error_msg = 'Data Download internal catch error'
const data_download_closed_msg = 'Data Download touched'
const submit_query_error_msg = 'Submit query internal catch error'
const submit_query_closed_msg = 'Submit query touched'
const checks_failed = 'Controller checks failed'
const pipeline_failed = 'Generate pipeline failed'
const submit_survice_error = 'Submit Service internal catch error'
const db_conn_success = 'Db connection successful'
const dbinsert_error = 'Db insert internal catch error'
const dbupdate_error = 'Db update internal catch error'
const dbsearch_error = 'Db search internal catch error'
const rawdumptmp_success = 'Raw dump tmp successful'
const coll_insert_error = 'Collection Insert error'
const coll_insert_success = 'Collection Insert success'
const exec_service_error = 'Execute Service internal catch error'
const export_service_error = 'Export Service internal catch error'
const datadownload_error = 'Data download internal catch error'
const changecrs_success = 'CRS change successful'
const changecrs_error = 'CRS change internal catch error'
const getcentroid_success = 'Get centroid successful'
const getcentroid_error = 'Get centroid internal catch error'
const genpixel_success = 'Gen pixel successful'
const genpixel_error = 'Gen pixel internal catch error'
const aggregatecount_success = 'Aggregate count successful'
const aggregatecount_error = 'Aggregate count internal catch error'
const ohsome_dwn_success = 'OhSome data download successful'
const joingeojsontmp_success = 'Join GeoJSON successful'
const joingeojsonfinal_success = 'Join GeoJSON successful final'
const todiffformats_success = 'To Different Formats successful'
const rollback_success = 'Rollback successful'
const jsonstream_failed = 'JSON stream on data failed'
const jsonstream_ended = 'JSON stream end successful'
const single_pipeline_success = 'Single pipeline execution successful'
const single_pipeline_error = 'Single pipeline  internal catch error'
const ohsome_error = 'Reported Ohsome error'
const dbinsert = 'DB INSERT 🤡'
const dbupdate = 'DB UPDATE 🤡'
const dbsearch = 'DB SEARCH 🤡'
const datadownload_success = 'DATA DOWNLOAD 🤡'
const controller = 'CONTROLLER 🤡'
const mainservice = 'MAIN SERVICE 🤡'
const submitservice = 'SUBMIT SERVICE 🤡'
const pipeline = 'PIPELINE GENERATED 🤡'
const execservice = 'EXECUTE SERVICE 🤡'

module.exports = {
    landingRouteWelcome,
    routeNotFound,
    serverLaunchWelcome,
    validationError,
    dbNotReady,
    submitIdNotFound,
    checkStatus,
    downloadReady,
    underProcess,
    geojsonHeader,
    geojsonFooter,
    downloadNotReady,
    downloadError,

    controller_closed_msg,
    submit_controller_try_msg,
    submit_conditions_not_met_msg,
    has_param_error,
    has_param_success,
    pair_param_success,
    pair_param_error_msg,
    controller_error,
    main_service_error,
    main_service_closed_msg,
    main_service_try_msg,
    data_download_error_msg,
    data_download_closed_msg,
    submit_query_error_msg,
    submit_query_closed_msg,
    checks_failed,
    pipeline_failed,
    submit_survice_error,
    controller,
    mainservice,
    submitservice,
    db_conn_success,
    dbinsert_error,
    dbinsert,
    coll_insert_error,
    coll_insert_success,
    pipeline,
    exec_service_error,
    execservice,
    datadownload_success,
    datadownload_error,
    ohsome_dwn_success,
    changecrs_success,
    changecrs_error,
    jsonstream_failed,
    jsonstream_ended,
    single_pipeline_error,
    single_pipeline_success,
    valid_param_success,
    valid_param_error,
    dbsearch_error,
    dbsearch,
    getcentroid_success,
    getcentroid_error,
    genpixel_success,
    genpixel_error,
    aggregatecount_success,
    aggregatecount_error,
    joingeojsontmp_success,
    todiffformats_success,
    rollback_success,
    joingeojsonfinal_success,
    dbupdate_error,
    dbupdate,
    export_service_error,
    rawdumptmp_success,
    ohsome_error
}