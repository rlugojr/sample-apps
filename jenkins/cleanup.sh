#!/bin/bash
#

apc namespace /sandbox/juan

apc job delete --batch jenkins-master
apc job delete --batch jenkins-slave

apc service delete --batch jenkins-slave-nfs
apc service delete --batch jenkins-master-nfs

apc network delete --batch jenkins

apc package delete --batch jenkins-master
apc package delete --batch jenkins-slave
