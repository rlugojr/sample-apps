#!/bin/bash
#
# This scripts cleans up the objects creatd by the deploy of jenkins-manifest.json
#

echo "Deleting jobs ..."
apc job delete --batch jenkins-master
apc job delete --batch jenkins-slave

echo "Deleting services ..."
apc service delete --batch jenkins-slave-nfs
apc service delete --batch jenkins-master-nfs

echo "Deleting network ..."
apc network delete jenkins-network

echo "Done"
