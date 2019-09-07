var http      = require('http');
var express   = require('express');
var fs        = require('fs');
var io        = require('socket.io');
var Mustache  = require('mustache');

var path       = require('path');
var bodyParser = require('body-parser');
var lowdbApi   = require('lowdb-api');

var app   = express();
var staticDir = express.static;
var server    = http.createServer(app);

var app_db   = express();
var db_file = path.join(__dirname, './../db.json');
var db_options = { prefix: "/slam/data" };

var opts = {
	port :      1947,
	baseDir :   __dirname + '/../'
};

app.use('/slam/data', bodyParser.json());
app.use('/slam/data', lowdbApi(db_file, db_options));

app.use('/js', staticDir(__dirname + '/node_modules/jsgrid/dist'));
app.use('/js', staticDir(__dirname + '/node_modules/bootstrap/dist/js'));
app.use('/js', staticDir(__dirname + '/node_modules/jquery/dist'));
app.use('/js', staticDir(__dirname + '/node_modules/jquery-ui-dist'));
app.use('/css', staticDir(__dirname + '/node_modules/bootstrap/dist/css'));
app.use('/css', staticDir(__dirname + '/node_modules/jsgrid/dist'));
app.use('/css', staticDir(__dirname + '/node_modules/jquery-ui-dist'));

[ 'css', 'js', 'images', 'plugin', 'lib' ].forEach(function(dir) {
	app.use('/' + dir, staticDir(opts.baseDir + dir));
});

[ 'css', 'js', 'plugin', 'lib' ].forEach(function(dir) {
	app.use('/' + dir, staticDir(opts.baseDir + 'reveal.js/' + dir));
});

[ 'css', 'js', 'lib' ].forEach(function(dir) {
	app.use('/' + dir, staticDir(opts.baseDir + 'slam.js/' + dir));
});

io = io(server);

io.on('connection', function(socket) {
	socket.on('new-subscriber', function(data) {
		socket.broadcast.emit('new-subscriber', data);
	});

	socket.on('statechanged', function(data) {
		delete data.state.overview;
		socket.broadcast.emit('statechanged', data);
	});

	socket.on('statechanged-control', function(data) {
		delete data.state.overview;
		socket.broadcast.emit('statechanged-control', data);
	});

	socket.on('datachanged-control', function(data) {
		socket.broadcast.emit('datachanged-control', data);
	});
});

app.get('/', function(req, res) {
	res.writeHead(200, {'Content-Type': 'text/html'});
	fs.createReadStream(opts.baseDir + '/index.html').pipe(res);
});

app.get('/slam/:socketId', function(req, res) {
	fs.readFile(opts.baseDir + 'slam.js/control.html', function(err, data) {
		res.send(Mustache.to_html(data.toString(), {
			socketId : req.params.socketId
		}));
	});
});

// Actually listen
server.listen(opts.port || null);

var brown = '\033[33m',
	green = '\033[32m',
	reset = '\033[0m';

var slidesLocation = 'http://localhost' + (opts.port ? (':' + opts.port) : '');

console.log(brown + 'slam.js - Kleinkunst Competition Interactive Slides' + reset);
console.log('1. Open the slides at ' + green + slidesLocation + reset);
console.log('2. The control page should open automatically in a separate window.\n   \
If not, click on the link in your JS console');
console.log('3. Enter your competition data live and go through the slides as needed');
