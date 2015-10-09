

var http = require('http');
var https = require('https');
var util = require('util');
var EventEmitter = require('events').EventEmitter;
var url = require('url');
var statusCodes = http.STATUS_CODES;


/*
    Monitor Constructor
*/
function Monitor (opts) {
    // default http request method
    this.method = 'GET';

    // holds website to be monitored
    this.website = '';

    // ping intervals in minutes
    this.interval = 15;

    // default ping socket timeout in seconds 
    this.socket_timeout = 10;

    // default for response timeout in seconds
    // i.e. successful connection but response not recieved within timeout
    this.response_timeout = 30;

    // interval handler
    this.handle = null;

    // initialize the app
    this.init(opts);
}


/*
    Inherit from EventEmitter
*/
util.inherits(Monitor, EventEmitter);




Monitor.prototype.init = function (opts) {
    // opts.timeout ensures backward compatibility
    var interval = opts.interval || opts.timeout || 15;
    var website = opts.website;


    if (!website) {
        return this.emit('error', {msg: 'You did not specify a website to monitor'});
    }

    this.method = opts.method || this.method;
    this.socket_timeout = opts.socket_timeout || this.socket_timeout;
    this.response_timeout = opts.response_timeout || this.response_timeout;
    this.website = website;
    this.http = this.website.indexOf('https:', 0) === 0 ? https : http;

    this.interval = (interval * (60 * 1000));

    // start monitoring
    this.start();

    return this;
};




Monitor.prototype.start = function () {
    var self = this;
    var time = Date.now();

    //console.log("\nMonitoring: " + self.website + "\nTime: " + self.getFormatedDate(time) + "\n");

    // create an interval for pings
    self.handle = setInterval(function () {
        self.ping();
    }, self.interval);
    // at least run one immediately
    self.ping();
    return self;
};




Monitor.prototype.stop = function () {
    clearInterval(this.handle);
    this.handle = null;

    this.emit('stop', this.website);

    return this;
};




Monitor.prototype.ping = function () {
    var self = this;
    var req;
    var options = url.parse(self.website);

    options.method = this.method;

    req = self.http.request(options, function (res) {
        // Website is not ok
        if (res.statusCode !== 200) {
            req.abort();
            self.isNotOk(res.statusCode);
            return;
        }

        var timeout = setTimeout(function() {
            req.abort();
            // console.log('response timeout');
            self.isNotOk(598);
        }, self.response_timeout*1000);

        // even if we get a successful connection, web server may not provide a response within acceptable time
        res.on('data', function(chunk) {
            // NOP but we need to read all of this data otherwise we will get memory leak
            // console.log('got %d bytes of data', chunk.length);
        });
        res.on('end', function() {
            clearTimeout(timeout);
            // console.log('read all the data from the stream');
            self.isOk();
        });
    });

    req.on('socket', function(socket) {
       socket.setTimeout(self.socket_timeout*1000);
       socket.on('timeout', function() {
          self.isNotOk(598);
          req.abort();
       });
    });

    req.on('error', function(err) {
        var data = self.responseData(404, statusCodes[404 +'']);
        self.emit('error', data);
    });

    req.end();

    return this;
};




Monitor.prototype.isOk = function () {
    var data = this.responseData(200, 'OK');

    this.emit('up', data);

    return this;
};




Monitor.prototype.isNotOk = function (statusCode) {
    var msg = statusCodes[statusCode + ''];
    var data = this.responseData(statusCode, msg);

    this.emit('down', data);

    return this;
};




Monitor.prototype.responseData = function (statusCode, msg) {

    var data = {
        website: this.website,
        time: Date.now(),
        statusCode: statusCode,
        statusMessage: msg
    };

    return data;
};



Monitor.prototype.getFormatedDate = function (time) {
    var currentDate = new Date(time);

    currentDate = currentDate.toISOString();
    currentDate = currentDate.replace(/T/, ' ');
    currentDate = currentDate.replace(/\..+/, '');

    return currentDate;
};




module.exports = Monitor;

