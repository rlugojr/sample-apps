var Client = require('node-rest-client').Client;
var WebSocket = require('ws');

var client = new Client();

// Change API endpoint to point to your cluster (e.g. api.my-cluster.com/v1/jobs/docker)
var dockerCreateEndpoint = "http://api.cosmic.apcera-platform.io/v1/manifests"

// Docker request object (http://docs.apcera.com/api/api-models/#createdockerjobrequest)
// Change <USER> to your username
var dockerRequestObject = `{
  "jobs": {
    "job::/sandbox/admin::my-capsule": {
      "packages": [
      {
          "fqn": "package::/apcera/pkg/os::ubuntu-14.04-apc3"
      }
      ],
      "ssh": true,
      "start": {
        "cmd": "/sbin/init"
    },
    "state" : "started"
}
}
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
        console.log(stage, "-", subtask.name);
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
    });
}

function pollTaskStatus(taskURI) {
    console.log("Starting to poll...")
    client.get(taskURI, function(data, response) {
        var task = data;
        console.log(JSON.stringify(data, null, 4))
        // console.log("Polling again in 1 sec", data);
        // if (data.stage == "error") console.log("ERROR: " + data.payload.error);
        // if (eventType == "error") {
        //     console.log("Task error: " + taskEvent.payload.error);
        //     return;
        // }
        // console.log(taskEvent.subtask)
        // If task has not stopped/errored, schedule another poll
    });
}

// Make API call to /v1/jobs/docker. If successful, pass `location` field to streamTaskEvents() method.
client.post(dockerCreateEndpoint, args, function(data, response) {
    switch (response.statusCode) {
        case 200:
        console.log("/v1/jobs/docker API request successful. " + data.location);
            // streamTaskEvents(data.location);
            pollTaskStatus(data.location);
            break;
            case 400:
            console.log("/v1/jobs/docker API error", data.message)
            break;
            default:
            console.log(response.statusCode, response.statusMessage);
        }
    }).on('error', function(err) {
        console.log('Error contacting API endpoint.', dockerCreateEndpoint);
    });
