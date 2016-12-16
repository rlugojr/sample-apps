#!/bin/bash
#
# This script will deploy the jenkins manifest on a specified
# cluster and namespace
#


print_usage()
{
    USAGE="deploy.sh <clustername> <namespace> <nfs-provider>"
    echo $USAGE
    exit 1
}

if [ -z "$1" ]; then
   echo "Please specify the cluster name."
   print_usage
else
   export CLUSTERNAME=$1
fi

if [ -z "$2" ]; then
   echo "Please specify the namespace"
   print_usage
else
   export NAMESPACE=$2
fi

if [ -z "$3" ]; then
    export NFS_PROVIDER=apcfs
else
    export NFS_PROVIDER=$3
fi


apc target https://$CLUSTERNAME
RET=$?
if [ ${RET} -ne 0 ]; then
    print_usage
    exit 1
fi

apc namespace $NAMESPACE
RET=$?
if [ ${RET} -ne 0 ]; then
    print_usage
    exit 1
fi

apc manifest deploy myapp.json -- \
  --CLUSTERNAME $CLUSTERNAME --NAMESPACE $NAMESPACE --NFS_PROVIDER $NFS_PROVIDER
