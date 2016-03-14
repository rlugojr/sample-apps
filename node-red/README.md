# node-red

This tutorial demonstrates three ways to deploy node-red using Apcera: package import, package build, and app from Docker.

## Import or build package

Here you can import the package *.cntmp files or build the package using a package script file. (Pick one. You don't need to do both.)

1) Import the node-red package.

`cd /sample-apps/node-red`

`apc package import *.cntmp -s`

This will import the packages:

- /apcera/pkg/packages::node-red
- /apcera/pkg/runtimes::node-0.10.33

2) Or, build the package using the script:

`apc package build node-red-pkg.conf -ns /apcera/pkg/packages`

NOTE: To build the package, your cluster must have the node-0.10.33 package. If you need to import it, run `apc package import node-0.10.33.cntmp -s`.

## Create the node-red-app

We provide a manifest file for creating the app.

1) Edit /sample-apps/node-red/node-red-app.conf.

- Update the namespace
- Edit the route endpoint: cluster-name and cluster domain (if necessary)
- Save changes

2) Create the node-red-app:

`apc app create --config node-red-app.conf`

3) Access the node-red-app.

The node-red-app should be accessible at `http://node-red.cluster-name.apcera-platform.io`.

## Use a Docker image

To create the node-red-app from a Docker image:

`apc docker run node-red -i apcera/node-red --port 1880`

The Dockerfile for this Docker image is provided in this directory for reference.