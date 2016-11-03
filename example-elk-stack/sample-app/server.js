var morgan = require('morgan')
var express = require('express');
var app = express();

morgan.token('cntm-instance', function getUUID (req) {
  return process.env['CNTM_INSTANCE_UUID']
})

morgan.token('real-client', function getRealClient (req) {
    return req["headers"]["x-forwarded-for"];
})

morgan.token('cntm-job', function getJobFQN (req) {
  return process.env['CNTM_JOB_FQN']
})

morgan.token('zulu-date', function getZuluDate (req) {
    return new Date().toISOString();
})

morgan.format('apcera', 'access-log :real-client :remote-user :zulu-date latency :response-time ms :cntm-job :cntm-instance ":method :url HTTP/:http-version" :status :res[content-length] ":referrer" ":user-agent"')

app.use(morgan('apcera'));

app.get('/', function(req, res){
    res.type('json');
    res.send(JSON.stringify(req.headers, null, 2));
});

app.get('/304', function(req, res) {
  res.redirect('/');
});

var listenPort = process.env['PORT'] ? process.env['PORT'] : 8081

var server = app.listen(listenPort, function () {
   var host = server.address().address
   var port = server.address().port
   
   console.log("Example app listening on port %s", port)
})