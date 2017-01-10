// global.AUTOBAHN_DEBUG = AUTOBAHN_DEBUG = true;

var autobahn = require('autobahn');

// Work-around for docs.apcera.com/api/events-system-api/#wamp-compat
autobahn.Session.prototype.resolve = function(value) {
    return value
}

// WAMP subscription topic FQN. Your API token must allow read access to this resource.
var subscribeFQN = "job::/apcera";

// Read API token from environment. Required for running outside the cluster.
var token = process.env.BEARER_TOKEN;
if (token == undefined) {
    console.log("BEARER_TOKEN environment variable is undefined. See README for details.")
}

var wampRealm = "com.apcera.api.es";
// Change the cluster name/location for your Apcera cluster:
var wampAPIEndpoint = "api.example.com/v1/wamp"
var wampURL = "ws://" + wampAPIEndpoint;
if (token != undefined) {
    wampURL += "?authorization=" + token;
}

// Connect to WAMP router
var connection = new autobahn.Connection({
    url: wampURL,
    realm: wampRealm
});

// Subscribe to events when connection is made
connection.onopen = function(session) {
    if (session) {
        console.log("Connected to WAMP router, subscribing to events for '" + subscribeFQN + "'");
    } else {
        console.log("Failed to connect to WAMP router.");
    }

    function onevent(args) {
        console.log(JSON.stringify(args[0], null, '\t'));
    }

    // Subscribing to topic and registering event listener
    session.subscribe(subscribeFQN, onevent).then(
        function(subscription) {
            // subscription succeeded, subscription is an instance of autobahn.Subscription
            console.log("Subscription succeeded for '" + subscribeFQN + "', waiting for events...");
        },
        function(error) {
            // subscription failed, error is an instance of autobahn.Error
            console.log("Subscription failed for '" + subscribeFQN + "'");
        }
    );

};

// Open connection to WAMP router
connection.open();
