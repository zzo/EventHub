module.exports = {
    getHub: function() {

        var events  = require("events")
            , util  = require("util")
            , eventHubF = function() {
                events.EventEmitter.call(this); 
                this._emit = this.emit; // keep original emit method
                this.emit = function() {
                    this._emit.apply(this, arguments);
                    if (this.socket) {
                        this.socket.emit.apply(this.socket, arguments);
                    }
                };
            };

        util.inherits(eventHubF, events.EventEmitter);

        eventHubF.prototype.addSocket = function(socket) {
            var _this = this;
            this.socket = socket;

            // Replace socket.io's emitter with our local emitter so the we don't have to
            // explicitly listen for all events (which isn't possible anyway....)
            // SO this hub just passes all socket.io events to this local eventHub/emitter
            //socket.$emit = function() { events.EventEmitter.prototype.emit.apply(_this, arguments); };
            socket.$emit = function() {console.log('local emit');console.log(arguments); _this._emit.apply(_this, arguments); };

            this._emit('eventHubReady');
        };

        return new eventHubF();
    },
    getClientHub: function(url) {
        var client = require('socket.io/node_modules/socket.io-client')
            , socket = client.connect(url)
            , eventHub = module.exports.getHub();

        socket.on('connect', function () {
            eventHub.addSocket(socket);
        });

        return eventHub;
    }
};
