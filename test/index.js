
var nock = require('nock');
var assert = require('assert');

nock('http://www.rflab.co.za')
  .get('/')
//   .socketDelay(2000) // 2 seconds 
  .reply(301, '<html></html>');

nock('http://www.rflabb.co.za')
  .get('/')
//   .socketDelay(2000) // 2 seconds 
  .reply(404);
  
nock('http://www.ragingflame.co.za')
  .get('/')
  .socketDelay(25000) // 2 seconds 
  .reply(200, '<html></html>');
  
nock('http://www.slowragingflame.co.za')
  .get('/')
  .socketDelay(35000) // 2 seconds 
  .reply(200, '<html></html>');

var Monitor = require('../lib/monitor');

var monitorEvent = function(monitor, callback) {
    var event;
        
    monitor.on('up', function (res) {
        event = 'up';
        monitor.stop();
    });
    
    monitor.on('down', function (res) {
        event = 'down';
        monitor.stop();
    });
    
    monitor.on('error', function (res) {
        event = 'error';
        monitor.stop();
    });
    
    monitor.on('stop', function (website) {
        callback(event);
    });
};

describe( 'Monitor()', function() {
    
    it('should issue down event when 301 is given', function(done) {
    
        // website has a redirect, should emit down and show status message
        var ping = new Monitor({website: 'http://www.rflab.co.za', interval: 0.2});
        
        monitorEvent(ping, function callback(event) {
            assert.equal(event, 'down');
            done();
        });

    });
    
    it('should issue down event when 404 is given', function(done) {
    
        // website does not exist, should emit down and show status message
        var ping = new Monitor({website: 'http://www.rflabb.co.za', interval: 0.2});
        
        monitorEvent(ping, function callback(event) {
            assert.equal(event, 'down');
            done();
        });

    });
    
    it('should issue up event when 200 is given and within timeout', function(done) {
    
        // website does not exist, should emit down and show status message
        var ping = new Monitor({website: 'http://www.ragingflame.co.za', interval: 0.2, socket_timeout: 30});
        
        monitorEvent(ping, function callback(event) {
            assert.equal(event, 'up');
            done();
        });

    });
    
    it('should issue error event when above timeout', function(done) {
    
        // website does not exist, should emit down and show status message
        var ping = new Monitor({website: 'http://www.ragingflame.co.za', interval: 0.2, socket_timeout: 30});
        
        monitorEvent(ping, function callback(event) {
            assert.equal(event, 'error');
            done();
        });

    });
});

