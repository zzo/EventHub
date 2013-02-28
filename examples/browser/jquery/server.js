// Copyright (c) 2012-2013 Mark Ethan Trostler
// MIT License - http://opensource.org/licenses/mit-license.php
var connect = require('connect')
    , server = connect.createServer(
        connect.logger()
        , connect.static(__dirname + '/../../..')
        , connect.static(__dirname)
    )
    , io = require('socket.io').listen(server)
    , port = 8888
    ;

server.listen(port);
console.log('Listening on port ' + port);

