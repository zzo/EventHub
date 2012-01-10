var eventHub = require('../../clients/server/eventClient.js').getClientHub('http://localhost:8888');

eventHub.on('eventHubReady', function() { console.log("EventHub ready!"); });
eventHub.on('click', function(data, callback) { 
        console.log('GOT A CLICK Event');
        console.log(data);
        callback('howdy from server', { mark: 'trostler' });
});
