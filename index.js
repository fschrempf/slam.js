var http      = require('http');
var express   = require('express');
var fs        = require('fs');
var io        = require('socket.io');
var Mustache  = require('mustache');

var path       = require('path');
var fs         = require('fs');
var bodyParser = require('body-parser');
var lowdbApi   = require('lowdb-api');

var app   = express();
var staticDir = express.static;
var server    = http.createServer(app);

var opts = {
	port :      1947,
	baseDir :   process.cwd() + '/'
};

var app_db   = express();
var db_file = path.join(opts.baseDir, '/db.json');
var db_options = { prefix: "/slam/data" };

app.use('/slam/data', bodyParser.json());
app.use('/slam/data', lowdbApi(db_file, db_options));

/*
 * Check if slam.js is installed as node module and all the frontend
 * dependencies are in the base projects 'node_modules', or if it
 * is pulled in from a subdirectory with its own 'node_modules'
 */
var dep_path = path.join(__dirname, 'node_modules/');
if (fs.existsSync(dep_path)) {
	console.log('Using dependencies from ' + dep_path);
}
else if (fs.existsSync(path.join(opts.baseDir, '/node_modules/'))) {
	dep_path = path.join(opts.baseDir, '/node_modules/');
	console.log('Using dependencies from ' + dep_path);
}

// Export the base projects assets
[ 'css', 'js', 'images', 'lib' ].forEach(function(dir) {
	app.use('/' + dir, staticDir(path.join(opts.baseDir, dir)));
});

// Export the lib assets
[ 'css', 'js' ].forEach(function(dir) {
	app.use('/' + dir, staticDir(path.join(dep_path, 'jsgrid/dist/')));
	app.use('/' + dir, staticDir(path.join(dep_path, 'bootstrap/dist/', dir)));
	app.use('/' + dir, staticDir(path.join(dep_path, 'jquery/dist')));
	app.use('/' + dir, staticDir(path.join(dep_path, 'jquery-ui-dist')));
	app.use('/' + dir, staticDir(path.join(dep_path, 'reveal.js/', dir)));
	// Export the slam.js assets
	app.use('/' + dir, staticDir(path.join(__dirname, dir)));
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
	fs.createReadStream(path.join(opts.baseDir, 'index.html')).pipe(res);
});

app.get('/slam/:socketId', function(req, res) {
	fs.readFile(path.join(__dirname, 'control.html'), function(err, data) {
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
