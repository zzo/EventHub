YUI().add('EventHub', function(Y) {
    Y.EventHub = function(io, url) {
        var _this   = this;
        this._fire  = this.fire;
        this.socket = io.connect(url);
        this.socket.on('connect', function () {
            _this.socket.$emit = function() { _this._fire.apply(_this, arguments); };
            _this._fire('eventHubReady');
        });
        this.fire = function() {
            _this.socket.emit.apply(_this.socket, arguments);
        };
    };
    Y.augment(Y.EventHub, Y.EventTarget);
}, '1.0', { requires: [ 'event-custom' ] });

