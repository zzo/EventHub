// Copyright (c) 2012-2013 Mark Ethan Trostler
// MIT License - http://opensource.org/licenses/mit-license.php
module.exports = {
    eid: 0
    , getHub: function() {

        var events  = require("events")
            , util  = require("util")
            , eventHubF = function() {

                events.EventEmitter.call(this); 
                this._emit = this.emit; // keep original emit method
                this._on   = this.on; // keep original emit method
                this.events = {}; // keep original emit method
                this.emit  = function() {
                    this._emit.apply(this, arguments); // fire locally
                    if (this.socket) {
                        this.socket.emit.apply(this.socket, arguments);
                    }
                };

                /* Tell event switch we're listening for a unicast event... */
                this.on = function(eventName, func, args) {
                    this._on.apply(this, arguments);
                    if (typeof(args) !== 'undefined') {
                        var ts = module.exports.eid++;
                        args.ts = ts;
                        this.emit('eventHub:on', eventName, args);
                        this.once('eventClient:' + args.type + ':' + args.ts, function(err) {
                            if (args.cb) {
                                args.cb(err);
                            }
                        });
                    }
                };
            }
        ;

        util.inherits(eventHubF, events.EventEmitter);

        eventHubF.prototype.close = function(socket) {
            if (this.socket) {
                this.socket.disconnect();
            }
        };

        eventHubF.prototype.addSocket = function(socket) {
            var _this = this;
            this.socket = socket;

            // Replace socket.io's emitter with our local emitter so the we don't have to
            // explicitly listen for all events (which isn't possible anyway....)
            // SO this hub just passes all socket.io events to this local eventHub/emitter
            //socket.$emit = function() { events.EventEmitter.prototype.emit.apply(_this, arguments); };
            socket.$emit = function() { _this._emit.apply(_this, arguments); };

            this._emit('eventHubReady');
        };

        /*
         * An optional helper function to set up compiler-checkable event names
         *  var clickEvent = hub.addEvent('click');
         *  clickEvent.on(function(...) { ... } );
         *  clickEvent.fire({ foo: 'goo' }, ... );
         */
        eventHubF.prototype.addEvent = function(eventName) {
            var _this = this;
            this.events[eventName] = {
                on: function(callback, args) { _this.on.call(_this, eventName, callback, args); }
                , emit: function() {
                    Array.prototype.unshift.call(arguments, eventName);
                    _this.emit.apply(_this, arguments);
                }
            };
            return this.events[eventName];
        };

        eventHubF.prototype.makeListener = function(func, thisp) {
            // if no callback assume a local call
            return function(data, callback) {
                try {
                    var ret = func.call(thisp, data);
                    return callback ? callback(null, ret) : ret;
                } catch(e) {
                    if (callback) {
                        callback(e)
                    } else {
                        throw e;
                    }
                }
            }
        };

        return new eventHubF();
    },
    getClientHub: function(url) {
        var client = require('socket.io/node_modules/socket.io-client')
            , socket = client.connect(url,
                {
                    'force new connection': true
                }
            )
            , eventHub = module.exports.getHub()
        ;

        socket.on('connect', function () {
            eventHub.addSocket(socket);
        });

        socket.on('error', function (e) {
            console.log("E: " + e);
        });

        return eventHub;
    }
};
