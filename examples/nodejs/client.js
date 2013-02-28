// Copyright (c) 2012-2013 Mark Ethan Trostler
// MIT License - http://opensource.org/licenses/mit-license.php
var eventHub = require('../../clients/server/eventClient.js').getClientHub('http://localhost:5883?token=ehrox');

var worker = function(data) {
    console.log("in dowork:");
    console.log(data);
    //throw { this: "sux" };
    return { data: data, mark: 'trostler', pid: process.pid };
}

eventHub.on('eventHubReady', function() { 
    eventHub.on('click', eventHub.makeListener(worker), { type: 'unicast' });
});

