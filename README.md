EventHub
========

EventHub provides a server-side event hub and server and client side libraries to communicate with the hub.  The hub broadcasts all events to all connected clients.  Event callbacks are supported.

Installation
------------

    % npm install EventHub -g
    % npm start EventHub -g

This will install and start the EventHub on port 5883

Configuration
-------------

EventHub's default port is 5883.  Use the npm configuration variable to change it:

    % npm config set EventHub.port = 8888

Will change the port the EventHub listens on.  Ensure you update your clients to point to this port.

The Hub
-------

The hub itself is hub/eventHub.js.  This NodeJS implementation will listen on a given port for connections.  You can run this on any host/port, just tell each client where this thing is running and they will connect to it.

The Clients
-----------

### Browser

#### YUI3

A YUI3 module called 'EventHub' in clients/browsers/yui3.js provides a client-side module for the EventHub.  Look in examples/browser for a test drive.  You must first start the eventHub, then set up some HTML like so:

    <html>
    <head>
    </head>
    <body>
     <script src="http://yui.yahooapis.com/3.4.1/build/yui/yui-min.js"></script>
     <script src="/socket.io/socket.io.js"></script>
     <script src="/clients/browser/yui3.js"></script>
     <button id="button">Press Me</button>
    <script>
        YUI().use('node', 'EventHub', function(Y) {

            var hub = new Y.EventHub(io, 'http://<HUB HOST>:<HUB PORT>');
            hub.on('eventHubReady', function() {
                Y.one('#button').on('click',
                    function(event) {
                        hub.fire('click', { button: 'clicked' },
                            function(back, b2) { 
                                Y.log("callback from event listener!");
                                Y.log(back); 
                                Y.log(b2); 
                            }
                        );
                    }
                );
                hub.on('click',
                    function(o1, fn) { 
                        Y.log('got local click event: ' + o1.button); 
                    }
                );
            });
        });
    </script>
    </body>
    </html>

Note the &lt;HUB HOST>:&lt;HUB PORT> to connect to your running EventHub.  This loads in YUI3, then socket.io, and finally the YUI3 EventHub client library (yui3.js).  Simply instantiate a new Y.EventHub, and when it's ready you're ready.

This example requires a server to server this HTML the socket.io library, and the client hub code, which is simply:

    var connect = require('connect')
        , server = connect.createServer(
            connect.logger()
            , connect.static(__dirname + '/../..')
            , connect.static(__dirname)
        )
        , io = require('socket.io').listen(server)
        , port = 8888
        ;

    server.listen(port);
    console.log('Listening on port ' + port);

This uses the Connect framework to serve the static files (the HTML, the socket.io library, and the yui3 event hub module.

For this to all work.  Point your browser at this host, port 8888, and the example will load.  Finally you will also need a listener for the 'click' event this example fires.  That is in server example directory and explained next.

#### jQuery

the jQuery client is used very similarly to the YUI3 client:

    <html>
    <head>
    </head>
    <body>
     <script src="http://ajax.googleapis.com/ajax/libs/jquery/1.6.2/jquery.min.js"></script>
     <script src="/socket.io/socket.io.js"></script>
     <script src="/clients/browser/jquery.js"></script>
     <button id="button">Press Me</button>
    <script>
        var hub = new $.fn.eventHub(io, 'http://<HUB HOST>:<HUB PORT>');
        hub.bind('eventHubReady', function() {
            console.log('EVENT HUB READY!');
            $('#button').bind('click',
                function(event) {
                    console.log('clicked on button - making new event for hub');
                    hub.trigger('click', { button: 'clicked' },
                        function(back, b2) { 
                            console.log("callback from event listener!");
                            console.log(back); 
                            console.log(b2); 
                        }
                    );
                }
            );
            hub.bind('click',
                function(event, o1, fn) { 
                    console.log('got local click event: ' + event); 
                    console.log(o1);
                    console.log(fn);
                }
            );
        }); 
    </script>
    </body>
    </html>

Loading up jQuery, socket.io, and the jQuery EventHub client and bind to the button's click event.  When the hub is ready you can 'trigger' events on it and 'bind' to events from it.  I'm no jQuery expert so I hope this is sane for you jQuery people!

### NodeJS

So we can serve the event hub library, the socket.io library, and some example HTML to fire a 'click' event when you click on the button.  Finally we need a listener to do something, an example of a server-side event hub client does just that.  After the EventHub is started, run examples/nodejs/client.js

    % node examples/nodejs/client.js

The client will connect to the specified EventHub and uses the clients/server/eventClient.js NodeJS module to handle all EventHub interaction.  It listens for a 'click' event and excercises the callback to return data back to the event emitter.

Putting It All Together
-----------------------

So you start the EventHub, start the example server, and start the example NodeJS client.  Go to your browser and point it at the example server and click the button.  An event will propagate from the browser, to the EventHub, and finally to the NodeJS client.  The NodeJS client will call the event's callback which will execute back in the browser.  Simple!

You've not got an awesome event-based archetecture so go wild!

