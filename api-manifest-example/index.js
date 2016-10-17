var Client = require('node-rest-client').Client;
var WebSocket = require('ws');
var client = new Client();

// By default, app uses WebSockets to track progress. To use HTTP polling, add USE_HTTP_POLLING=true as job environment variable
var useHTTPPolling = process.env.USE_HTTP_POLLING;

// Set to your target cluster name & domain (mycluster.example.com, e.g.)
var cluster = "kiso.io"

// /v1/manifests endpoint
var apiEndpoint = "http://api." + cluster + "/v1/manifests"
// The endpoint's POST body is a JSON-encoded multi-resource manifest (http://docs.apcera.com/jobs/multi-resource-manifests)
var manifestRequestObj = `{
    "jobs": {
        "job::/sandbox/<USER>::testcapsule": {
            "packages": [
                {
                    "fqn": "package::/apcera/pkg/os::ubuntu-14.04"
                }
            ],
            "ssh": true,
            "start": {
                "cmd": "/sbin/init"
            },
            "state": "started"
        }
    }
}`;

// POST request arguments (Authorization header is inserted via app token feature)
var args = {
    data: manifestRequestObj,
    headers: {
        "Content-Type": "application/json"
    }
};

// Streams task events over a WebSocket connection
function streamTaskEvents(taskLocation) {
    // Create new WebSocket from taskLocation URL
    var ws = new WebSocket(taskLocation);

    // Each websocket message is a TaskEvent object (http://docs.apcera.com/api/api-models/#taskevent)
    ws.on('message', function(data, flags) {
        var taskEvent = JSON.parse(data);
        var eventType = taskEvent.task_event_type;
        if (eventType == "error") {
            console.log("An error occurred deploying the manifest: " + taskEvent.payload.error);
            ws.close();
            return;
        }
        if (eventType == "eos") {
            ws.close();
            return;
        }
        var thread = taskEvent.thread;
        var stage = taskEvent.stage;
        var subtask = taskEvent.subtask;
        console.log(thread, "-", stage, "-", subtask.name);
    });

    ws.on('open', function open() {
        console.log("WebSocket connection established, waiting for task events...");
    });
    ws.on('error', function open(err) {
        console.log("Error establishing WebSocket connection.", err)
    });
    ws.on('close', function close() {
        console.log("WebSocket connection closed.")
    });
}

// Poll for task status over HTTP recursively
function pollTaskStatus(taskLocation) {
    client.get(taskLocation, function(data, response) {
        switch (response.statusCode) {
            case 200:
                // Response is a Task object (http://docs.apcera.com/api/api-models/#task)
                var task = data;
                var state = task.state;
                var errored = task.errored;
                if (state == "running" && errored == "unerrored") {
                    console.log("Task still running, polling again...")
                    pollTaskStatus(taskLocation);
                }
                if (state == "complete" && errored == "unerrored") {
                    console.log("Manifest deployed successfully.")
                    return;
                }
                if (state == "stopped" && errored == "errored") {
                    // Extract value from "error" JSON object (taskEvent.payload.error)
                    var errorMessage = getValues(task,'error')[0];
                    console.log("An error occurred deploying the manifest: ", errorMessage);
                    return;
                }
                break;
            case 403:
                // "Forbidden" error, usually a policy permissions error.
                console.log("403 error:", data.message);
                break;
        }

    }).on('error', function (err) {
        console.log('Error contacting API endpoint: ', err);
    });
}

// Make POST call to /v1/manifests endpoint. If successful, pass `location` field in response
// either to streamTaskEvents() or pollTaskStatus() method.
client.post(apiEndpoint, args, function(data, response) {
    switch (response.statusCode) {
        case 200:
            console.log("Got task URI: " + data.location);
            if (useHTTPPolling == "true") {
                console.log("Using HTTP polling.")
                pollTaskStatus(data.location);
            } else {
                console.log("Using WebSockets.")
                streamTaskEvents(data.location);
            }
            break;
        case 401:
            console.log("401 Unauthorized: Make sure you have policy that issues a token to your app, and that you are connecting to the right cluster (" + cluster + ")");
            break;
        case 403:
            console.log("403 error:", response.statusMessage)
            break;
        default:
            console.log(response.statusCode, response.statusMessage);
            break;
    }
}).on('error', function (err) {
    console.log('Error contacting API endpoint: ', err);
});

// Utility that returns an array of values that match on a JSON key (https://gist.github.com/iwek/3924925)
// Extracts the 'error' value from the first taskEvent.payload.error it finds.
function getValues(obj, key) {
    var objects = [];
    for (var i in obj) {
        if (!obj.hasOwnProperty(i)) continue;
        if (typeof obj[i] == 'object') {
            objects = objects.concat(getValues(obj[i], key));
        } else if (i == key) {
            objects.push(obj[i]);
        }
    }
    return objects;
}
