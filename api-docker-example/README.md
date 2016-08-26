# Monitoring App Creation from a Docker image with WebSockets

This sample demonstrates how to use the [POST /v1/jobs/docker](http://docs.apcera.com/api/apcera-api-endpoints/#post-v1jobsdocker) Apcera REST API to create an application from a Docker image and track the progress of the operation using WebSockets. You see this progress information when you run `apc docker run` or `apc docker pull`, for example:

```
apc docker pull my_redis --image redis
[my_redis] -- Pulling Docker image -- checking policy
[my_redis] -- Pulling Docker image -- checking if package FQN is taken
[my_redis] -- Pulling Docker image -- fetching image metadata
...
```

The HTTP response to the `/v1/jobs/docker` API is the [URI](http://docs.apcera.com/api/apcera-api-endpoints/#get-v1tasksuuid) of the corresponding [Task](http://docs.apcera.com/api/api-models/#task) used to monitor the operation's progress. A Task contains one or more [TaskEvent](http://docs.apcera.com/api/api-models/#taskevent) objects that provide details about each task in the process. There are two ways to use this URL in your API client:

* Create a WebSocket client using the location URI and stream task events (as this demo shows)
* Repeatedly poll the location URI over HTTP.
  
The application also uses the [app token](http://docs.apcera.com/jobs/app-token/) feature, which automatically adds the necessary authorization header to API calls.

The demo uses the [official NATS image](https://hub.docker.com/_/nats/) from Docker Hub.

## Deploying the app

Deploying the application involves modifying some string values in index.js to match your environment. You also need to bind the app to an HTTP service to enable the app token feature, and add policy to allow the app to be issued a token. You also need to add policy that allows the app to create jobs and packages in your namespace.

**Steps:**

1. Open index.js in an editor.
2. Locate the `dockerCreateEndpoint` variable and change the endpoint's domain to point to your cluster, e.g.:

        var dockerCreateEndpoint = "http://api.my-cluster.apcera-platform.io/v1/jobs/docker"  

2. Locate the `dockerRequestObject` object and replace `<USER>` in the `job_fqn` field with your user name (`/sandbox/admin`, e.g.):

        var dockerRequestObject = `{
          "image_url":"https://registry-1.docker.io/library/nats:latest",
          "job_fqn":"job::/sandbox/<USER>::nats",
          "start":true
        }`;

3. Save your changes to index.js.
3. Deploy the Node.js application:
    
        apc app create docker-api-tester --disable-routes --batch --start-cmd "node index; tail -f"

2. Bind the app to the HTTP service, to enable the app token feature.
    
        apc service bind /apcera::http --job docker-api-tester

3. Using the Web Console or APC, add the following policy to your cluster, replacing each instance of `<USER>` with your user name (`/sandbox/admin`, e.g.):
   
        job::/sandbox/<USER>::docker-api-tester {
            { permit issue }
        }
        job::/sandbox/<USER> {
            if (auth_server@apcera.me->name == "job::/sandbox/<USER>::docker-api-tester") {
                role admin
            }
        }        
        job::/sandbox/<USER> {
            if (auth_server@apcera.me->name == "job::/sandbox/<USER>::docker-api-tester") {
                docker.allow "*"
            }
        }        
        package::/sandbox/<USER> {
            if (auth_server@apcera.me->name == "job::/sandbox/<USER>::docker-api-tester") {
                role admin
            }
        }
                    
    These policy rules do the following:
    
    * Permits the cluster to issue a token to the application
    * Gives the application admin access over `job` resources in the user's sandbox namespace.
    * Permits the application to create an application in the user's sandbox from any Docker image.
    * Gives the application admin access over `package` resources in the user's sandbox.
                
4. Start the application:
   
        apc app start docker-api-test

6. Tail the app's logs to view each task event:
    
        apc app logs docker-api-test
        [stdout][c5a0cb8e] /v1/jobs/docker API request successful.
        [stdout][c5a0cb8e] WebSocket connection established, waiting for task events...
        [stdout][c5a0cb8e] Pulling Docker image - checking policy
        [stdout][c5a0cb8e] Pulling Docker image - checking if package FQN is taken
        [stdout][c5a0cb8e] Pulling Docker image - fetching image metadata
        [stdout][c5a0cb8e] Pulling Docker image - creating package
        [stdout][c5a0cb8e] Pulling Docker image - fetching 2 layers
        [stdout][c5a0cb8e] Downloading layers - downloading layer 13466366
        [stdout][c5a0cb8e] Downloading layers - downloading layer 86002cb8
        [stdout][c5a0cb8e] Downloading layers - downloaded layer 13466366
        [stdout][c5a0cb8e] Downloading layers - downloaded layer 86002cb8
        [stdout][c5a0cb8e] Pulling Docker image - downloaded all layers
        [stdout][c5a0cb8e] Creating job - 
        [stdout][c5a0cb8e] Configuring job - tagging package
        [stdout][c5a0cb8e] Starting job - 
        [stdout][c5a0cb8e] Task completed successfully.
        [stdout][c5a0cb8e] WebSocket connection closed.
