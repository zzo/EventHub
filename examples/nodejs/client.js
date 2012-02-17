var eventHub = require('../../clients/server/eventClient.js').getClientHub('http://localhost:5883?token=ehrox');

eventHub.on('eventHubReady', function() { 
    eventHub.on('click', function(data, callback) { 
        callback('howdy from server', { mark: 'trostler', pid: process.pid });
    }, { type: 'unicast' });

    eventHub.on('eventClient:done', function(event) {
        console.log('DONE LISTENING FOR ' + event);
        // wait for us to finish processing any current event and then....
        process.exit(0);
    });
});

