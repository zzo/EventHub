var port = process.env['npm_package_config_' + port] || 5883
    , io = require('socket.io').listen(port)
    , sockets = {}
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

    // All sockets connected to hub just broadcast their events to everyone else....
    socket.$emit = function() {
        if (arguments[0] !== 'newListener') {
            for (sock in sockets) {
                // we'll use the emit from this socket BUT set 'this' to be the actual socket we wanna use
                //  we send oursevles because 'broadcast' does not handle acknowledgements
                socket.emit.apply(sockets[sock], arguments);
            }
        }
    };

    sockets[socket.id] = socket;
});
