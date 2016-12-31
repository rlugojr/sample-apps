#!/bin/bash
#
# This script is used to start jenkins inside an Apcera Cluster
#
PLUGIN_LIST="swarm github workflow-aggregator workflow-job workflow-basic-steps"

# TARGET must be set when deployed to an Apcera cluster.
if [ -z "$TARGET" ]; then
    echo "$0:Please set the TARGET environment variable"
    exit 1
else
    echo "$0: TARGET CLUSTER is ${TARGET}";echo
fi

#Start Jenkins
echo "$0: Jenkins starting .. ";echo
java $JAVA_OPTS -jar /usr/share/jenkins/jenkins.war&


echo "$0: Jenkins check on installed plugins .. ";echo
until java -jar /root/.jenkins/war/WEB-INF/jenkins-cli.jar -s http://127.0.0.1:8080/ list-plugins > INSTALLED_PLUGINS 2>/dev/null
do
    echo "$0: Jenkins is not ready .. ";echo
    sleep 3
done

RESTART=''
for p in $PLUGIN_LIST
do
    if grep $p INSTALLED_PLUGINS ; then
        echo "$0: Found plugin $p installed .. "; echo
    else
        echo "$0: Installing plugin $p"; echo
        java -jar /root/.jenkins/war/WEB-INF/jenkins-cli.jar -s http://127.0.0.1:8080/ install-plugin ${p}
        RESTART=true
    fi
done

if [ ${RESTART} == 'true' ]; then
    echo "$0: Restarting Jenkins to activate plugins ...";echo
    java -jar /root/.jenkins/war/WEB-INF/jenkins-cli.jar -s http://127.0.0.1:8080/ restart
fi

echo "$0: Sleeping forever ...";echo
while kill -0 `pidof java` ; do
  sleep 1
done
