#!/bin/bash
#APC Config and Setup
export route=`echo $target | cut -d '/' -f3`
apc target $target
apc login --app-auth
java -jar cli.jar -fsroot /root/.jenkins/workspace -master http://master.apcera.local:8080 -executors 1
