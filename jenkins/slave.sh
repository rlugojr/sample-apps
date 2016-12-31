#!/bin/bash

# Initializing Apcera
# start the slave
java -jar cli.jar -fsroot /root/.jenkins/workspace -master http://master.apcera.local:8080 -executors 1
