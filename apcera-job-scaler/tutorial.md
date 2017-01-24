## Auto-scaler app tutorial

This tutorial demonstrates how to use the [Apcera Job Auto-Scaler](https://github.com/apcera/sample-apps/blob/job-scaler-readme-updates/apcera-job-scaler/README.md) application to auto-scale an application. The target you'll monitor is  a simple web server that listens for incoming HTTP requests and returns a string. You'll initially deploy multiple instances of the application. When the target app is not handling any HTTP requests its CPU usage will be negligible, and the auto-scaler will reduce the number of app instances until the `$MIN_INSTANCES` count is reached.

If the web server app were to receive a spike in HTTP requests, and the calculated CPU usage increased above the specified `CPU_ROOF` value, then the number of instances would be increased until `$MAX_INSTANCES` is reached.

**To auto-scale an application**:

1. Clone (or [download](https://github.com/apcera/sample-apps/archive/master.zip)) the sample-apps repository:

        git clone git@github.com:apcera/sample-apps.git

1. In a terminal change to the `sample-apps/example-go` folder and deploy the app with three instances, each given 200ms/s of CPU time:

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
    * Leave the other [configuration options](https://github.com/apcera/sample-apps/blob/job-scaler-readme-updates/apcera-job-scaler/README.md#options) at their defaults or set them to desired values.

4. Create the auto-scaler app with its specified configuration:

        apc app create --config continuum.conf

    Note the auto-scaler app's FQN (`job::/sandbox/admin::apcera-job-scaler`, for example).

5. Add the [required policy](https://github.com/apcera/sample-apps/blob/job-scaler-readme-updates/apcera-job-scaler/README.md#required-policy) to your cluster. Change the namespaces (`/sandbox/admin` in the example below) to match the one where you deployed the `apcera-job-scaler` and `example-go` apps:

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
