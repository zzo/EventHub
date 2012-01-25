YUI().add('EventHub', function(Y) {
    Y.EventHub = function(io, url) {
        var _this    = this;

        this.events  = {};
        this._fire   = this.fire;
//        this._on     = this.on;
        this.session = Y.Cookie.get("eventHub");
        console.log('CURRENT SESSION: ' + this.session);

        // set up session
        var firstSocket = io.connect(url);

	    firstSocket.on('ready', function(session) {
            Y.Cookie.set("eventHub", session, { expires: new Date("August 11, 2069"), path: '/' });
            _this.session = session;
            firstSocket.$emit = function() { _this._fire.apply(_this, arguments); };
            _this._fire('eventHubReady');
        });

        firstSocket.on('connect', function() {
            if (!_this.session) {
                firstSocket.emit('eventHub:session');
            } else {
                firstSocket.$emit = function() { _this._fire.apply(_this, arguments); };
                _this._fire('eventHubReady');
            }

            Y.Global.Hub = _this;
        });

        this.fire = function() {
            if (typeof arguments[1] === 'object') { 
                arguments[1]['eventHub:session'] = this.session;
            } else if (typeof arguments[1] == 'function') {
                arguments[2] = arguments[1];    // the callback
                arguments[1] = { 'eventHub:session': this.session };
            } else {
                arguments[1] = { 'eventHub:session': this.session };
            }
            firstSocket.emit.apply(firstSocket, arguments);
        };

        /* Tell event switch we're listening for a unicast event... 
        this.on = function(eventName, func, args) {
            this._on.apply(this, arguments);
            if (typeof(args) !== 'undefined') {
                args['eventHub:session'] = this.session;
                this.fire('eventHub:on', eventName, args);
            }
        };
        */

        /*
         * An optional helper function to set up compiler-checkable event names
         *  var clickEvent = hub.addEvent('click');
         *  clickEvent.on(function(...) { ... } );
         *  clickEvent.fire({ foo: 'goo' }, ... );
         */
        this.addEvent = function(eventName) {
            var _this = this;
            this.events[eventName] = {
                on: function(callback, args) { _this.on.call(_this, eventName, callback, args); }
                , fire: function() {
                    Array.prototype.unshift.call(arguments, eventName);
                    _this.fire.apply(_this, arguments);
                }
            };
            return this.events[eventName];
        };
    };
    Y.augment(Y.EventHub, Y.EventTarget);
}, '1.0', { requires: [ 'event-custom', 'cookie' ] });

