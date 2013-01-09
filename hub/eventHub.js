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
    , secret = 'ehrox'	 // for server-side listeners - change it!
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
        var ss, event, i
            , args = toArray(arguments);
        ;

        // some sanity
        if (args[0].match(/^eventClient/)) {
            // Hey only _I_ can send these messages!!
            return;
        }

        // If an non-authenticated socket just sent us a session key make sure it's the right one
        if (typeof args[1] === 'object' && args[1] !== null) {
            if (typeof args[1]['eventHub:session'] !== 'undefined' && !hs.authenticated) {
                if (args[1]['eventHub:session'] !== hs.session) {
                    // something funny going on..... not passing on this event
                    return;
                }
            }
        }

        if (args[0] === 'disconnect') {
            delete sockets[socket.id];
            for (event in events) {
                if (events[event] === socket.id) {
                    events[event] = null;
                }
            }
        } else if (args[0] === 'eventHub:session') {
            if (args[1]) {
                hs.session = args[1];
            }
            socket.set('session', hs.session, function() { socket.emit('ready', hs.session); } );
        } else if (args[0] === 'eventHub:on') {
                var eventName = args[1]
                    , xtra    = args[2];
                if (xtra.type === 'unicast' && hs.authenticated) {
                    console.log('set unicast for ' + eventName + ' to ' + socket.id);
                    if (events[eventName]) {
                        // tell previous dude he's been replaced
                        console.log('tell ' + events[eventName] + ' they are done with ' + eventName);
                        socket.emit.call(sockets[events[eventName]], 'eventClient:done', eventName);
                    }
                    events[eventName] = socket.id;
                }
        } else {
            if (args[0] !== 'newListener') {

                // Evenryday i'm shufflin.... - make room for session key
                if (hs.session && typeof args[1] !== 'object') {
                    if (typeof args[1] !== 'undefined') {
                        args[2] = args[1];
                        args[1] = {};
                    }
                }

                if (events[args[0]]) { // UNICAST
                    /* 
                     * So this can be a message from a client or from a backend to
                     *  another backend
                     *
                     * If it's from a client then we need to insert the session
                     * If it's from a backend then the backend needs to include the session
                     *    it should already have  if it's needed
                     */
                    ss = sockets[events[args[0]]]; // 'ss' is socket to send to
                                                        // 'socket' is where this event came from
                    if (ss) {
                        if (typeof(args[1] === 'object')) {
                            // toss in session key
                            if (hs.session) {
                                args[1]['eventHub:session'] = hs.session;
                            } 
                        }
                        ss.emit.apply(ss, args);
                    }
                } else { // BROADCAST
                    for (sock in sockets) {
                        // we'll use the emit from this socket BUT set 'this' to be the actual socket we wanna use
                        //  we send oursevles because 'broadcast' does not handle acknowledgements
                        if (args[0] !== 'eventClient:done' || sock !== socket.id) {
                            // If the guy we're broadcasthing this to is authenticated & there's a session
                            //  associated with the sender & then toss in the session
                            if (sockets[sock].handshake && sockets[sock].handshake.authenticated && hs.session && typeof args[1] === 'object') {
                                args[1]['eventHub:session'] = hs.session;
                            } else {
                                // otherwise no session key for you
                                if (typeof args[1] === 'object') {
                                    delete args[1]['eventHub:session'];
                                }
                            }
                            socket.emit.apply(sockets[sock], args);
                        }
                    }
                }
            } 
        }
    };

    sockets[socket.id] = socket;
});
