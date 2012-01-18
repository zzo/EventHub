var port = process.env['npm_package_config_' + port] || 5883
    , io = require('socket.io').listen(port)
    , sockets = {}
    , events = {}
    , toArray = function (enu) {
        var arr = [], i;

        for (i = 0, l = enu.length; i < l; i++) {
            arr.push(enu[i]);
        }

        return arr;
    };

console.log('listening on port ' + port);

var myemit = function (ev) {
  if (ev == 'newListener') {
    return this.$emit.apply(this, arguments);
  }

  var args = toArray(arguments).slice(1)
    , lastArg = args[args.length - 1]
    , packet = {
          type: 'event'
        , name: ev
      };

  if ('function' == typeof lastArg) {
    packet.id = ++this.ackPackets;
    packet.ack = 'data';    // OUR ONE CHANGE!!!

    this.acks[packet.id] = lastArg;
    args = args.slice(0, args.length - 1);
  }

  packet.args = args;

  return this.packet(packet);
};

io.set('transports', ['xhr-polling']); // http://brandontilley.com/2011/08/13/socket-io-and-the-latest-chrome.html
io.sockets.on('connection', function (socket) {
    var sock;

    socket.emit = myemit;

    socket.on('disconnect', function() { console.log('DISCONNECT'); });

    // All sockets connected to hub just broadcast their events to everyone else....
    socket.$emit = function() {
        var ss, event, i;
        if (arguments[0] === 'disconnect') {
            delete sockets[socket.id];
            for (event in events) {
                if (events[event] === socket.id) {
                    events[event] = null;
                }
            }
        }

        if (arguments[0] === 'eventHub:on') {
            eventName = arguments[1];
            args      = arguments[2];
            if (args.type === 'unicast') {
                console.log('set unicast for ' + eventName + ' to ' + socket.id);
                if (events[eventName]) {
                    // tell previous dude he's been replaced
                    console.log('tell ' + events[eventName] + ' they are done with ' + eventName);
                    socket.emit.call(sockets[events[eventName]], 'eventClient:done', eventName);
                }
                events[eventName] = socket.id;
            }
        } else {
            if (arguments[0] !== 'newListener') {
                if (events[arguments[0]]) { // UNICAST
                    ss = sockets[events[arguments[0]]];
                    socket.emit.apply(ss, arguments);
                } else { // BROADCAST
                    for (sock in sockets) {
                        // we'll use the emit from this socket BUT set 'this' to be the actual socket we wanna use
                        //  we send oursevles because 'broadcast' does not handle acknowledgements
                        if (arguments[0] !== 'eventClient:done' || sock !== socket.id) {
                            socket.emit.apply(sockets[sock], arguments);
                        }
                    }
                }
            }
        }
    };

    sockets[socket.id] = socket;
});
