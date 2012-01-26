var port = process.env['npm_package_config_' + port] || 5883
    , connect = require('connect')
    , uuid    = require('node-uuid')
    , io      = require('socket.io')
    , sockets = {}
    , events  = {}
    , toArray = function (enu) {
        var arr = [], i;

        for (i = 0, l = enu.length; i < l; i++) {
            arr.push(enu[i]);
        }

        return arr;
    }
    , secret = 'ehrox'	 // for server-side listeners
    , sio
    ;

var app = connect(
    connect.static(__dirname + '/../clients/browser', { maxAge: 0 })
).listen(port);
sio = io.listen(app, { log: true } );

console.log('hub listening on port ' + port);

sio.set('authorization', function (data, accept) {
    if (data.query.token && (data.query.token === secret)) {
        data.authenticated = true; 
        return accept(null, true);
    } else if (!data.query.session) {
        data.session = uuid();
        return accept(null, true);
    } else if (data.query.session) {
        data.session = data.query.session;
        return accept(null, true);
    }
    return accept('No session transmitted.', false);
});

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

sio.set('transports', ['xhr-polling']); // Needed for NodeJS clients 
sio.sockets.on('connection', function (socket) {
    var sock
    , hs = socket.handshake
    , intervalID
    ;

    // use our overridded emit function so function callbacks get passed along
    socket.emit = myemit;

    // All sockets connected to hub just broadcast their events to everyone else.... UNLESS unicast
    socket.$emit = function() {
        var ss, event, i;

    if (arguments[0] === 'disconnect') {
        delete sockets[socket.id];
        for (event in events) {
            if (events[event] === socket.id) {
                events[event] = null;
            }
        }
    } else if (arguments[0] === 'eventHub:session') {
        if (arguments[1]) {
            hs.session = arguments[1];
        }
        //socket.set('session', hs.session, function() { socket.emit('ready', hs.session); } );
        socket.emit('ready', hs.session);
	} else if (arguments[0] === 'eventHub:on') {
            eventName = arguments[1];
            args      = arguments[2];
            if (args.type === 'unicast' && hs.authenticated) {
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

                    /* 
                     * So this can be a message from a client or from a backend to
                     *  another backend
                     *
                     * If it's from a client then we need to insert the session
                     * If it's from a backend then the backend needs to include the session
                     *    it should already have  if it's needed
                     */
                    ss = sockets[events[arguments[0]]]; // 'ss' is socket to send to
                                                        // 'socket' is where this event came from
                    if (ss) {
                        if (typeof(arguments[1] === 'object')) {
                            // toss in session key
                            if (hs.session) {
                                arguments[1]['eventHub:session'] = hs.session;
                            } 
                        }
                        socket.emit.apply(ss, arguments);
                    }
                } else { // BROADCAST
                    for (sock in sockets) {
                        // we'll use the emit from this socket BUT set 'this' to be the actual socket we wanna use
                        //  we send oursevles because 'broadcast' does not handle acknowledgements
                        if (arguments[0] !== 'eventClient:done' || sock !== socket.id) {
                            // If the guy we're broadcasthing this to is authenticated & there's a session
                            //  associated with the sender & then toss in the session
                            if (sockets[sock].handshake.authenticated && hs.session && typeof arguments[1] === 'object') {
                                arguments[1]['eventHub:session'] = hs.session;
                            } else {
                                // otherwise no session key for you
                                if (typeof arguments[1] === 'object') {
                                    delete arguments[1]['eventHub:session'];
                                }
                            }
                            socket.emit.apply(sockets[sock], arguments);
                        }
                    }
                }
            } 
        }
    };

    sockets[socket.id] = socket;
});
