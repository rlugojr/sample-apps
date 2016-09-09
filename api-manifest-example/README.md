# Deploying Apps from a Multi-resource Manifest using the Apcera REST API

This sample demonstrates how to deploy a [multi-resource manifest])(http://docs.apcera.com/jobs/multi-resource-manifests) using the [`POST /v1/manifest`](http://docs.apcera.com/api/apcera-api-endpoints/#post-v1manifests) endpoint, and then monitor the progress of the manifest's tasks using WebSockets or HTTP polling.

A successful response to a `POST /v1/manifest` request is the URL of the [Task](http://docs.apcera.com/api/api-models/#task) used to monitor the operation's progress ([`GET /v1/tasks/{uuid}`](http://docs.apcera.com/api/apcera-api-endpoints/#get-v1tasksuuid). There are two ways to use this URL to track task progress, as demonstrated by the sample:

* Use the URL to connect a WebSocket client to the Apcera cluster and stream task events in real-time.
* Repeatedly poll the URL over HTTP.

The app also uses the [app tokens](http://docs.apcera.com/jobs/app-token/) feature to automatically add the necessary authorization header to API calls.

## Deploy the app

1. Open index.js in an editor.
2. Locate the `cluster` variable and change the endpoint's domain to point to your cluster:

        // Set cluster to your target cluster name & domain (mycluster.example.com, e.g.)
        var cluster = "kiso.io"

2. Locate the `manifestRequestObj` and replace `<USER>` in the FQN of the job to create with your username:
   
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

4. Save your changes to index.js.
5. Deploy the Node.js application as follows, replacing `<USER>` with your username:
    
        apc app create /sandbox/<USER>::manifest_test --disable-routes --batch --start-cmd "node index; tail -f"

2. Bind the app to the HTTP service, to enable the app token feature, replacing `<USER>` with your username:
    
        apc service bind /apcera::http --job /sandbox/<USER>::manifest_test

3. Using the Web Console or APC, add the following policy to your cluster, replacing each instance of `<USER>` with your sandbox username:
   
        job::/sandbox/<USER>::manifest_test {
            { permit issue }
        }

        job::/sandbox/<USER> {
            if(auth_server@apcera.me->name == "job::/sandbox/<USER>::manifest_test")
            {
            role admin
            }
        }       
                            
    These policy rules do the following:
    
    * Allows the cluster to issue an app token to the `manifest_test` job's FQN. This FQN must match that of the Node.js app you are deploying.
    * Provides the Node.js app with full access to `job` resources in the user's sandbox namespace, so that it can successfully deploy the capsule described in the manifest.
                
4. Start the application using APC (as shown below) or [using the Web Console](https://docs.apcera.com/quickstart/console_tasks/#starting-and-stopping-jobs):
   
        apc app start manifest_test

6. Tail the app's logs using APC or the [Web Console](https://docs.apcera.com/quickstart/console_tasks/#tailing-job-logs) to view each task event:
    
        apc app logs manifest_test
        [stdout][1fc3a815] WebSocket connection established, waiting for task events...
        [stdout][1fc3a815] manifest - Deploy - execution started
        [stdout][1fc3a815] manifest - Deploy - looking up "package::/apcera/pkg/os::ubuntu-14.04"
        [stdout][1fc3a815] manifest - Deploy - creating "job::/sandbox/timgmail::testcapsule"
        [stdout][1fc3a815] manifest - Deploy - created "job::/sandbox/timgmail::testcapsule"
        [stdout][1fc3a815] manifest - Finish - execution was successful
        [stdout][1fc3a815] Manifest deployed successfully.
        [stdout][1fc3a815] WebSocket connection closed.


7. To have the Node.js use HTTP polling instead of WebSockets, add an environment variable named `USE_HTTP_POLLING` set to `true` and restart the app:
   
        apc app update manifest_test --env-set USE_HTTP_POLLING=true --restart

8. Tail the logs again to see the messages from the HTTP polling:
   
        [stdout][c4c52a6a] Got task URI: http://api.kiso.io/v1/tasks/1514547c-1ce5-4e47-854c-6a3682bef41a
        [stdout][c4c52a6a] Using HTTP polling.
        [stdout][c4c52a6a] Task still running, polling again...
        [stdout][c4c52a6a] Task still running, polling again...
        [stdout][c4c52a6a] Task still running, polling again...
        [stdout][c4c52a6a] Task still running, polling again...
        [stdout][c4c52a6a] Task still running, polling again...
        [stdout][c4c52a6a] Task still running, polling again...
        [stdout][c4c52a6a] Task still running, polling again...
        [stdout][c4c52a6a] Task still running, polling again...
        [stdout][c4c52a6a] Task still running, polling again...
        [stdout][c4c52a6a] Manifest deployed successfully.        
