'use strict'

// Load `require` directives - external
const appRoot = require('app-root-path'),
    winstonJS = require('winston'),
    config = require('config')
// Load `require` directives - internal

var options = { // define the custom settings for each transport (file, console)
    file: {
        level: 'info',
        filename: `${appRoot}/${config.get('server.logDir')}`, 
        handleExceptions: true,
        json: true,
        maxsize: 5242880, // Switch to new file after 5MB size
        colorize: false,
    },
    console: {
        level: 'debug',
        handleExceptions: true,
        json: false,
        colorize: true,
    },
};


var winston = winstonJS.createLogger({
    // instantiate a new Winston Logger with the settings defined above
    transports: [
        new winstonJS.transports.File(options.file),
        new winstonJS.transports.Console(options.console)
    ],
    exitOnError: false, // do not exit on handled exceptions
});

winston.stream = {
    // create a stream object with a 'write' function that will be used by `morgan`
    write: function(message, encoding) {
        // use the 'info' log level so the output will be picked up by both transports (file and console)
        winston.info(message);
    },
};

module.exports = winston;