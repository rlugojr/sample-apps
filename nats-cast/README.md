# nats-cast

This is a companion app to the [NATS Service Gateway] blog post. It creates a
`cast-server` app that serves a webpage containing a textbox. Any apps connected
to the `mynats` service gateway will receive any text typed in the textbox in
realtime.

## Start the server

HTTP server that will serve the textbox.

```
cd server
apc app create cast-server --start --batch
```

In a web browser, visit the URL created for this app.

## Bind gnatsd service to server app

This creates a NATS service gateway job. Many apps can bind to this gateway to
receive NATS messages.

```
apc service create mynats --type gnatsd --batch
apc service bind mynats --job cast-server --batch
```

## Create some clients

These are console-based clients that will receive messages typed in the webpage
textbox.

```
cd client
apc app create cast-client-1 --disable-routes --start --batch
apc app create cast-client-2 --disable-routes --start --batch
```

## Bind gnatsd service to client apps

This connects the clients to the NATS service gateway, which establishes a
connection between the server and all its clients.

```
apc service bind mynats --job cast-client-1 --batch
apc service bind mynats --job cast-client-2 --batch
```

## View incomming messages

Go back to the cast-server web page and start typing in the textbox. You should
see each character sent to the logs of both clients.

```
apc app logs cast-client-1
apc app logs cast-client-2
```

[NATS Service Gateway]: http://nats.io/blog/nats-service-gateway
