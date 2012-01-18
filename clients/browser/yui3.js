YUI().add('EventHub', function(Y) {
    Y.EventHub = function(io, url) {
        var _this   = this;
        this.events = {};
        this._fire  = this.fire;
        this._on    = this.on;
        this.socket = io.connect(url);
        this.socket.on('connect', function () {
            _this.socket.$emit = function() { _this._fire.apply(_this, arguments); };
            _this._fire('eventHubReady');
            Y.Global.Hub = _this;
        });
        this.fire = function() {
            _this.socket.emit.apply(_this.socket, arguments);
        };

        /* Tell event switch we're listening for a unicast event... */
        this.on = function(eventName, func, args) {
            this._on.apply(this, arguments);
            if (typeof(args) !== 'undefined') {
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
}, '1.0', { requires: [ 'event-custom' ] });

