// Copyright 2016 Apcera Inc. All right reserved.

package main

import (
	"encoding/json"
	"strconv"
	"sync"
	"time"

	"github.com/apcera/sample-apps/apcera-job-scaler/metrics"
	"github.com/apcera/sample-apps/apcera-job-scaler/monitor"
	"github.com/apcera/sample-apps/apcera-job-scaler/sink"
	"github.com/apcera/sample-apps/apcera-job-scaler/util"
	"github.com/op/go-logging"
)

var log = logging.MustGetLogger("Job Scaler")

// ScalingJobConfig is the set of configurations associated with the
// job being scaled by the defaultJobScaler
type ScalingJobConfig struct {
	// jobFQN is the FQN of the job to be scaled
	jobFQN string
	// scalingFrequency is how often to scale the job
	scalingFrequency time.Duration
	// cpuRoof is the cpu usage in terms of percentage beyond which the
	// job would like scaling up
	cpuRoof int
	// cpuFloor is the cpu usage in terms of percentage below which the
	// job would like scaling down
	cpuFloor int
	// instanceCounter is the no. of instances to be added/deleted
	// when scaling behavior is triggered
	instanceCounter int
	// maxInstances is the max no. of instances the job can be scaled up to
	maxInstances int
	// minInstances is the min no. of intsances the job can be scaled down to
	minInstances int
}

// JobScaler is built using Job Monitor and Job Metric services/objects.
// It scales jobs based on the defaultScalingJobConfig data model.
type JobScaler struct {
	lock sync.RWMutex
	// jobsBeingScaled is the map to track jobs being scaled by the Job Scaler
	jobsBeingScaled map[string]chan bool
	// jobSink is the store being used to track metric stats
	jobSink sink.JobSink
	// jobMonitor subscribes to events on FQNs on which auto-scaling has been requested.
	jobMonitor monitor.JobMonitor
	// jobMetricCal provides with generic resource metric algorithms.
	jobMetricCalc metrics.JobMetricCalc
}

// NewJobScaler prototypes a possible Job Auto Scaler behavior.
func NewJobScaler() *JobScaler {
	js := &JobScaler{}
	js.jobsBeingScaled = make(map[string]chan bool)

	js.jobSink = sink.NewDefaultJobSink()
	js.jobMonitor = monitor.NewDefaultJobMonitor(js.jobSink)
	js.jobMetricCalc = metrics.NewDefaultJobMetricCalc(js.jobSink)

	return js
}

// EnableAutoScale queues in the job for monitoring and concurrently tracks
// for scaling triggers.
func (js *JobScaler) EnableAutoScale(config ScalingJobConfig) error {
	log.Infof("Enabling %v for auto scaling", config.jobFQN)
	err := js.jobMonitor.MonitorJob(config.jobFQN)
	if err != nil {
		return err
	}

	js.lock.Lock()
	js.jobsBeingScaled[config.jobFQN] = make(chan bool)
	js.lock.Unlock()
	go js.AutoScale(config, js.jobsBeingScaled[config.jobFQN])

	return nil
}

// DisableAutoScale dequeues the job from monitoring and stops tracking
// associated scaling triggers.
func (js *JobScaler) DisableAutoScale(jobFQN string) error {
	log.Infof("Disabling %v from auto scaling", jobFQN)
	err := js.jobMonitor.UnmonitorJob(jobFQN)
	if err != nil {
		return err
	}

	close(js.jobsBeingScaled[jobFQN])
	js.lock.Lock()
	delete(js.jobsBeingScaled, jobFQN)
	js.lock.Unlock()

	return nil
}

// AutoScale is the default algorithm being used to trigger scaling behaviour.
// It is mainly based around the ScalingJobConfig data model.
func (js *JobScaler) AutoScale(config ScalingJobConfig, done chan bool) {
	jobFQN := config.jobFQN
	scalingTicker := time.NewTicker(config.scalingFrequency).C
	for {
		select {
		// For now scaling just based on CPU Utilization.
		// This should be again configurable through parameters
		// in ScalingJobConfig.
		case <-scalingTicker:
			cpuUtil, err := js.jobMetricCalc.CPUUtilization(jobFQN)
			// Resetting job sink window of metrics
			js.jobSink.ResetStore()
			if err != nil {
				log.Error(err)
				continue
			}
			if cpuUtil > float64(config.cpuRoof) {
				js.scaleUp(config)
			}
			if cpuUtil < float64(config.cpuFloor) {
				js.scaleDown(config)
			}
		case <-done:
			return
		}
	}
}

func (js *JobScaler) scaleUp(sj ScalingJobConfig) {
	job, err := util.GetJob(sj.jobFQN)
	if err != nil {
		log.Errorf("Failed scaling up job %v. %v", sj.jobFQN, err)
		return
	}
	n := job["num_instances"].(json.Number)
	curCount, _ := strconv.Atoi(string(n))
	newCount := curCount + sj.instanceCounter
	if int(newCount) > sj.maxInstances {
		log.Info("Maximum number of instances that could be scaled up to is ", sj.maxInstances)
		return
	}

	job["num_instances"] = newCount
	err = util.SetJob(job)
	if err != nil {
		log.Errorf("Failed scaling up job %v. %v", sj.jobFQN, err)
		return
	}
	log.Infof("Scaled up job instances from  %v to %v", curCount, newCount)
}

func (js *JobScaler) scaleDown(sj ScalingJobConfig) {
	job, err := util.GetJob(sj.jobFQN)
	if err != nil {
		log.Errorf("Failed scaling down job %v. %v", sj.jobFQN, err)
		return
	}
	n := job["num_instances"].(json.Number)
	curCount, _ := strconv.Atoi(string(n))
	newCount := curCount - sj.instanceCounter
	if int(newCount) < sj.minInstances {
		log.Info("Minimum number of instances that could be scaled down to is ", sj.minInstances)
		return
	}
	job["num_instances"] = newCount
	err = util.SetJob(job)
	if err != nil {
		log.Errorf("Failed scaling down job %v. %v", sj.jobFQN, err)
		return
	}
	log.Infof("Scaled down job instances from  %v to %v", curCount, newCount)
}

// Inactive if the Job Monitor being used by the Job Scaler is down.
func (js *JobScaler) Inactive() chan bool {
	return js.jobMonitor.MonitorDown()
}
