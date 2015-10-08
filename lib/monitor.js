

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
    // i.e. successful connection but no response recieved within timeout
    this.socket_timeout = 30;

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

    req = this.http.request(options, function (res) {
        // Website is up
        if (res.statusCode === 200) {
            self.isOk();
        }
        // No error but website not ok
        else {
            self.isNotOk(res.statusCode);
        }
        // Must call this or will result in memory leak if response is not read!
        req.abort();
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

