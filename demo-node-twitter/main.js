require('newrelic');
var app = require('express')();
var http = require('http').Server(app);
var io = require('socket.io')(http);
var data = [];
var mysql = require('mysql');
var job_bind = process.env.DBLINK_URI;
var mysql_bind = process.env.MYSQL_URI;
var username = process.env.USERNAME;
var password = process.env.PASSWORD;
var port = process.env.PORT;
var database = 'twitter';
var Twitter = require('twitter');
var consumer_key = process.env.consumer_key;
var consumer_secret = process.env.consumer_secret;
var access_token_key = process.env.access_token_key;
var access_token_secret = process.env.access_token_secret;
var twitter_topic = process.env.twitter_topic;

var client = new Twitter({
	"consumer_key": consumer_key,
	"consumer_secret": consumer_secret,
	"access_token_key": access_token_key,
	"access_token_secret": access_token_secret
});

if(job_bind){
	job_bind = job_bind.replace("tcp://","mysql://" + username + ':' + password + '@');
	var connection = mysql.createPool(job_bind + '/' + database);
	var connection_create = mysql.createPool(job_bind + '/');
	createdb(createdb_async);
}

if(mysql_bind){
	var parse_database =  mysql_bind.toString().split("/");
	database = parse_database[3];
	var uri = mysql_bind.replace(parse_database[3], "");
	var connection = mysql.createPool(mysql_bind);
	var connection_create = mysql.createPool(uri);
	createtable(createtable_async);
}

if(consumer_key && consumer_secret && access_token_key && access_token_secret && twitter_topic){
	startListen();
} else {
	console.log('\n[Twitter Support disabled]\n');
}


function startListen () {
	var stream = client.stream('statuses/filter', {track: twitter_topic});
	stream.on('data', function(tweet) {
		sendMessage(tweet.text);
	});

	stream.on('error', function(error) {
		console.log('\nAn error has occurred.');
		startListen();
	});
}

function showAll (callback) {
	data = "";
	connection.getConnection(function(err,connection) {
		connection.query("select * from twitter order by id desc limit 50;", function(err, rows) {
			if (!err)  {
				data = rows;
			}else {
				data =  "An error has occurred.";
				console.log(err);
			}
			connection.release();
			callback(data);
		});
	});
}


function truncate () {
	data = "";
	connection.getConnection(function(err,connection) {
		connection.query("truncate twitter;", function(err, rows) {
			connection.release();
		});
	});
}

function showall_async(data){
	data.reverse();
	io.emit('show all', 'clear');
	for(var i=0;i != data.length;i++){
		io.emit('show all', data[i].item);
	}
}

function sendMessage(mdata) {
	var chat_data = mdata;
	connection.getConnection(function(err,connection) {
		if(mdata.indexOf('\'') != -1){
			chat_data = mdata.replace(/\'/g,"\\\'");
		}

		connection.query("insert into twitter (item) values('" + chat_data +"');", function(err,rows) {
			if(err) {
				console.log('Error sending Twitter data', err);
			}
			connection.release();
		});
		showAll(showall_async);
	});
}

function createdb(callback){
	connection_create.getConnection(function(err,connection) {
		connection_create.query("create database " + database + ";", function(err, rows) {
			if(err) {
				console.log('Error creating database', err);
			}
			connection.release();
			createtable(createtable_async);
			callback('Creating Database.....');
		});
	});
}

function createtable(callback){
	connection.getConnection(function(err, connection){
		connection.query("CREATE TABLE twitter (id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,item VARCHAR(1000));", function(err, rows) {
			if(err) {
				console.log('Error creating table',err);
			}
			callback('Creating Table......');
			connection.release();
		});
	});
}

function createdb_async(data) {
	console.log(data);
}

function createtable_async(data) {
	console.log(data);
}

app.get('/', function(req, res){
	res.sendFile(__dirname + '/index.html');
});

app.get('/logo.png', function(req, res){
	res.sendFile(__dirname + '/logo.png');
});

app.get('/twitter.png', function(req, res){
	res.sendFile(__dirname + '/twitter.png');
});

app.get('/newrelic.png', function(req, res){
	res.sendFile(__dirname + '/newrelic.png');
});

app.get('/socket.io.js', function(req, res){
	res.sendFile(__dirname + '/node_modules/socket.io-client/socket.io.js');
});

io.on('connection', function(socket){
	socket.on('show all', function(msg){
		showAll(showall_async);
	});
});

io.on('connection', function(socket){
	socket.on('truncate table', function(msg){
		console.log('Starting to truncate table.........');
		truncate();
		console.log('Finished truncating database.');
	});
});

io.on('connection', function(socket){
	socket.on('chat message', function(msg){
		//sendMessage(msg);
		showAll(showall_async);
		console.log('chat message: ' + msg);
	});
});

http.listen(port, function(){
	console.log('listening on *:' + port);
});
