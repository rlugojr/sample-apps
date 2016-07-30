var Client = require('node-rest-client').Client;
var WebSocket = require('ws');

var client = new Client();

// Change API endpoint to point to your cluster (e.g. api.my-cluster.com/v1/jobs/docker)
var dockerCreateEndpoint = "http://api.example.com/v1/jobs/docker"

// Docker request object (http://docs.apcera.com/api/api-models/#createdockerjobrequest)
// Change <USER> to your username
var dockerRequestObject = `{
  "image_url":"https://registry-1.docker.io/library/nats:latest",
  "job_fqn":"job::/sandbox/<USER>::nats",
  "start":true
}`;

// Request arguments
var args = {
    data: dockerRequestObject,
    headers: {
        "Content-Type": "application/json"
    }
};

// Creates a websocket and stream events
function streamTaskEvents(taskLocation) {
    // Create new WebSocket using `location` URL
    var ws = new WebSocket(taskLocation);

    ws.on('open', function open() {
        console.log("WebSocket connection established, waiting for task events...");
    });

    ws.on('error', function open(err) {
        console.log("Error establishing connection.", err)
    });

    ws.on('close', function close() {
        console.log("WebSocket connection closed.")
    });

    // Each message is a TaskEvent object (http://docs.apcera.com/api/api-models/#taskevent)
    ws.on('message', function(data, flags) {
        var taskEvent = JSON.parse(data);
        var eventType = taskEvent.task_event_type;
        if (eventType == "error") {
            console.log("Task error: " + taskEvent.payload.error);
            return;
        }
        if (eventType == "eos") {
            console.log("Task completed successfully.");
            return;
        }
        var thread = taskEvent.thread;
        var stage = taskEvent.stage;
        var subtask = taskEvent.subtask;
        console.log(stage, "-", subtask.name);
    });
}

// Make API call to /v1/jobs/docker. If successful, pass `location` field to streamTaskEvents() method.
client.post(dockerCreateEndpoint, args, function(data, response) {
    switch (response.statusCode) {
        case 200:
            console.log("/v1/jobs/docker API request successful.");
            streamTaskEvents(data.location);
            break;
        case 400:
            console.log("/v1/jobs/docker API error", data.message)
            break;
        default:
            console.log(response.statusCode, data.message);
    }
}).on('error', function (err) {
    console.log('Error contacting API endpoint.', dockerCreateEndpoint);
});
