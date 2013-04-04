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
    runs(function() { setTimeout(function() { reallyDone = true; }, 20000); });
    waitsFor(function() { return reallyDone; }, "All Done", 21000);
}

describe("Server Startup", function() {
    var port;

    beforeEach(function() { port = Hub.getPort(); Hub.start(); });
    afterEach(function() { Hub.shutdown(); });

    it("Started and can connect", function() {
        var client
            , connected
        ;

        runs(function() {
            getClient('http://localhost:' + port, function(cl) {
                client = cl;
                connected = true;
            });
        });

        waitsFor(function() { return connected; }, "Client could not connect to hub", 5000);
        runs(function() { client.close(); expect(connected).toBeTruthy(); });

        beDone(runs, waitsFor);
    });
    it("Get socket.io JS", function(done) {
        var path = '/socket.io/socket.io.js';
        http.get({ hostname: 'localhost', port: port, path: path, agent: false }, 
            function (res) {
                expect(res.statusCode).toEqual(200);
                done();
            }
        );
    });
    it("Get yui3 JS", function(done) {
        var path = '/yui3.js';
        http.get({ hostname: 'localhost', port: port, path: path, agent: false }, 
            function (res) {
                expect(res.statusCode).toEqual(200);
                done();
            }
        );
    });
    it("Get jquery JS", function(done) {
        var path = '/jquery.js';
        http.get({ hostname: 'localhost', port: port, path: path, agent: false }, 
            function (res) {
                expect(res.statusCode).toEqual(200);
                done();
            }
        );
    });
    it("Get anything else 404", function(done) {
        var path = '/foobie.js';
        http.get({ hostname: 'localhost', port: port, path: path, agent: false }, 
            function (res) {
                expect(res.statusCode).toEqual(404);
                done();
            }
        );
    });
    it("Pass simple broadcast event", function() {
        var client1
            , client2
            , client3
            , allConnected
            , gotFoo1
            , gotFoo2
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
            }
        );

        waitsFor(function() { return allConnected; }, "Clients could not connect to hub", 5000);

        runs(
            function() { 
                client1.on('foo', function(data) {
                    expect(data.some).toBe('data');
                    gotFoo1 = true;
                });
                client3.on('foo', function(data) {
                    expect(data.some).toBe('data');
                    gotFoo2 = true;
                });
                client2.emit('foo', { some: 'data' });
            }
        );

        waitsFor(function() { return gotFoo1 && gotFoo2; }, "Clients send/receive event", 5000);

        runs(function() { 
            client1.close(); 
            client2.close(); 
            client3.close(); 
            expect(gotFoo1).toBeTruthy(); 
            expect(gotFoo2).toBeTruthy(); 
        });

        beDone(runs, waitsFor);
    });
    it("Pass simple unicast event", function() {
        var client1
            , client2
            , bothConnected
            , gotFoo
        ;

        runs(
            function() { 
                getClient('http://localhost:' + port + '?token=ehrox', function(cl) {
                    client1 = cl;
                    getClient('http://localhost:' + port, function(cl) {
                        client2 = cl;
                        bothConnected = true;
                    });
                });
            }
        );

        waitsFor(function() { return bothConnected; }, "Clients could not connect to hub", 5000);

        runs(
            function() { 
                client1.on('foo', function(data) {
                    expect(data.data).toBe('rox');
                    gotFoo = true;
                }, { type: 'unicast' });
                client2.emit('foo', { data: 'rox' });
            }
        );

        waitsFor(function() { return gotFoo; }, "Clients send/receive event", 5000);
        runs(function() { client1.close(); client2.close(); expect(gotFoo).toBeTruthy(); });

        beDone(runs, waitsFor);
    });
    it("unicast event callback", function() {
        var client1
            , client2
            , bothConnected
            , gotFoo
        ;

        runs(
            function() { 
                getClient('http://localhost:' + port + '?token=ehrox', function(cl) {
                    client1 = cl;
                    getClient('http://localhost:' + port, function(cl) {
                        client2 = cl;
                        bothConnected = true;
                    });
                });
            }
        );

        waitsFor(function() { return bothConnected; }, "Clients could not connect to hub", 5000);

        runs(
            function() { 
                client1.on('foo', function(data, callback) {
                    expect(data.data).toBe('rox');
                    callback(null, { data: 'rox' });
                }, { type: 'unicast', cb: function(err) {
                    if (!err) {
                        client2.emit('foo', { data: 'rox' }, 
                            function(err, data) { expect(data.data).toBe('rox'); gotFoo = true; });
                        };
                    }
                });
            }
        );

        waitsFor(function() { return gotFoo; }, "Clients send/receive event", 5000);
        runs(function() { client1.close(); client2.close(); expect(gotFoo).toBeTruthy(); });

        beDone(runs, waitsFor);
    });

    it("unauth unicast event callback", function() {
        var client1
            , connected
            , failed
        ;

        runs(
            function() { 
                getClient('http://localhost:' + port, function(cl) {
                    client1 = cl;
                    connected = true;
                });
            }
        );

        waitsFor(function() { return connected; }, "Client could not connect to hub", 5000);

        runs(
            function() { 
                client1.on('foo', 
                    function() {}
                    , { 
                        type: 'unicast'
                        , cb: function(err) {
                            failed = err;
                        }
                    }
                );
            }
        );

        waitsFor(function() { return failed; }, "Clients send/receive event", 5000);
        runs(function() { client1.close(); expect(failed.error).toMatch(/not authorized/i); });

        beDone(runs, waitsFor);
    });

    it("unicast event callback with error", function() {
        var client1
            , client2
            , bothConnected
            , gotFoo
        ;

        runs(
            function() { 
                getClient('http://localhost:' + port + '?token=ehrox', function(cl) {
                    client1 = cl;
                    getClient('http://localhost:' + port, function(cl) {
                        client2 = cl;
                        bothConnected = true;
                    });
                });
            }
        );

        waitsFor(function() { return bothConnected; }, "Clients could not connect to hub", 5000);

        runs(
            function() { 

                client1.on('foo', function(data, callback) {
                    expect(data.data).toBe('rox');
                    callback('ERROR');
                }, { type: 'unicast', 
                    cb: function(err) {
                    if (!err) {
                        client2.emit('foo', { data: 'rox' }, 
                            function(err) { expect(err).toBe('ERROR'); gotFoo = true; });
                        };
                    }
                });
            }
        );

        waitsFor(function() { return gotFoo; }, "Clients send/receive event", 5000);
        runs(function() { client1.close(); client2.close(); expect(gotFoo).toBeTruthy(); });

        beDone(runs, waitsFor);
    });
});
