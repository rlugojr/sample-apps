
#!/bin/bash

#Delete existing jobs
apc app delete jenkins-master --batch
apc app delete jenkins-slave-1 --batch

#Create the virtual network
apc network create jenkins --batch

#Create Jenkins jobs
apc docker create jenkins-master -i apcerademos/jenkins -m 2G -d 10G --port 8080  -r http://jenkins.demo.apcera.net -e target="http://demo.apcera.net" -ae --batch
apc docker create jenkins-slave-1 -i apcerademos/jenkins -m 2G -d 10G --port 8080 -s "bash /slave.sh" -e target="http://demo.apcera.net" -ae --batch

#Attach jobs to the jenkins network
apc network join jenkins -j jenkins-master -da master --batch
apc network join jenkins -j jenkins-slave-1 --batch

#Bind the HTTP service gateway for app token to work
apc service bind /apcera::http --job jenkins-master --batch
apc service bind /apcera::http --job jenkins-slave-1 --batch


#Attach the policy for Jenkins master and slave
apc policy import jenkins.pol --batch

#Start the master and slaves
apc app start jenkins-master
apc app update jenkins-slave-1 -i 2 --batch
apc app start jenkins-slave-1
