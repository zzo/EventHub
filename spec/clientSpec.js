// Copyright (c) 2012-2013 Mark Ethan Trostler
// MIT License - http://opensource.org/licenses/mit-license.php
var Hub = require("../clients/server/eventClient")
    , events  = require("events")
;

describe("NodeJS Client", function() {
    var hub;

    beforeEach(function() { hub = Hub.getHub(); });
    
    it("has basic functionality", function() {
        expect(hub).toBeDefined();
        expect(hub.on).toBeDefined();
        expect(hub.emit).toBeDefined();
        expect(hub.addEvent).toBeDefined();
        expect(hub.makeListener).toBeDefined();
        expect(hub instanceof events.EventEmitter).toBeTruthy();
    });
    it("Is ready when socket added", function(done) {
        hub.on("eventHubReady", done);
        hub.addSocket({});
    });
    it("Passes messages to Hub", function(done) {
        var type = { type: "unicast" };
        var fakeSocket = { 
            emit: function(action, eventName, what) {
                expect(action).toMatch(/newListener|eventHub:on/);
                expect(eventName).toMatch(/eventClient:unicast:0|foo/);
                if (typeof what == 'object') {
                    expect(what).toEqual(type);
                } else {
                    expect(typeof what).toEqual('function');
                }
                done();
            }
        };
        hub.on("eventHubReady", function() { 
            hub.on("foo", function() {}, type);
        });
        hub.addSocket(fakeSocket);
    });
    it("Receives messages from the Hub", function(done) {
        var obj = {};
        var socket = { 
            emit: function(action, eventName, func) {  
                expect(action).toBe('newListener');
                expect(eventName).toBe('foo');
                expect(func).toBe(done);
            } 
        };
        hub.on("foo", function(data) {
            expect(data).toBe(obj);
        });
        hub.on("eventHubReady", function() { 
            socket.$emit("foo", obj);
            done();
        });
        hub.addSocket(socket);
    });
    it("addEvent works", function(done) {
        var ev = hub.addEvent("foobie");
        var obj = { grumble: "bumble" };
        expect(typeof ev.on).toBe('function');
        expect(typeof ev.emit).toBe('function');
        ev.on(function(data) { expect(data).toBe(obj); done(); });
        ev.emit(obj);
    });
    it("makeListener no hub works", function() {
        var obj = {};
        var f = function(data) {
            expect(data).toBe(obj);
            return 99;
        };
        var fthrow = function(data) {
            throw 33;
        };
        var f1 = hub.makeListener(f);
        var f2 = hub.makeListener(fthrow);
        expect(f1(obj)).toBe(99);
        expect(f2).toThrow();
    });
    it("makeListener WITH hub works", function() {
        var obj = { some: 'data' };
        var f = function(data) {
            expect(data).toBe(obj);
            return 99;
        };
        var fthrow = function(data) {
            throw 33;
        };
        var f1 = hub.makeListener(f);
        var f2 = hub.makeListener(fthrow);
        f1(obj, function(error, data) {
            expect(error).toBeNull();
            expect(data).toBe(99);
        });
        f2(obj, function(error, data) {
            expect(data).toBeUndefined();
            expect(error).toBe(33);
        })
    });
});
