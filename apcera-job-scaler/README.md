## Apcera Job Auto-scaler Application

The Apcera Job Auto-scaler application demonstrates how to monitor, analyze and scale the number of running instances of another job based on that job's CPU usage. The auto-scaler uses the uses the [Events System API](http://docs.apcera.com/api/events-system-api/) to subscribe to a stream of resource usage metrics for a target job you specify by FQN. The auto-scaler app collects and stores usage CPU metrics over a time window you specify and computes the average CPU usage across all job instances.
If the computed CPU usage rises above (or falls below) a percentage of the total available CPU that you specify, the auto-scaler uses the [Apcera REST API](https://docs.apcera.com/api/apcera-api-endpoints/#put-v1jobsuuid) to increase or decrease the number of job instances, as necessary.

The auto-scaler application has been tested to work with Apcera Platform version 2.4.0 and above.

## Auto-scaler application behavior

When the auto-scaler application starts up it reads its [configuration](#options) from the environment. It then subscribes to resource usage events for the job specified by the `$TARGET_JOB` environment variable. The Event Server publishes an [instance resource usage event](http://docs.apcera.com/api/event-object-reference/#instance-metric-events) every 10 seconds for each instance of the target job. Each usage event contains the instance's current CPU usage and its total CPU reservation.

At the end of the time period specified by the `$SCALING_FREQ` environment variable, the auto-scaler computes the target job's average (arithmetic mean) CPU usage across all instances. CPU usage is calculated as the arithmetic mean CPU usage for each individual instance of `$TARGET_JOB`, and then again the arithmetic mean of CPU utilization across all the instances of `$TARGET_JOB`. Based on this calculation it does one of the following:

- If the computed CPU usage is greater than `$CPU_ROOF`, and the total number of instances is not greater than `$MAX_INSTANCES`, it increases the number of instances of `$TARGET_JOB` by `$INSTANCE_COUNTER`.
- If the computed CPU usage is less than `$CPU_FLOOR`, and the total number of instances is not less than `$MIN_INSTANCES`, it decreases the number of instances of `$TARGET_JOB` by `$INSTANCE_COUNTER`.
- Otherwise, no action is taken on the target job.

Logs from the auto-scaler app are forwarded to **stderr**.

## Requirements

To use the auto-scaler application the following conditions must be met:

* [Policy](#requiredpolicy) must exist that issues an app token to the auto-scaler, and gives it permission to read/update properties of the target application.
* [CPU reservation](#cpureserve) must be set on the target application to monitor.

### Required policy

For the auto-scaler to function you must add policy to your cluster that issues an application token to the auto-scaler application, and that permits the auto-scaler to read and update properties on the target job. To do this you must have permissions to add/edit policy on your cluster (see [Policy authoring permissions](http://docs.apcera.com/policy/permissions/#policy-authoring-permissions)).

For example, suppose you've deployed the auto-scaler to `job::/sandbox/admin::apcera-job-scaler` and it is [configured](#options) to monitor the application at `job::/prod::my-app`. In this case, the following policy would be required:

    // Permit token to be issued to job-scaler app
    on job::/sandbox/admin::apcera-job-scaler {
        {permit issue}
    }

    // Permit job-scaler app to read and update properties of the target app
    on job::/prod::my-app {
        if (auth_server@apcera.me->name == "job::/sandbox/admin::apcera-job-scaler") {
            permit read, update
        }
    }

### Setting CPU reservation on target job {#cpureserve}

For the auto-scaler calculate CPU usage, you must assign a CPU reservation to the app you want to monitor. (By default, applications are provided with unlimited CPU time.) For example, the following command creates a new application and reserves 200 milliseconds of CPU time per second of physical time for the target app:

    apc app create my-app --cpus 200

Or to update an existing job's CPU reservation:

    apc app update my-app --cpus 200

## Configuring and deploying the Auto-scaler {#options}

The auto-scaler app's behavior is configured by the following environment variables that it reads from its enviroinment.

| Environment variable name | Description                                                                                                           | Default value |
| ------------------------- | --------------------------------------------------------------------------------------------------------------------- | ------------- |
| `API_ENDPOINT`            | **Required**. Cluster's API Server endpoint URL (api.example-cluster.com, for example).                                   | None.         |
| `TARGET_JOB`              | **Required**. The FQN of the job to monitor and scale.                                                                    | None.         |
| `SCALING_FREQ`            | Time in seconds after which the auto-scaler app will decide whether scale the target job or not.       | 60    |
| `CPU_ROOF`                | Percentage of CPU utilization of the target job above which the job instance should be incremented. | 80%           |
| `CPU_FLOOR`               | Percentage of CPU utilization of the target job below which the job instance count should be decremented. | 20%           |
| `INSTANCE_COUNTER`        | Number of instances to create or delete when the auto-scaling behavior is triggered.                          | 1             |
| `MAX_INSTANCES`           | Maximum number of instances the target job should be scaled up to.                                                    | 99            |
| `MIN_INSTANCES`           | Minimum number of instances the target job should be scaled down to.                                                  | 1             |

The easy way to deploy and configure the auto-scaler is with the provided application manifest ([continuum.conf](continuum.conf)). Locate the `env` block in the manifest and change the values of the environment variables, as necessary:

    # App Environment Variables;
    env {
       "API_ENDPOINT": "api.<cluster.domain>",
       "TARGET_JOB": "job::/<your>/<namespace>::<your-app>",
       "SCALING_FREQ": "30",
       "CPU_ROOF": "80",
       "CPU_FLOOR": "20",
       "MAX_INSTANCES": "20",
       "MIN_INSTANCES": "1",
       "INSTANCE_COUNTER": "1",
    }

Make the following changes to the environment variables:

* Replace `<cluster.domain>` in the `API_ENDPOINT` variable to your cluster's API Server URI (`api.example.com`, for example).
* Set the `TARGET_JOB` to the FQN of the example-go app you deployed previously (`job::/sandbox/admin::example-go`, for example). You **must** set a CPU reservation on the target job for the auto-scaler to compute CPU usage. See [Setting CPU reservation](#cpureserve).
* Leave the other [configuration options](#options) at their default values, or set them to the desired values.

Run the `apc app create` command to deploy the auto-scalcer using the modified app manifest run

    cd sample-apps/apcera-job-scaler
    apc app create

You also need to add policy to permit the auto-scaler to make authenticated API calls to read and update properties on `TARGET_JOB`. See [Required policy]().


## Auto-scaler application design

The auto-scaler application is composed of the following components: Job Monitor, Job Sink, Job Metric Calculator, and Job Scaler itself.

* Job Monitor -- Subscribes to events for the target job using the [Apcera Events System API](https://docs.apcera.com/api/events-system-api/). It saves metric event records to the Job Sink.
* Job Sink -- Stores and aggregates the metric data obtained for the target job for the latest time window specified by the `$SCALING_FREQ` parameter.
* Job Metric Calculator -- Acts as decorator to the information begin stored in Job Sink. It provides the algorithms for calculating resource utilization summaries for requested jobs. Currently, it only calculates CPU usage.
* Job Scaler -- Provides the primary application logic for scaling the target job's instance count up or down.

![scaler](architecture.png)

## Tutorial

This tutorial shows how to configure the auto-scaler app to monitor another application. For the target app to monitor, you'll deploy a simple Go app that listens for incoming HTTP requests on a port and returns a string. You'll then deploy an instance of the auto-scaler app that's configured to monitor and scale the Go app.

When the target app is not handling any HTTP requests its CPU usage will be negligible, and the auto-scaler will fall below the value specified by the `$CPU_FLOOR` configuration parameter. In response, the auto-scaler will reduce the number of app instances after each scaling period until the `$MIN_INSTANCES` count is reached.

If the Go app were to receive a spike in HTTP requests, and the calculated CPU usage increased above the `CPU_ROOF` value, then the number of instances would be increased.

**To deploy and configure auto-scaler**:

1. Clone (or [download](https://github.com/apcera/sample-apps/archive/master.zip)) the sample-apps repository:

        git clone git@github.com:apcera/sample-apps.git

1. In a terminal change to the `sample-apps/example-go` folder and deploy the app with three app instances, each given 200ms/s of CPU time:

        cd sample-apps/example-go
        apc app create example-go --instances 3 --cpus 200

    Note the sample app's FQN (`job::/sandbox/admin::example-go`, for example).

1. Change to the `sample-apps/apcera-job-scaler` folder and open the auto-scaler app's application manifest, **continuum.conf**, in an editor:

        cd sample-apps/apcera-job-scaler
        vi continuum.conf

2. Locate the `env` block in the app manifest, which specifies the environment variables that configure the auto-scaler's behavior:

        # App Environment Variables;
        env {
           "API_ENDPOINT": "api.<cluster.domain>",
           "TARGET_JOB": "job::/<your>/<namespace>::example-go",
           "SCALING_FREQ": "30",
           "CPU_ROOF": "80",
           "CPU_FLOOR": "20",
           "MAX_INSTANCES": "20",
           "MIN_INSTANCES": "1",
           "INSTANCE_COUNTER": "1",
        }

    Make the following changes to the configuration settings:

    * Replace `<cluster.domain>` in the `API_ENDPOINT` variable to your cluster's API Server URI (`api.example.com`, for example).
    * Set `TARGET_JOB` to the FQN of the example-go app you deployed previously (`job::/sandbox/admin::example-go`, for example).
    * Leave the other [configuration options](#options) at their defaults or set them to desired values.

4. Create the auto-scaler app with its specified configuration:

        apc app create --config continuum.conf

    Note the auto-scaler app's FQN (`job::/sandbox/admin::apcera-job-scaler`, for example).

5. Add the [required policy](#requiredpolicy) to your cluster. Change the namespaces (`/sandbox/admin` in the example below) to match the one where you deployed the `apcera-job-scaler` and `example-go` apps:

        on job::/sandbox/admin::apcera-job-scaler {
            {permit issue}
        }

        on job::/sandbox/admin::example-go {
            if (auth_server@apcera.me->name == "job::/sandbox/admin::apcera-job-scaler") {
                permit read, update
            }
        }

6. View the auto-scaler logs using APC or the Web Console:

        apc app logs apcera-job-scaler --lines 200

    As you watch the log output you'll see the auto-scaler collect the first set of metrics for each of the three instances of the example-go app. Since we specified a `$SCALING_FREQ` of 30 seconds this allows for collecting a total of nine metrics for all instances. At the end of that time period the CPU usage is calculated and determined be "0.008537888888888888". Since this is below the `$CPU_FLOOR` percentage of 20% that we specified, the number of instances is scaled down by `$INSTANCE_COUNTER` (1 in this case), as shown below.

        [stderr][b44ca45d] 2016/12/19 23:06:47 Total of 1 metrics gathered for instance 4e8a5f4a-cbd3-4884-9454-e42d9279aac1 of Job job::/sandbox/admin::example-go in the current window.
        [stderr][b44ca45d] 2016/12/19 23:06:50 Total of 1 metrics gathered for instance 58c77c5b-53dd-45ad-901e-54c77e9893b8 of Job job::/sandbox/admin::example-go in the current window.
        [stderr][b44ca45d] 2016/12/19 23:06:50 Total of 1 metrics gathered for instance 2ad9754c-eb30-49a7-96c8-ec4c033cac35 of Job job::/sandbox/admin::example-go in the current window.
        [stderr][b44ca45d] 2016/12/19 23:06:57 Total of 2 metrics gathered for instance 4e8a5f4a-cbd3-4884-9454-e42d9279aac1 of Job job::/sandbox/admin::example-go in the current window.
        [stderr][b44ca45d] 2016/12/19 23:07:00 Total of 2 metrics gathered for instance 2ad9754c-eb30-49a7-96c8-ec4c033cac35 of Job job::/sandbox/admin::example-go in the current window.
        [stderr][b44ca45d] 2016/12/19 23:07:00 Total of 2 metrics gathered for instance 58c77c5b-53dd-45ad-901e-54c77e9893b8 of Job job::/sandbox/admin::example-go in the current window.
        [stderr][b44ca45d] 2016/12/19 23:07:07 Total of 3 metrics gathered for instance 4e8a5f4a-cbd3-4884-9454-e42d9279aac1 of Job job::/sandbox/admin::example-go in the current window.
        [stderr][b44ca45d] 2016/12/19 23:07:10 Total of 3 metrics gathered for instance 58c77c5b-53dd-45ad-901e-54c77e9893b8 of Job job::/sandbox/admin::example-go in the current window.
        [stderr][b44ca45d] 2016/12/19 23:07:10 Total of 3 metrics gathered for instance 2ad9754c-eb30-49a7-96c8-ec4c033cac35 of Job job::/sandbox/admin::example-go in the current window.
        [stderr][b44ca45d] 2016/12/19 23:07:13 CPU Utilization for Job job::/sandbox/admin::example-go is at 0.008537888888888888
        [stderr][b44ca45d] 2016/12/19 23:07:14 Scaled down job instances from  3 to 2


    The auto-scaler continues to obtain metrics for the remaining two instances and determines from the calculated CPU usage that it can again scale down the number of instances to 1 instance.

        [stderr][b44ca45d] 2016/12/19 23:07:17 Total of 1 metrics gathered for instance 4e8a5f4a-cbd3-4884-9454-e42d9279aac1 of Job job::/sandbox/admin::example-go in the current window.
        [stderr][b44ca45d] 2016/12/19 23:07:20 Total of 1 metrics gathered for instance 58c77c5b-53dd-45ad-901e-54c77e9893b8 of Job job::/sandbox/admin::example-go in the current window.
        [stderr][b44ca45d] 2016/12/19 23:07:27 Total of 2 metrics gathered for instance 4e8a5f4a-cbd3-4884-9454-e42d9279aac1 of Job job::/sandbox/admin::example-go in the current window.
        [stderr][b44ca45d] 2016/12/19 23:07:30 Total of 2 metrics gathered for instance 58c77c5b-53dd-45ad-901e-54c77e9893b8 of Job job::/sandbox/admin::example-go in the current window.
        [stderr][b44ca45d] 2016/12/19 23:07:37 Total of 3 metrics gathered for instance 4e8a5f4a-cbd3-4884-9454-e42d9279aac1 of Job job::/sandbox/admin::example-go in the current window.
        [stderr][b44ca45d] 2016/12/19 23:07:40 Total of 3 metrics gathered for instance 58c77c5b-53dd-45ad-901e-54c77e9893b8 of Job job::/sandbox/admin::example-go in the current window.
        [stderr][b44ca45d] 2016/12/19 23:07:43 CPU Utilization for Job job::/sandbox/admin::example-go is at 0.015072666666666668
        [stderr][b44ca45d] 2016/12/19 23:07:44 Scaled down job instances from  2 to 1

    The auto-scaler continues to obtain metrics for the single remaining instance. The CPU usage is still below `$CPU_FLOOR` but since we have set the `$MIN_INSTANCES` to 1 it will not attempt further changes to the instance count.

        [stderr][b44ca45d] 2016/12/19 23:07:47 Total of 1 metrics gathered for instance 4e8a5f4a-cbd3-4884-9454-e42d9279aac1 of Job job::/sandbox/admin::example-go in the current window.
        [stderr][b44ca45d] 2016/12/19 23:07:57 Total of 2 metrics gathered for instance 4e8a5f4a-cbd3-4884-9454-e42d9279aac1 of Job job::/sandbox/admin::example-go in the current window.
        [stderr][b44ca45d] 2016/12/19 23:08:07 Total of 3 metrics gathered for instance 4e8a5f4a-cbd3-4884-9454-e42d9279aac1 of Job job::/sandbox/admin::example-go in the current window.
        [stderr][b44ca45d] 2016/12/19 23:08:13 CPU Utilization for Job job::/sandbox/admin::example-go is at 0.012842666666666667
        [stderr][b44ca45d] 2016/12/19 23:08:13 Minimum number of instances that could be scaled down to is  1


    Conversely, if something caused the target app's CPU usage to increase above 80% (our specified `$CPU_ROOF` value) then the auto-scaler would begin to increase the number of instances in the same manner.

        [stderr] 2016/12/20 00:29:57 Total of 1 metrics gathered for instance c3b19d8a-8989-4ff2-82c8-c9d3b6b39a70 of Job job::/sandbox/admin::example-go in the current window.
        [stderr] 2016/12/20 00:30:07 Total of 2 metrics gathered for instance c3b19d8a-8989-4ff2-82c8-c9d3b6b39a70 of Job job::/sandbox/admin::example-go in the current window.
        [stderr] 2016/12/20 00:30:17 Total of 3 metrics gathered for instance c3b19d8a-8989-4ff2-82c8-c9d3b6b39a70 of Job job::/sandbox/admin::example-go in the current window.
        [stderr] 2016/12/20 00:30:18 CPU Utilization for Job job::/sandbox/admin::example-go is at 13.2927715
        [stderr] 2016/12/20 00:30:18 Minimum number of instances that could be scaled down to is  1
        [stderr] 2016/12/20 00:30:27 Total of 1 metrics gathered for instance c3b19d8a-8989-4ff2-82c8-c9d3b6b39a70 of Job job::/sandbox/admin::example-go in the current window.
        [stderr] 2016/12/20 00:30:37 Total of 2 metrics gathered for instance c3b19d8a-8989-4ff2-82c8-c9d3b6b39a70 of Job job::/sandbox/admin::example-go in the current window.
        [stderr] 2016/12/20 00:30:47 Total of 3 metrics gathered for instance c3b19d8a-8989-4ff2-82c8-c9d3b6b39a70 of Job job::/sandbox/admin::example-go in the current window.
        [stderr] 2016/12/20 00:30:48 CPU Utilization for Job job::/sandbox/admin::example-go is at 94.42621450000001
        [stderr] 2016/12/20 00:30:49 Scaled up job instances from  1 to 2
        [stderr] 2016/12/20 00:30:49 Received Job event map[create_time:1.4821758351843756e+18 job_uuid:4dd21f17-1201-4c81-8abf-37c8c2e4f536 updated_by:job::/sandbox/admin::apcera-job-scaler user:job::/sandbox/admin::apcera-job-scaler action:job_instances_add created_by:tim.statler@apcera.com num_instances:2 tags:map[app:example-go] update_time:1.482193849007887e+18]


## Troubleshooting

Below are some common issues you may encounter when deploying or using the auto-scaler app.

* **"Failed joining the Event Server realm %!!(MISSING)(EXTRA string=com.apcera.api"** -- This error occurs if your cluster is missing policy that issues an API token to the auto-scaler app. See [Required Policy](#requiredpolicy).
* **"Job metrics not reported yet."** -- This message appears if you didn't add policy to allow the auto-scaler app to read and update the target job's properties. See [Required Policy](#requiredpolicy). Also make sure the target app is running.


