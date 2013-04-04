// Copyright (c) 2012-2013 Mark Ethan Trostler
// MIT License - http://opensource.org/licenses/mit-license.php
var events = require('events')
    , HubClient = require("../clients/server/eventClient")
    , Hub = require("../hub/hub")
    , http = require('http')
;

function getClient(url, cb) {
    var client = HubClient.getClientHub(url);
    client.on('eventHubReady', function() {
        cb(client);
    });
}

function beDone(runs, waitsFor) {
    var reallyDone;
    runs(function() { 
        setTimeout(function() { 
            reallyDone = true; 
            console.log('=================================================');
    }, 8000); });
    waitsFor(function() { return reallyDone; }, "All Done", 11000);
}

describe("Server Startup", function() {
    var port;

    beforeEach(function() { port = Hub.getPort(); Hub.start(); });
    afterEach(function() { Hub.shutdown(); });

    it("multicast events", function() {
        var client1
            , client2
            , client3
            , allConnected
            , gotFoo
            , listening = 0
            , gotResults
        ;

        runs(
            function() { 
                getClient('http://localhost:' + port, function(cl) {
                    client1 = cl;
                    getClient('http://localhost:' + port, function(cl) {
                        client2 = cl;
                        getClient('http://localhost:' + port, function(cl) {
                            client3 = cl;
                            allConnected = true;
                        });
                    });
                });
        });

        waitsFor(function() { return allConnected; }, "Clients could not connect to hub", 5000);

        runs(
            function() {

                client2.on('foo', function(data, callback) {
                    expect(data.data).toBe('rox');
                }, { type: 'multicast', secret: 'multi', cb: function(err) {
                        expect(err).toBeUndefined();
                        listening++;
                    }
                });

                client1.on('foo', function(data, callback) {
                    expect(data.data).toBe('rox');
                    callback(null, 'groovy');
                }, { type: 'multicast', secret: 'multi', cb: function(err) {
                        expect(err).toBeUndefined();
                        listening++;
                    }
                });
        });

        waitsFor(function() { return listening === 2; }, "Both listening for multicast", 5000);

        runs(function() {
          client3.emit('foo', { data: 'rox' }, function(err, val) {
                    expect(val).toBe('groovy');
                    expect(err).toBeNull();
                    gotResults = true;
                });
        });

        waitsFor(function() { return gotResults; }, "Sent multicast event - got results", 5000);

        runs(function() { client1.close(); client2.close(); client3.close(); });

        beDone(runs, waitsFor);
    });

    it("multicast event fails with wrong password", function() {
        var client1
            , client2
            , client3
            , allConnected
            , gotFoo
            , listening = 0
            , gotResults
        ;

        runs(
            function() { 
                getClient('http://localhost:' + port, function(cl) {
                    client1 = cl;
                    getClient('http://localhost:' + port, function(cl) {
                        client2 = cl;
                        getClient('http://localhost:' + port, function(cl) {
                            client3 = cl;
                            allConnected = true;
                        });
                    });
                });
        });

        waitsFor(function() { return allConnected; }, "Clients could not connect to hub", 5000);

        runs(
            function() {
                client2.on('foo', function(data, callback) {
                    expect(data.data).toBe('rox');
                    callback(null, 'groovy');
                }, { type: 'multicast', secret: 'multi', cb: function(err) {
                        expect(err).toBeUndefined();
                        listening++;
                    }
                });

                // Should never get called!
                client1.on('foo', function(data, callback) {
                    expect(true).toBe(false);
                }, { type: 'multicast', secret: 'multis', cb: function(err) {
                        expect(err).toBeDefined();
                        listening++;
                    }
                });
        });

        waitsFor(function() { return listening === 2; }, "Both listening for multicast", 5000);

        runs(function() {
          client3.emit('foo', { data: 'rox' }, function(err, val) {
                    expect(val).toBe('groovy');
                    expect(err).toBeNull();
                    gotResults = true;
                });
        });

        waitsFor(function() { return gotResults; }, "Sent multicast event - got results", 5000);

        runs(function() { client1.close(); client2.close(); client3.close(); });

        beDone(runs, waitsFor);
    });

});
