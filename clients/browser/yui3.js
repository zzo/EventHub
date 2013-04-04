// Copyright (c) 2012-2013 Mark Ethan Trostler
// MIT License - http://opensource.org/licenses/mit-license.php
YUI().add('EventHub', function(Y) {
    Y.EventHub = function(io, url) {
        var _this    = this
            , socket = io.connect(url)
            , eid = 0
        ;

        // Bookkeeping
        this.events  = {};
        this._fire   = this.fire;
        this._on     = this.on;

        // Get the session & cookie-ize the  session
	    socket.on('ready', function(session) {
            Y.Cookie.set("eventHub", session, { expires: new Date("August 11, 2069"), path: '/' });
            socket.$emit = function() { /* fire the event locally */ _this._fire.apply(_this, arguments); };
            _this._fire('eventHubReady');
        });

        // Set our session if we have one
        socket.on('connect', function() {
            socket.emit('eventHub:session', Y.Cookie.get('eventHub'));
            Y.Global.Hub = _this;
        });

        // Fire all events off to the hub
        this.fire = function() {
            socket.emit.apply(socket, arguments);
        };

        /* Tell event switch we're listening for a unicast event... */
        this.on = function(eventName, func, args) {
            this._on.call(this, eventName, func);
            if (typeof(args) !== 'undefined') {
                args.ts = eid++;
                this.on('eventClient:' + args.type + ':' + args.ts, function(err) {
                    if (err) {
                        // unhook this guy
                        this.detach(eventName, func);
                    }
                    if (args.cb) {
                        args.cb(err);
                    }
                    // don't need this anymore
                    this.detach('eventClient:' + args.type + ':' + args.ts);
                });
                this.fire('eventHub:on', eventName, args);
            }
        };

        /*
         * An optional helper function to set up compiler-checkable event names
         *  var clickEvent = hub.addEvent('click');
         *  clickEvent.on(function(...) { ... } );
         *  clickEvent.fire({ foo: 'goo' }, ... );
         */
        this.addEvent = function(eventName) {
            //var _this = this;

            // Dummy up an object that drop in the event name for listening & firing
            this.events[eventName] = {
                on: function(callback, opts) { 
                    //    _this.on.call(_this, eventName, callback, opts);
                        _this.on(eventName, callback, opts);
                    }
                , fire: function() {
                    // Shove event name back in argument list & fire it
                    Array.prototype.unshift.call(arguments, eventName);
                    _this.fire.apply(_this, arguments);
                }
            };
            return this.events[eventName];
        };

        this.makeListener = function(func, thisp) {
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
    };

    // We're an event target
    Y.augment(Y.EventHub, Y.EventTarget);

}, '1.0', { requires: [ 'event-custom', 'cookie' ] });

