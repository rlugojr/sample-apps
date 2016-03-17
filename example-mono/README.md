# Mono.NET

This is a path to get .NET applications running on mono project, in a linux environment.

three things are provided:

 * A mono runtime environment (./runtime)
 * A stager (with instructions for creating the stager and staging pipeline) (./stager)
 * A very small mono sample app (./app)
 
The mono runtime is already installed in the proveapcera.io cluster.  If you wish to use it elsewhere, you will likely need to install it.  

When creating your app, the stager type will not be auto-detected (that is something that we can't set up on our own).  Thus, you will need to specify that on your own.  It is specified in the sample app's manifest:

```code
name: "aspx-sample"

resources {memory: "512MB"}

staging_pipeline: "/apcera::mono"

timeout: 10

templates: [
  {
    path: "/app/info.aspx"
  }
]
```

However, you can specify it on the command line:

```console
apc app create my-cal --staging /apcera::mono --memory 512MB --timeout 1
```

Note that the 512mb was just a swag, it is entirely possible that it is off-base.

## Runtime Package

To create the runtime package, switch to the runtime directory, then run:

```console
apc package build mono.conf
```

## Mono Stager

To create the runtime package, switch to the stager directory, then run:

```console
./repubStager.sh
```

This will clean out any old version of the stager and/or staging pipeline, and 
push them out.

