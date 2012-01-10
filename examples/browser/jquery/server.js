var connect = require('connect')
    , server = connect.createServer(
        connect.logger()
        , connect.static(__dirname + '/../../..')
        , connect.static(__dirname)
    )
    , io = require('socket.io').listen(server)
    , port = 8882
    ;

server.listen(port);
console.log('Listening on port ' + port);

