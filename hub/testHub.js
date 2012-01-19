var vows = require('vows')
    , assert = require('assert')
    , events = require('events')
    , suite  = vows.describe('EventHub')
    , spawn  = require('child_process').spawn
    , EventHub = require('EventHub')
    , hub
    ;

function beDone() {
    var f = spawn('npm', [ 'stop' ]);
    f.on('exit', function() { process.exit(); });
}

hub = spawn('npm', [ 'start' ]);

hub.stderr.on('data', function(data) {
    var ehub = EventHub.getClientHub('http://localhost:5883');

    suite.addBatch({
        'basic': {
            topic: function() { ehub.on('eventHubReady', this.callback); }
            , 'connected to default port': function() {
                    assert.ok(true, 'connected to hub');
            }
            , 'send an event': {
                topic: function() {
                    var promise = new(events.EventEmitter);

                    ehub.on('hello', function(data) { promise.emit('success', data); });
                    ehub.emit('hello', { some: 'data' });

                    return promise;
                }
                , 'got event': function(data) {
                    assert.equal('data', data.some);
                    ehub.removeAllListeners('hello');
                    beDone();
                }
            }
        }
    }).run();
});
