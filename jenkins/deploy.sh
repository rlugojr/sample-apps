#!/bin/bash
#

USAGE="deploy.sh <clustername>"
if [ ! -z "$1"] ; then
   echo "Please specify the cluster name."
else
   export CLUSTERNAME=$1
fi

if [ ! -z "$2"] ; then
   echo "Please specify the namespace"
else
   export NAMESPACE=$1
fi

apc target https://$CLUSTERNAME
RET=$?
if [ $RET -ne 0 ];
    exit 1
fi

apc namespace $NAMESPACE
RET=$?
if [ $RET -ne 0 ];
    exit 1
fi

apc deploy myapp.json -- --CLUSTERNAME $1 --NAMESPACE $NAMESPACE
