#!/bin/bash
#APC Config and Setup
export route=`echo $target | cut -d '/' -f3`
apc target $target
apc login --app-auth

#Start Jenkins
java $JAVA_OPTS -jar /usr/share/jenkins/jenkins.war&
sleep 30
echo "Installing Plugins.....";echo
java -jar /root/.jenkins/war/WEB-INF/jenkins-cli.jar -s http://127.0.0.1:8080/ install-plugin swarm github
echo "Restarting Jenkins for plugins to work.....";echo
java -jar /root/.jenkins/war/WEB-INF/jenkins-cli.jar -s http://127.0.0.1:8080/ restart
echo "Sleeping forever.....";echo
sleep infinity
