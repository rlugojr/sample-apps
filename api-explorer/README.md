# Apcera API Explorer

The Apcera API Explorer is a web application that lets you experiment with and learn about the [Apcera REST API](docs.apcera.com/api/apcera-api-endpoints/). This is the same API used by APC and the Web Console to interact with an Apcera cluster. 

## Running the API Explorer

Due to cross-domain restrictions in web browsers, you must run API Explorer on a local web server at `localhost:9000`. Your Apcera cluster will not accept requests if the app is running on another domain. 

1. Open **apcera-api.json** in a text editor.
2. Locate the `host` field in the JSON file and modify it to point to your cluster API server host. For instance, if your cluster is deployed to `example.com` change `host` to the following:

        "host": "api.example.com",

4. Save your changes to `apcera-api.json`.
2. Start a local web server on `localhost:9000`. If you have Python installed you can use the built-in web server:

        python -m SimpleHTTPServer 9000
        
8. Open [http://localhost:9000](http://localhost:9000).
   

## Getting your API token

To make API calls from the API Explorer against your Apcera cluster you need to provide your API token. Once you've [logged in to your cluster using APC](http://docs.apcera.com/quickstart/installing-apc/#targeting-your-platform-and-logging-in-using-apc), you can find your API token in the `$HOME/.apc` file.
   
1. Open `$HOME/.apc` in an editor and copy the API token to your clipboard. Don't include the **Bearer** preamble in the copied string, just the token value ("**eyJ0eXAiO**...", for example).
    
        {
          "target": "https://mycluster.apcera-platform.io:443",
          "tokens": {
            "https://mycluster.apcera-platform.io:443": "Bearer eyJ0eXAiOiIiLCJhbGci..."
          },
          ...
        }

2. In Apcera API Explorer, paste the token into the **Token** field, then click the arrow. You're now ready to make calls from the API Explorer.
