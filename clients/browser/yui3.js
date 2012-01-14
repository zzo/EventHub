YUI().add('EventHub', function(Y) {
    Y.EventHub = function(io, url) {
        var _this   = this;
        this.events = {};
        this._fire  = this.fire;
        this.socket = io.connect(url);
        this.socket.on('connect', function () {
            _this.socket.$emit = function() { _this._fire.apply(_this, arguments); };
            _this._fire('eventHubReady');
        });
        this.fire = function() {
            _this.socket.emit.apply(_this.socket, arguments);
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
                on: function(callback) { _this.on.call(_this, eventName, callback); }
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

