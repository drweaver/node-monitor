var nock = require('nock');
var assert = require('assert');
var async = require('async');

var Monitor = require('../lib/monitor');

var monitorEvent = function(monitor, monitorEvent) {
    async.each(['up', 'down', 'error'], function(event, callback) {
        monitor.on(event, function(res) {
            monitor.stop();
            monitorEvent(event);
            callback();
        });
    }, function(err){});
};

describe('Monitor()', function() {

    it('should issue down event when 301 is given', function(done) {

        var url = 'http://www.rflab.co.za';

        nock(url)
            .get('/')
            .reply(301, '<html></html>');

        // website has a redirect, should emit down and show status message
        var ping = new Monitor({
            website: url,
            interval: 0.2
        });

        monitorEvent(ping, function callback(event) {
            assert.equal(event, 'down');
            done();
        });

    });

    it('should issue down event when 404 is given', function(done) {

        var url = 'http://www.rflabb.co.za';

        nock(url)
            .get('/')
            .reply(404);

        // website does not exist, should emit down and show status message
        var ping = new Monitor({
            website: url,
            interval: 0.2
        });

        monitorEvent(ping, function callback(event) {
            assert.equal(event, 'down');
            done();
        });

    });

    it('should issue up event when 200 is given and within timeout', function(done) {

        var url = 'http://www.ragingflame.co.za';

        nock(url)
            .get('/')
            .socketDelay(25000) // 25 seconds 
            .reply(200, '<html></html>');

        // website does not exist, should emit down and show status message
        var ping = new Monitor({
            website: url,
            interval: 0.2,
            socket_timeout: 30
        });

        monitorEvent(ping, function callback(event) {
            assert.equal(event, 'up');
            done();
        });

    });

    it('should issue down event when socket times out', function(done) {

        var url = 'http://www.slowragingflame.co.za';

        nock(url)
            .get('/')
            .socketDelay(35000) // 35 seconds (above timeout!)
            .reply(200, '<html></html>');


        // website does not exist, should emit down and show status message
        var ping = new Monitor({
            website: url,
            interval: 0.2,
            socket_timeout: 30
        });

        monitorEvent(ping, function callback(event) {
            assert.equal(event, 'down');
            done();
        });

    });

    it('should issue error event when error in request occurs', function(done) {

        var url = 'http://www.badragingflame.co.za';

        nock(url)
            .get('/')
            .replyWithError('something awful happened');

        // website does not exist, should emit down and show status message
        var ping = new Monitor({
            website: url,
            interval: 0.2,
            socket_timeout: 30
        });

        monitorEvent(ping, function callback(event) {
            assert.equal(event, 'error');
            done();
        });

    });
});
