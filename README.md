[![build status](https://secure.travis-ci.org/zzo/EventHub.png)](http://travis-ci.org/zzo/EventHub)
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

### Port

The server listens on a port that all clients must use!

EventHub's default port is 5883.  Use the npm configuration variable to change it:

    % npm config set EventHub.port = 8888

Will change the port the EventHub listens on.  Ensure you update your clients to point to this port.

You can also set the Hub's port using the Hub API as discussed below (make sure you setPort before 'start'ing the Hub!).

### Hub Secret

The Hub has a 'secret' value - a string.  Clients who wish to listen for unicast events (see the Unicast section below) must provide this string when connecting to the Hub.  Currently this value can only be configured by the 'setSecret' method in the Hub API and should be set BEFORE 'start'ing the Hub!

Clients append the 'token' query string parameter to the connect URL like so:

#### NodeJS

    var EventHubClient = require('EventHub/clients/server/eventClient')
        , client = EventHubClient.getClientHub('http://HubHost:HubPort?token=SECRET_VALUE')
    ;

#### YUI3

    var hub = new Y.EventHub(io, 'http://HubHost:HubPort?token=SECRET_VALUE');

#### jQuery

    var hub = new $.fn.eventHub(io, 'http://HubHost:HubPort?token=SECRET_VALUE');

The Hub
-------

The hub itself is hub/hub.js but is most easily started by executing hub/eventHub.js.  This NodeJS implementation will listen on a given port for connections.  You can run this on any host/port, just tell each client where this thing is running and they will connect to it.

### The Hub API

To fiddle with the Hub yourself programmatically first require it:

    Hub = require('EventHub/hub/hub');

Methods available are:

    Hub.start();

    Hub.shutdown();  // BEWARE currently Hub make take up to 20 seconds to shutdown!

    Hub.getPort();

    Hub.setPort(port); // Must call before start!

    Hub.getSecret(); // MUST call before start!

    Hub.setSecret(secret); // SHOULD call before start!

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

    var eventHub = require('EventHub/clients/server/eventClient.js').getClientHub('http://localhost:5883');

    eventHub.on('eventHubReady', function() { console.log("EventHub ready!"); });
    eventHub.on('click', function(data, callback) { 
        console.log('GOT A CLICK Event');
        console.log(data);
        callback('howdy from server', { mark: 'trostler' });
    });

Putting It All Together
-----------------------

So you start the EventHub, start the example server, and start the example NodeJS client.  Go to your browser and point it at the example server and click the button.  An event will propagate from the browser, to the EventHub, and finally to the NodeJS client.  The NodeJS client will call the event's callback which will execute back in the browser.  Simple!

You've not got an awesome event-based archetecture so go wild!

## Event Metadata

You can attach metadata to the 'on' or 'bind' eventHub method which will signal the hub to act like a switch for these messages.  

    hub.on('eventName', callback, { type: 'unicast' });

NOTE the 'on' method is asynchronous itself as it must communicate with the remote Hub to register the event.

### Unicast 

If { type: 'unicast' } is specified as the metadata (the only thing currently supported) each time a new listener comes online with this metadata the event hub will ONLY pass the named event to ONLY this listener.  

ONLY AUTHETNICATED CLIENTS CAN LISTEN FOR UNICAST EVENTS!  See above for how Authentication works.

Upon specifying { type: 'unicast' } you can/should also specify a callback to determine the result of your attempted event registration.  Currently the only possible error is if you attempt to register for unicast event but your client is not authenticated.  That all looks like this:

    hub.on('myunicastevent', function() {}, { type: 'unicast', cb: function(error) {
        if (error) {
            // I was not able to register my listener for this event!
            //  'error' is an OBJECT with a single property: 'error' - which is a string
            //  console.log('unicast registration failed beacuse: ' + error.error);
        } else {
            // all is cool & my event is now registered to me
        }
    });

The 'cb' property is a function which has a single 'error' parameter - if that parameter is non-null Houston you've got a problem (currently it is a string that is 'Not Authorized').

When another client successfully registers for a unicast event the current unicast listener will receive a special event 'eventHub:done' to notify it that it will no longer receive events of that type.

    hub.on('eventClient:done', function(eventName) {
        console.log('I will no longer receive ' + eventName + ' events!');
    });

Note the event hub itself emits that event.

This isi the time to finish up any event handling the listener is currently doing & then perhaps exit.  Makes deploying a breeze!

This aids deployment by allowing safe shutdown of older modules/handlers and bring up of new without dropping any events

Examples of this kind of event are authentication and session management.

### Multicast

Multicast events allow the event listener(s) to specify the secret necessary to listen for events. The first listener to register for an event sets the event password.  All subsequent listeners must supply the same password to successfully listens for those events.

BE AWARE THAT ONLY ONE LISTENER SHOULD ACTUALLY RESPOND TO THE EVENT!!!

Multicast events are useful for non-responding cross-cutting concerns such as logging, profiling, and the like.  This essentially enables non-responding cross-cutting concers for  unicast event listeners without effecting the original listener.

So if you want to log or profile an event you can hook up a generic logger or profiler for an event without effecting the original listener for that event.  It looks like this:

    hub.on('eventName', callback, { type: 'multicast', secret: 'mysecret', cb: function(err) { ... } });

Anyone else can listen for this event if they provide the same secret when registering. You can verify you listened successfuly by supplying a 'cb' parameter to the event metadata exactly like the 'unicast' case:

    hub.on('eventName', callback, { type: 'multicast', secret: 'mysecret', function(err) {
            if (!err) {
                // all is good
            } else {
                // probably supplied the wrong password!
                console.log('Multicast registration failed: ' + error.error);
            }
        }
    });

Now when 'eventName' is fired every multicast listener will receive the message.  ONLY ONE LISTENER CAN RESPOND if a response is expected!

### Broadcast

Not specifying { type: 'unicast' } means you are listening for a broadcasted event.  You do not need any authorization to listen for a broadcasted event.  You probably do NOT want to use any callbacks for broadcasted events.  Examples of this kind of event are logging and presence notifications.

Converting Existing Code and Testing
------------------------------------

To ease testing and pre-Hub code conversion an optional 'makeListener' method is provided by the Hub which lets you turn any 'ordinary' function into an event listener.  Now you can convert and test your function(s) in isolation from the Hub infratstructure further minimizing testing dependencies.  It works like this:

    // No Hub dependencies/knowledge here... Just a plain old regular function
    function worker(data) {
        var ret = {};
        if (data.foo) {
            ret.moo = "goo";
        } else {
            throw { message: "Did not get foo!" };
        }
    }

The worker function only takes the same 'data' hash present in a normal listener but instead of also accepting a 'callback' parameter this function simply returns the result if there was no error or 'throws' an object on error.  This function can be tested very easily without any reference to any Hub infrastructure:

    // Look ma no mention of Event Hubs!
    function testWorkerGoodInput {
        var result1 = worker({ foo: 'howdy' });
        assert(result.moo === 'goo');   // works fine!
    }

    // Look ma no mention of Event Hubs!
    function testWorkerBadInput {
        try {
            var result1 = worker({});
            assert(false);
        } catch(e) {
            assert(e.message === "Did not get foo!");
        }
    }

Now to 'convert' this function to an event handler for the Hub is trivial:

    eventHub.on('eventHubReady', function() { 
        eventHub.on('click', eventHub.makeListener(worker), { type: 'unicast' });
    });

Using the eventHub.makeListener method the 'worker' function will now be wrapped by code that will call the Hub-supplied callback correctly: callback(null, &lt;retvalue>) on success and callback(&lt;error value>) if your function throws a value.
    
The original function does not reference the Hub infrastructure at all your converting and testing are made that much simpler.


