# About

Contains the Dockerfile and startup scripts to run a Jenkins cluster on Apcera. Feel free to test this out on the Apcera Platform Community Edition https://www.apcera.com/community-edition

# Build the Docker image

- Please adjust line 4 of the Dockerfile to point to your own Apcera Cluster so the appropriate APC version will be installed. When done, you can build the Docker image and push it to a public registry.
```
cd jenkins
docker build -t my-repo/jenkins .
docker push my-repo/jenkins
```

# Run the Docker image on Apcera
- Use APC to create a Jenkins master job from your Docker registry. The -r flag assigns a public route for you to access Jenkins. The envrionment variable "target" should reflect the address of the Apcera cluster.
```
apc docker create jenkins-master -i my-repo/apcerajenkins -m 2G -d 5G --port 8080 -ae -r http://master-jenkins.demo.apcera.net -e target="http://demo.apcera.net" --batch
```

- Use APC to create the Jenkins slave job from your Docker registry. Here we need to change the startup command with the -s flag because the slave nodes require a different application to connect to the Jenkins master.
```
apc docker create jenkins-slave -i my-repo/apcerajenkins -m 2G -d 5G --port 8080 -ae -s "bash /slave.sh" -e target="http://demo.apcera.net" --batch
```

# Configure the networking
- Create a virtual network for Jenkins and assign the Jenkins jobs to it. The -da argument assigns a static discovery address set to master. Please do not change this.
```
apc network create jenkins --batch
apc network join jenkins -j jenkins-master -da master --batch
apc network join jenkins -j jenkins-slave  --batch
```

# Setup policy for the application token
- Application tokens allow the APC client installed in the Jenkins jobs to authenticate securely with the Apcera platform. Modify jenkins.pol to reflect the correct namespace where the Jenkins jobs run. This policy file in this Git repository allows the Jenkins jobs to get assigned an App Token and policy. For more information on policy, please visit http://docs.apcera.com/jobs/app-token
```
apc policy import jenkins.pol
```

- Bind the HTTP service gateway for App Tokens to work
```
apc service bind /apcera::http --job jenkins-master --batch
apc service bind /apcera::http --job jenkins-slave --batch
```

# Start all of the Jenkins jobs
```
apc app start jenkins-master
apc app start jenkins-slave
```

# If desired, you can easily scale up the Jenkins slaves
```
apc app update jenkins-slave -i 3 --batch
```
