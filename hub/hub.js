// Copyright (c) 2012-2013 Mark Ethan Trostler
// MIT License - http://opensource.org/licenses/mit-license.php
module.exports = (function() {

    var port = process.env['npm_package_config_port'] || 5883
        , http    = require('http')
        , uuid    = require('node-uuid')
        , io      = require('socket.io')
        , sockets = {}
        , events  = {}
        , secret = 'ehrox'	 // for server-side listeners - change it!
        , sio
        , app
        , fs = require('fs')
        , base = __dirname + '/../clients/browser'
    ;

    function handler (req, res) {
        if (req.url === '/yui3.js' || req.url === '/jquery.js') {
            sendFile(res, base + req.url);
        } else {
            res.statusCode = 404;
            res.end('boohoo');
        }
    }

    function sendFile(res, file) {
      fs.readFile(file, function(err, data) {
        if (err) {
          res.writeHead(500);
          return res.end('Error loading ' + file);
        }
    
        res.writeHead(200);
        res.end(data);
      });
    }

    return {
        getPort: function() { return port; }
        , setPort: function(p) { port = p; }
        , setSocketIO: function(sio) { io = sio; }
        , setUUID: function(id) { uuid = id; }
        , getSockets: function() { return sockets; }
        , getEvents: function() { return events; }
        , setSecret: function(sec) { secret = sec; }
        , getSecret: function() { return secret; }
        , shutdown: function() {
            app.close();
        }
        , start: function() {

            app = http.createServer(handler);
            sio = io.listen(app);
            app.listen(port);

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
            
                var args = Array.prototype.slice.call(arguments, 1)
                    , lastArg = args[args.length - 1]
                    , packet = {
                        type: 'event'
                        , name: ev
                    }
                ;
            
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
    
                // All sockets connected to hub just broadcast their events 
                //    to everyone else.... UNLESS unicast
                socket.$emit = function() {
                    var event, i
                        , args = Array.prototype.slice.call(arguments)
                    ;
            
                    function send_with_session(socket_id) {
                        var ss = sockets[socket_id]; // 'ss' is socket to send to
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
                    }

                    // some sanity
                    if (args[0].match(/^eventClient/)) {
                        // Hey only _I_ can send these messages!!
                        return;
                    }
            
                    // If an non-authenticated socket just sent us a session key make 
                    //     sure it's the right one
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
                        socket.set('session', hs.session, function() { 
                            socket.emit('ready', hs.session); 
                        });
                    } else if (args[0] === 'eventHub:on') {
                        var eventName = args[1]
                            , xtra    = args[2]
                        ;
                        if (xtra.type === 'unicast') {
                            if (hs.authenticated) {
                                if (events[eventName]) {
                                    // tell previous dude he's been replaced
                                    console.log('tell ' + events[eventName] 
                                            + ' they are done with ' + eventName);
                                    socket.emit.call(sockets[events[eventName]]
                                            , 'eventClient:done', eventName);
                                }
                                events[eventName] = socket.id;
                                // tell listener they are good to go
                                socket.emit("eventClient:unicast:" + xtra.ts);
                            } else {
                                // not authorized to listen for unicast events
                                //   do something smart...
                                socket.emit("eventClient:unicast:" + xtra.ts, { error: 'Not Authorized' });
                                console.log('UNAUTH socket tried to listen for unicast event');
                            }
                        } else if (xtra.type === 'multicast') {
                            if (!events[eventName]) {
                                // new multicast event
                                xtra.secret = xtra.secret || secret; // default to global secret
                                events[eventName] = { secret: xtra.secret, sockets: [ socket.id ] };
                                socket.emit("eventClient:multicast:" + xtra.ts);
                            } else {
                                if (events[eventName].secret === xtra.secret) {
                                    // add to existing multicast event
                                    events[eventName].sockets.push(socket.id);
                                    socket.emit("eventClient:multicast:" + xtra.ts);
                                } else {
                                    // multicast password is wrong!
                                    socket.emit("eventClient:multicast:" + xtra.ts, 
                                            { error: "Not Authorized" });
                                    console.log('UNAUTH socket tried to listen for multicast event - bad secret');
                                }
                            }
                        }
                    } else {
                        if (args[0] !== 'newListener') {
    
                            // Everyday i'm shufflin.... - make room for session key
                            if (hs.session && typeof args[1] !== 'object') {
                                if (typeof args[1] !== 'undefined') {
                                    args[2] = args[1];
                                    args[1] = {};
                                }
                            }
    
                            if (events[args[0]] && events[args[0]].secret) {
                                // MULTICAST
                                var multi_sockets = events[args[0]].sockets;
                                multi_sockets.forEach(function(send_socket) {
                                    send_with_session(send_socket);
                                });
                            } else if (events[args[0]]) { // UNICAST
                                /* 
                                * So this can be a message from a client or from a backend to
                                *  another backend
                                *
                                * If it's from a client then we need to insert the session
                                * If it's from a backend then the backend needs to include the session
                                *    it should already have  if it's needed
                                */
                                send_with_session(events[args[0]]);
                                /*
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
                                */
                            } else { // BROADCAST

                                console.log('got broadcast event: ' + args[0]);
                                for (sock in sockets) {
                                    // we'll use the emit from this socket BUT 
                                    // set 'this' to be the actual socket we wanna use
                                    //  we send oursevles because 'broadcast' does not 
                                    //  handle acknowledgements
                                    if (args[0] !== 'eventClient:done' || sock !== socket.id) {
                                        // If the guy we're broadcasthing this to is 
                                        // authenticated & there's a session
                                        //  associated with the sender & then toss in the session
                                        if (sockets[sock].handshake 
                                                && sockets[sock].handshake.authenticated 
                                                && hs.session && typeof args[1] === 'object') {
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

            console.log('hub listening on port ' + port);
        }
    }
})();
