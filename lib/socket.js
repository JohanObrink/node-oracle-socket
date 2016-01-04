var app = require('http').createServer(handler),
  io = require('socket.io')(app),
  fs = require('fs'),
  oracle = require('./oracle'),
  uuid = require('node-uuid');

app.listen(3000);

function handler (req, res) {
  fs.readFile(__dirname + '/views/index.html',
  function (err, data) {
    if (err) {
      res.writeHead(500);
      return res.end('Error loading index.html');
    }

    res.writeHead(200);
    res.end(data);
  });
}

io.on('connection', socket => {
  socket.connections = {};
  socket.on('disconnect', () => {
    Object.keys(socket.connections).forEach(connectionId => {
      var connection = socket.connections[connectionId];
      oracle.release(connection)
        .then(result => {
          delete socket.connections[connectionId];
          console.log(`closed hanging connection ${connectionId}`);
        })
        .catch(err => console.error(err.toString()));
    });
  });
  socket.on('db-connect', (config, callback) => {
    oracle.connect(config)
      .then(conn => {
        var connectionId = uuid.v4();
        socket.connections[connectionId] = conn;
        callback(null, connectionId);
      })
      .catch(err => {
        callback(err.toString());
      });
  });
  socket.on('db-execute', (connectionId, sql, parameters, callback) => {
    var connection = socket.connections[connectionId];
    if(!connection) {
      return callback(new Error('No connection found with id ' + connectionId));
    }
    oracle.execute(connection, sql, parameters)
      .then(result => callback(null, result))
      .catch(err => callback(err.toString()));
  });
  socket.on('db-release', (connectionId, callback) => {
    var connection = socket.connections[connectionId];
    if(!connection) {
      return callback(new Error('No connection found with id ' + connectionId).toString());
    }
    oracle.release(connection)
      .then(result => {
        delete socket.connections[connectionId];
        callback(null, result);
      })
      .catch(err => callback(err.toString()));
  });
});
