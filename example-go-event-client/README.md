# Basic Go Event Client

This sample demonstrates how to create a basic Go application that [streams events](/api/events-system-api/) from an Apcera cluster. The application uses the open-source [events library](https://github.com/apcera/util/tree/master/events) library from Apcera that, in turn, uses the open-source [Turnpike](https://github.com/jcelliott/turnpike) WAMP library to handle the communication between the client and the clsuter's WAMP router.

The application takes two parameters: the API endpoint on your cluster to connect to the WAMP router, and the FQN of the cluster resource for which you want to receive events, for example:

    go run main.go https://api.your-cluster.example.com/v1/wamp job::/apcera

The application requires that you set an environment variable named `API_TOKEN` that contains your authentication token. You can obtain your token for your cluster from the `$HOME/.apc` file created by APC, for example:

    {
      "target": "https://example.com",
      "tokens": {
        "https://example.com": "Bearer eyJ0eXAiOiIiLCJhbGciO..."
      },
      ...
    }

## Running the application

You run this application locally.

1. [Install Go](https://golang.org/doc/install) and set your `$GOPATH`.
2. Open a terminal and change to the example-go-event-client directory containing `main.go`.
3. Install Go dependencies:
   
        go get ./...

4. Export your API token as an environment variable named
   
        export API_TOKEN='Bearer eyJ...sVE'

5. Run the Go application, replacing `<cluster>` with your cluster's domain, and specifying the [FQN](/api/) of the resource to stream events for:
   
        go run main.go https://api.<cluster>/v1/wamp job::/apcera
        
    In a moment, JSON-encoded events will begin appearing in the console window. 
        
        
