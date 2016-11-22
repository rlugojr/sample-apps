### apcera-job-scaler


This sample app when run in the cluster uses the Apcera Event System and Apptoken feature to monitor, analyze and automatically scale up/down instance count of running Jobs based on its ```CPU Utilization```.

To configure the app, following environment variables can be used:

MUST:
- API_ENDPOINT: Cluster's api server endpoint url
- TARGET_JOB: The Job FQN that is desired to be scaled. NOTE: For the target job to scale based on its CPU utilization, it should have its CPU quota configured.

OPTIONAL:
- SCALING_FREQ: Time in seconds after which the scaler app will make a decision as to
whether scale the TARGET_JOB or not. Default frequency is 1 minute.
- CPU_ROOF: CPU Utilization of the Target Job in terms of percentage beyond which
instance count of the job would be incremented.
- CPU_FLOOR: CPU Utilization of the Target Job in terms of percentage below which
instance count of the job would be decremented.
- INSTANCE_COUNTER: The no. of instances to be added or deleted once the auto
scaling behavior is triggered
- MAX_INSTANCES: Max no. of instances the target job can be scaled up to
- MIN_INSTANCES: Min no. of instances the target job can be scaled down to

Set the env vars in the manifest file
```
cd apcera-job-scaler
apc app create
```

OR

```
cd apcera-job-scaler
apc app create apcera-job-scaler  -e TARGET_JOB={Job FQN} -e API_ENDPOINT={Cluster API Server Endpoint}
apc service bind /apcera::http -j apcera-job-scaler
apc app start apcera-job-scaler
```

Policy needed for desired functionality:
```
on job::{namespace}::apcera-job-scaler {
    {permit issue}
}
on {TargetJobFQN} {
    if (auth_server@apcera.me->name beginsWith "job::{namespace}::apcera-job-scaler") {
        permit read, update
    }
}
```

ARCHITECTURE

Apcera Job Auto Scaler is composed of mainly three services: Job Sink, Job Monitor and Job Metric Calculator.

![scaler](https://cloud.githubusercontent.com/assets/16027357/20505997/b6e56420-b005-11e6-9fed-ac494fc26767.png)

Each of these services have been defined in terms of their behavior. One should be able to plug in different implementations of each based on the requirements.

Job Sink:
- This is a service which is to be used to keep track of the configured auto-scaling Jobs' latest (windowed) instance metric data.

Job Monitor:
- The service subscribes to requested Job FQNs events, using Apcera Events System API - WAMP, and stores the record, obtained in form of the Metric Event Payloads, to a Job Sink.
- Currently the Apcera Events System provides with Instance Metrics which includes information around usage of resources such as CPU, Disk, Memory and Network.

Job Metric Calculator:
- The service acts as decorator to the information being stored in Job Sink.
- It provides with Algorithms for calculating resource utilization summaries for requested jobs.

The Scaling Algorithm works as follows:
- Once the Scaler has been requested to scale a $TARGET_JOB, it will trigger the following behavior every $SCALING_FREQ seconds:
- If the CPU Util is greater than $CPU_ROOF, the Scaler will try to increment the no. of instances by $INSTANCE_COUNTER as long as the total no. of instance is not greater than $MAX_INSTANCES.
OR
- If the CPU Util is less than $CPU_FLOOR, the Scaler will try to decrement the no. of instances by $INSTANCE_COUNTER as long as the total no. of instance is not less than $MIN_INSTANCES.
- If neither of the above it will not act on the $TARGET_JOB at all.

NOTE:
- **CPU Util** is the arithmetic mean of CPU Utilization calculated on a list of metrics received for each individual instance of the $TARGET_JOB, and then again the arithmetic mean of CPU Utilization across all the instances of the $TARGET_JOB.
- The logs from the app are being forwarded to **stderr**.
