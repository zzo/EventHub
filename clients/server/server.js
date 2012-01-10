var connect = require('connect')
    , util = require('util')
    , eventHub = require('./hub.js').getClientHub('http://localhost:8888')
    , server = connect.createServer(
        connect.logger()
        , connect.static(__dirname)
    )
    , port = 8882
    ;

server.listen(port);
console.log('Listening on port ' + port);

/*
eventHub.on('eventHubReady', function() { console.log("EH ready!"); });

eventHub.on('click', function(data, fn) { console.log('GOT A CLICK'); console.log(data); console.log(fn); fn('howdy from server', { by: 'guy' }); });
eventHub.on('blargo', function(data) { console.log('GOT A BLARGO'); console.log(data); });

  eventHub.on('ferret', function (name, fn) {
          console.log('IN FERRET');
          console.log(arguments);
    fn('woot', { hey: 'nwo' });
  });

  */
