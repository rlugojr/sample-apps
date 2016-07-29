var Client = require('node-rest-client').Client;
var WebSocket = require('ws');

var client = new Client();

var dockerCreateEndpoint = "http://api.cosmic.apcera-platform.io/v1/jobs/docker"

// set content-type header and data as json in args parameter

var dockerRequestObject = `{
  "allow_egress":true,
  "exposed_ports":[
    2368
  ],
  "image_url":"https://registry-1.docker.io/library/ghost:latest",
  "job_fqn":"job::/sandbox/admin::ghost-blog",
  "resources":{
    "cpu":0,
    "disk":1073741824,
    "memory":268435456,
    "netmax":0,
    "network":5000000
  },
  "restart_config":{
    "maximum_attempts":0,
    "restart_mode":"no"
  },
  "routes":{
    "http://ghostblog.cosmic.apcera-platform.io":2368
  },
  "start":true,
  "volume_provider_fqn": "provider::/apcera/providers::apcfs"
}`;

var args = {
    data: dockerRequestObject,
    headers: { "Content-Type": "application/json", "Authorization": "Bearer eyJ0eXAiOiIiLCJhbGciOiIifQ.eyJpc3MiOiJiYXNpY19hdXRoX3NlcnZlckBhcGNlcmEubWUiLCJhdWQiOiJhcGNlcmEubWUiLCJpYXQiOjE0Njk4MDU0MTMsImV4cCI6MTQ2OTg5MTgyMywicHJuIjoiYWRtaW5AYXBjZXJhLm1lIiwiY2xhaW1zIjpbeyJJc3N1ZXIiOiJhdXRoX3NlcnZlckBhcGNlcmEubWUiLCJUeXBlIjoiYXV0aFR5cGUiLCJWYWx1ZSI6ImJhc2ljQXV0aCJ9XX0.MEUCIQDPqZVat4rKwIuHuujLzbjCSzvYcxeSBWsvXmgIMC6JJAIgNojxNzfd4uG1Ea8p3xhXhA7DMyqJaoJFkPeoHk6QeJs" }
};

client.post(dockerCreateEndpoint, args, function (data, response) {

    if(response.statusCode == '200') {
        streamTaskEvents(data.location)
    } else {
        console.log("ERROR: " + response.statusMessage, response.statusCode);
        console.log(data);
    }
});


function streamTaskEvents(taskLocation) {
    console.log(taskLocation);
    var ws = new WebSocket(taskLocation + "?authorization=Bearer eyJ0eXAiOiIiLCJhbGciOiIifQ.eyJpc3MiOiJiYXNpY19hdXRoX3NlcnZlckBhcGNlcmEubWUiLCJhdWQiOiJhcGNlcmEubWUiLCJpYXQiOjE0Njk4MDU0MTMsImV4cCI6MTQ2OTg5MTgyMywicHJuIjoiYWRtaW5AYXBjZXJhLm1lIiwiY2xhaW1zIjpbeyJJc3N1ZXIiOiJhdXRoX3NlcnZlckBhcGNlcmEubWUiLCJUeXBlIjoiYXV0aFR5cGUiLCJWYWx1ZSI6ImJhc2ljQXV0aCJ9XX0.MEUCIQDPqZVat4rKwIuHuujLzbjCSzvYcxeSBWsvXmgIMC6JJAIgNojxNzfd4uG1Ea8p3xhXhA7DMyqJaoJFkPeoHk6QeJs");

    ws.on('open', function open() {
      console.log("WebSocket connection established.")
    });

    ws.on('error', function open(err) {
      console.log("Error establishing connection.", err)
    });

    ws.on('message', function(data, flags) {
      // flags.binary will be set if a binary data is received.
      // flags.masked will be set if the data was masked.
      var response = JSON.parse(data);
      console.log(response)
      // console.log(response.thread, response.stage);
    });

}
