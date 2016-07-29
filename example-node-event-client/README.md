# Simple Node.js event client

A simple Node.js application that demonstrates use of the [Events API](http://docs.apcera.com/api/events-system-api) to stream events for a cluster resource, such as a job or namespace. 

If you run the app in your Apcera cluster you can take advantage of the [application token](http://docs.apcera.com/jobs/app-token/) feature to automatically include an API token in each `/v1/wamp` API request. If you run the app locally (outside the cluster), you must provide your API token as an environment variable.

The application contains a variable named `subscribeFQN` that specifies the FQN of the resource to stream events for. Your user (or your application, if using an application token) must have read permissions on the specified resource to receive events  (see [Policy enforcement of event streams](http://docs.apcera.com/api/events-system-api/#policy)).

## Deploying to an Apcera cluster

Deploying the Node.js app to an Apcera cluster lets you take advantage of the application token feature.

1. Open index.js in a text editor and change the cluster name in the `wampAPIEndpoint` variable to point to your cluster. For example, if your cluster is located on `example.com`, change the value to the following:
   
        var wampAPIEndpoint = "api.example.com/v1/wamp"
        
2. From a terminal, change to the example-node-event-client directory and deploy the application to your cluster:
   
        cd example-node-event-client
        apc namespace /sandbox/admin
        apc app create node-event-tester --disable-routes --batch
        ...
        App may be started with:
          > apc app start node-event-tester
        Success!        
              
    Note the application's FQN (`/sandbox/admin::node-event-tester`, e.g.) as you'll need it in a subsequent step.
      
2. Bind the [HTTP service](/services/types/service-http/) to the application (required to enable the application token feature):
   
        apc service bind /apcera::http --job node-event-tester

3. Create a text document named **event-tester.pol** that contains the following policy:

        on job::/sandbox/admin::node-event-tester {
          { permit issue }
        }        

        on job::/apcera {
          if (auth_server@apcera.me->name == "job::/sandbox/admin::node-event-tester")
            { permit read }
        }   
   
    This policy issues an application token to the job you created, and gives that job read permission on the `/apcera` namespace so the application may stream events for that namespace. The job's FQN specified in the policy **must** match the FQN of the job you created in step 1 for the application token to be issued.

4. Import the policy document to your cluster:
    
        apc policy import event-tester.pol
        
6. Start the app:
    
        apc app start node-event-tester

7. Tail the app logs to view events written to the console:
   
        apc app logs node-event-tester
        [stdout][a2434d21] BEARER_TOKEN environment variable is undefined.
        [stdout][a2434d21] Connected to WAMP router, subscribing to events for 'job::/apcera'
        [stdout][a2434d21] Subscription succeeded for 'job::/apcera', waiting for events...
        [stdout][a2434d21] {
        [stdout][a2434d21]  "event_source": "",
        [stdout][a2434d21]  "payload": {
        [stdout][a2434d21]    "cpu": 0,
        [stdout][a2434d21]    "disk_total": 268435456,
        [stdout][a2434d21]    "disk_used": 9269248,
        [stdout][a2434d21]    "instance_uuid": "9ec6eb5b-5a0e-4433-9c2a-5b6e36e29278",
        [stdout][a2434d21]    "job_fqn": "job::/apcera::continuum-guide",
        [stdout][a2434d21]    "job_uuid": "87eb85e0-3e43-4d10-8cd9-092c22950905",
        [stdout][a2434d21]    "memory_total": 8388608,
        [stdout][a2434d21]    "memory_used": 7630848,
        [stdout][a2434d21]    "network_total": 10000000,
        [stdout][a2434d21]    "network_used": {
        [stdout][a2434d21]      "veth-9ec6eb5b": {}
        [stdout][a2434d21]    },
        [stdout][a2434d21]    "timestamp": 1469740182
        [stdout][a2434d21]  },
        [stdout][a2434d21]  "resource": "job::/apcera::continuum-guide",
        [stdout][a2434d21]  "time": 1469740182752244500,
        [stdout][a2434d21]  "type": 0
        [stdout][a2434d21] }

## Running locally

To run the outside of your Apcera cluster you must set an environment variable that contains your API token. You must also have Node.js and npm installed.

**Steps:**

1. From a terminal, change to the Install Node dependencies:
   
        npm install
       
2. Set an environment variable named `BEARER_TOKEN` that contains your API token:
   
        export BEARER_TOKEN='Bearer eyJ0eXA...'
        
    You can find your token in your system's `$HOME/.apc` file.      

4. Run the app:
   
        $ node index.js
        Connected to WAMP router, subscribing to events for 'job::/apcera'
        Subscription succeeded for 'job::/apcera', waiting for events...
        {
         "event_source": "",
         "payload": {
           "cpu": 0,
           "disk_total": 268435456,
           "disk_used": 9269248,
           "instance_uuid": "9ec6eb5b-5a0e-4433-9c2a-5b6e36e29278",
           "job_fqn": "job::/apcera::continuum-guide",
           "job_uuid": "87eb85e0-3e43-4d10-8cd9-092c22950905",
           "memory_total": 8388608,
           "memory_used": 7630848,
           "network_total": 10000000,
           "network_used": {
             "veth-9ec6eb5b": {}
           },
           "timestamp": 1469740182
         },
         "resource": "job::/apcera::continuum-guide",
         "time": 1469740182752244500,
         "type": 0
        }, ...
