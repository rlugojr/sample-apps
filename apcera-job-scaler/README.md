## Apcera Job Auto-scaler Application

The Apcera Job Auto-scaler application demonstrates how to monitor, analyze and scale the number of running instances of another job based on that job's CPU usage. If the computed CPU usage climbs above (or falls below) a given percentage of the total available CPU, the auto-scaler application increase (or decreases) the number of job instances using the [Apcera REST API](https://docs.apcera.com/api/apcera-api-endpoints/#put-v1jobsuuid).

The auto-scaler application has been tested to work with Apcera Platform version 2.4.0 and above.

## Scaling behavior

When the auto-scaler application starts it reads its [configuration](#options) from the environment. It uses the [Events System API](http://docs.apcera.com/api/events-system-api/) to subscribe events for the job specified by the `$TARGET_JOB` environment variable. The Event Server publishes an [instance resource usage event](http://docs.apcera.com/api/event-object-reference/#instance-metric-events) every 10 seconds for each instance of the target job. Each resource usage event contains the instance's current CPU usage and its total CPU reservation.

The auto-scaler collects usage events for the number of seconds specified by the `$SCALING_FREQ` environment variable. At the end of this period the auto-scaler computes the target job's average (arithmetic mean) CPU usage across all instances. Specifically, CPU usage is calculated as the arithmetic mean CPU usage for each individual instance of `$TARGET_JOB`, and then again the arithmetic mean of CPU utilization across all the instances of `$TARGET_JOB`. It then takes one of the following actions:

- If the computed CPU usage is greater than `$CPU_ROOF`, and, the total number of instances is not greater than `$MAX_INSTANCES`, it calls [PUT /v1/jobs/{uuid}](https://docs.apcera.com/api/apcera-api-endpoints/#put-v1jobsuuid) to increase the number of instances of `$TARGET_JOB` by `$INSTANCE_COUNTER`.
- If the computed CPU usage is less than `$CPU_FLOOR` and the total number of instances is not less than `$MIN_INSTANCES`, then it calls [PUT /v1/jobs/{uuid}](https://docs.apcera.com/api/apcera-api-endpoints/#put-v1jobsuuid) to decrement the number of instances by `$INSTANCE_COUNTER`.
- Otherwise, it does not request any changes to `$TARGET_JOB`.

Note that the logs from the auto-scalcer app are forwarded to **stderr**.


## Auto-scaler configuration {#options}

The auto-scaler app's behavior is configured from environment variables that you set on the application.

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

### Required policy

You must also add policy to your cluster that issues an application token to the auto-scaler application, and that permits the auto-scaler app to read and update properties on the target job. For example, suppose the the auto-scaler is deployed to `job::/sandbox/admin::apcera-job-scaler`, and it is configured to monitor the application at `job::/prod::my-app`.

You would need the following policy that permit a token to be issued to the auto-scaler app:

    on job::/sandbox/admin::apcera-job-scaler {
        {permit issue}
    }

You must also add policy that gives the auto-scaler permission to read and update properties on the target job, for example:

    on job::/prod::my-app {
        if (auth_server@apcera.me->name == "job::/sandbox/admin::apcera-job-scaler") {
            permit read, update
        }
    }

### Setting CPU reservation

By default, applications on Apcera are provided with unlimited CPU time per second of physical time. For the auto-scaler app to calculate an instance's CPU usage you must assign an explicit CPU reservation to the app you want to monitor. For example, the following command creates a new application and reserves 200 milliseconds of CPU time per second of physical time for the target app:

    apc app create app-to-monitor --cpus 200

## Auto-scaler application design

The Apcera Job Auto-Scaler application is composed of the following components: Job Monitor, Job Sink, Job Metric Calculator, and Job Scaler itself.

* Job Monitor -- Subscribes to events for the target job using the [Apcera Events System API](https://docs.apcera.com/api/events-system-api/). It saves metric event records to the Job Sink.
* Job Sink -- Stores and aggregates the metric data obtained for the target job for the latest time window specified by the `$SCALING_FREQ` parameter.
* Job Metric Calculator -- Acts as decorator to the information being stored in Job Sink. It provides the algorithms for calculating resource utilization summaries for requested jobs. Currently, it only calculates CPU usage.
* Job Scaler -- Provides the primary application logic for scaling the target job's instance count up or down.

![scaler](architecture.png)

### Tutorial

This tutorial shows how to configure the auto-scaler app to monitor another application. The target app that you'll monitor is a simple Go application (example-go) that waits for incoming HTTP requests on a port and returns a string. You'll deploy the Go app with three instances. You'll then deploy an instance of the auto-scaler app that's configured to monitor and scale the Go app.

When the Go app is not handling any HTTP requests its CPU usage will be negligible, lower than the value specified by the `CPU_FLOOR` environment variable. In response, the auto-scaler will reduce the number of app instances instances after each scaling period. Conversely, if the app is handling lots of HTTP requests its calculated CPU usage will increase above the `CPU_ROOF` value and the number of instances will be increased.

**To auto-scale a test app:**

1. Clone (or [download](https://github.com/apcera/sample-apps/archive/master.zip)) the sample-apps repository:

        git clone git@github.com:apcera/sample-apps.git

1. In a terminal change to the `sample-apps/example-go` folder and deploy app with three app instances, each given 200ms/s of CPU time.

        cd sample-apps/example-go
        apc app create example-go --instances 3 --cpus 200

    Note the sample app's FQN (`job::/sandbox/admin::example-go`, for example).

1. Change to the `sample-apps/apcera-job-scaler` folder and open the auto-scaler app's application manifest, **continuum.conf**, in an editor:

        cd sample-apps/apcera-job-scaler
        vi continuum.conf

2. Locate the `env` block in the app manifest, which specifies the environment variables to set that configure the auto-scaler's behavior:

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
    * Set the `TARGET_JOB` to the FQN of the example-go app you deployed previously (`job::/sandbox/admin::example-go`, for example).
    * Leave the other [configuration options](#options) at their default values, or set them to the desired values.

4. Create the auto-scaler app.

        apc app create --config continuum.conf

    Note the auto-scaler app's FQN (`job::/sandbox/admin::apcera-job-scaler`, for example).

5. Add the [required policy](#requiredpolicy) to your cluster. Change the specified namespaces (`/sandbox/admin`) with the one where you deployed the `apcera-job-scaler` and `example-go` apps:

        on job::/sandbox/admin::apcera-job-scaler {
            {permit issue}
        }

        on job::/sandbox/admin::example-go {
            if (auth_server@apcera.me->name == "job::/sandbox/admin::apcera-job-scaler") {
                permit read, update
            }
        }

    The first policy permits an app token to be issued to the `apcera-job-scaler` app so it can make Apcera REST API calls. The second block permits the auto-scaler app to read and update properties on the example-go app via API calls.

5. Open the Web Console and click the Policy tab.

        Waiting for the application to start...
        [stdout][a1cfedde] Scaling Job Config set...
        [stdout][a1cfedde] FQN:  job::/sandbox/admin::cpu-stressor
        [stdout][a1cfedde] Scaling Frequency:  30s
        [stdout][a1cfedde] Lower CPU limit:  20
        [stdout][a1cfedde] Upper CPU limit:  80
        [stdout][a1cfedde] Minimum Instance limit:  1
        [stdout][a1cfedde] Maximum Instance limit:  20
        [stdout][a1cfedde] No. of Instances to be added/removed when scaling behavior triggered:  1
        [stderr][a1cfedde] 2016/12/14 00:29:48 Enabling job::/sandbox/tim.statler::mystresscap for auto scaling


  Alternatively, you can specify the environment variables on the command line:

      cd apcera-job-scaler
      apc app create apcera-job-scaler  -e TARGET_JOB={Job FQN} -e API_ENDPOINT={Cluster API Server Endpoint}
      apc service bind /apcera::http -j apcera-job-scaler
      apc app start apcera-job-scaler


## Troubleshooting

Below are some issues you may encounter when deploying the auto-scaler app.

* "Failed joining the Event Server realm" -- This error in the auto-scaler application usually means that your cluster is missing policy that permits a token to be issued to the application. See
