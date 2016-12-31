#!/bin/bash
#APC Config and Setup
apc target $TARGET
apc login --app-auth
java -jar cli.jar -fsroot /root/.jenkins/workspace -master http://master.apcera.local:8080 -executors 1
