var eventHub = require('../../clients/server/eventClient.js').getClientHub('http://localhost:5883');

eventHub.on('eventHubReady', function() { 
    eventHub.on('click', function(data, callback) { 
        console.log('GOT A CLICK Event');
        console.log(data);
        callback('howdy from server', { mark: 'trostler', pid: process.pid });
        eventHub.emit('zot', process.pid);
    }, { type: 'unicast' });

    // this goes to everyone BUT me...
//    eventHub.emit('eventClient:done', 'click');

    eventHub.on('eventClient:done', function(event) {
        console.log('DONE LISTENING FOR ' + event);
        // wait for us to finish processing any current event and then....
        process.exit(0);
    });
});
