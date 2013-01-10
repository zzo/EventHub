var events = require('events')
    , HubClient = require("../clients/server/eventClient")
    , Hub = require("../hub/hub")
    , http = require('http')
;

describe("Server Startup", function() {
    var port;

    beforeEach(function() { port = Hub.getPort(); Hub.start(); });
    afterEach(function() { Hub.shutdown(); });

    it("Started and can connect", function() {
        var client = HubClient.getClientHub('http://localhost:' + port)
            , connected
            , reallyDone
        ;

        runs(
            function() { client.on('eventHubReady', function() { connected = true }) }
        );

        waitsFor(function() { return connected; }, "Client could not connect to hub", 5000);
        runs(function() { client.close(); expect(connected).toBeTruthy(); });

        runs(function() { setTimeout(function() { reallyDone = true; }, 20000); });
        waitsFor(function() { return reallyDone; }, "All Done", 25000);
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
            , reallyDone
        ;

        runs(
            function() { 
                client1 = HubClient.getClientHub('http://localhost:' + port);
                client1.on('eventHubReady', function() {
                    client2 = HubClient.getClientHub('http://localhost:' + port);
                    client2.on('eventHubReady', function() {
                        client3 = HubClient.getClientHub('http://localhost:' + port);
                        client3.on('eventHubReady', function() {
                            allConnected = true;
                        });
                    });
                });
            }
        );

        waitsFor(function() { return allConnected; }, "Clients could not connect to hub", 5000);

        runs(
            function() { 
                client1.on('foo', function() {
                    gotFoo1 = true;
                });
                client3.on('foo', function() {
                    gotFoo2 = true;
                });
                client2.emit('foo');
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

        runs(function() { setTimeout(function() { reallyDone = true; }, 20000); });
        waitsFor(function() { return reallyDone; }, "All Done", 25000);
    });
    it("Pass simple unicast event", function() {
        var client1
            , client2
            , bothConnected
            , gotFoo
            , reallyDone
        ;

        runs(
            function() { 
                client1 = HubClient.getClientHub('http://localhost:' + port + '?token=ehrox');
                client1.on('eventHubReady', function() {
                    client2 = HubClient.getClientHub('http://localhost:' + port);
                    client2.on('eventHubReady', function() {
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

        runs(function() { setTimeout(function() { reallyDone = true; }, 20000); });
        waitsFor(function() { return reallyDone; }, "All Done", 25000);
    });
    it("unicast event callback", function() {
        var client1
            , client2
            , bothConnected
            , gotFoo
            , reallyDone
        ;

        runs(
            function() { 
                client1 = HubClient.getClientHub('http://localhost:' + port + '?token=ehrox');
                client1.on('eventHubReady', function() {
                    client2 = HubClient.getClientHub('http://localhost:' + port);
                    client2.on('eventHubReady', function() {
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

        runs(function() { setTimeout(function() { reallyDone = true; }, 20000); });
        waitsFor(function() { return reallyDone; }, "All Done", 25000);
    });
    it("unauth unicast event callback", function() {
        var client1
            , connected
            , failed
            , reallyDone
        ;

        runs(
            function() { 
                client1 = HubClient.getClientHub('http://localhost:' + port);
                client1.on('eventHubReady', function() {
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
        runs(function() { client1.close(); expect(failed).toMatch(/not authorized/i); });

        runs(function() { setTimeout(function() { reallyDone = true; }, 20000); });
        waitsFor(function() { return reallyDone; }, "All Done", 25000);
    });
});
