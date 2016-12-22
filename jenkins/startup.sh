#!/bin/bash
#
# This script is used to start jenkins inside an Apcera Cluster
#

echo "Jenkins starting .. ";echo

# TARGET must be set when deployed to an Apcera cluster.
if [ -z "$TARGET" ]; then
    echo "Please set the TARGET environment variable"
    exit 1
else
    echo "TARGET CLUSTER is ${TARGET}";echo
fi

java $JAVA_OPTS -jar /usr/share/jenkins/jenkins.war
