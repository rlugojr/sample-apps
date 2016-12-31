#!/bin/bash

# Apcera apc CLI
route=`echo $TARGET | cut -d '/' -f3`
wget https://api.${route}/v1/apc/download/linux_amd64/apc.zip
unzip apc.zip -d /usr/local/bin
apc target $TARGET
apc login --app-auth

# start the slave
java -jar cli.jar -fsroot /root/.jenkins/workspace -master http://master.apcera.local:8080 -executors 1
