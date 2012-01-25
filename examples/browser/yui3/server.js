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

    
// blue.vim      default.vim  desert.vim   evening.vim  morning.vim  pablo.vim      README.txt  shine.vim  torte.vim
//darkblue.vim  delek.vim    elflord.vim  koehler.vim  murphy.vim   peachpuff.vim  ron.vim     slate.vim  zellner.vim
