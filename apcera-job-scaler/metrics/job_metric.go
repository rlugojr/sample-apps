// Copyright 2016 Apcera Inc. All right reserved.

package metrics

import (
	"fmt"

	"github.com/apcera/sample-apps/apcera-job-scaler/sink"
	"github.com/apcera/sample-apps/apcera-job-scaler/types"
	"github.com/op/go-logging"
)

var log = logging.MustGetLogger("Job Metric Calculator")

// JobMetricCalc provides a list of algorithms to calculate aggregated metrics
// of a Job based on its individual instance metrics.
type JobMetricCalc interface {
	CPUUtilization(string) (float64, error)
	MemoryUtilization(string) (float64, error)
	DiskUtilization(string) (float64, error)
	NetworkUtilization(string) (float64, error)
}

type defaultJobMetricCalc struct {
	jobSink sink.JobSink
}

// NewDefaultJobMetricCalc provides default implementations of simplistic
// algorithms around calculation of job metrics.
func NewDefaultJobMetricCalc(js sink.JobSink) JobMetricCalc {
	jmc := &defaultJobMetricCalc{jobSink: js}
	return jmc
}

// CPUUtilization does a CPU utilization calculation based on the arithmetic
// mean of both individual instances aggregated stats as well as the set of
// instances together.
func (jmc *defaultJobMetricCalc) CPUUtilization(jobFQN string) (float64, error) {
	jobState := jmc.jobSink.GetJobState(jobFQN)

	if len(jobState.InstanceStates) == 0 {
		return 0, fmt.Errorf("Job metrics not reported yet.")
	}

	var jCPUUtil float64
	for _, iState := range jobState.InstanceStates {
		instanceCPUUtil, err := meanInstanceCPUUtil(iState)
		if err != nil {
			return 0, err
		}
		jCPUUtil += instanceCPUUtil
	}

	meanCPUUtil := jCPUUtil / float64(len(jobState.InstanceStates))
	log.Infof("CPU Utilization for Job %v is at %v", jobFQN, meanCPUUtil)
	return meanCPUUtil, nil
}

// Aggregates cpu utilization of a given instance metric state over a given
// window of events and returns an arithmetic mean of the same.
func meanInstanceCPUUtil(iState []types.InstanceState) (float64, error) {
	var iCPUUtil float64
	var count float64
	for _, iState := range iState {
		util, err := cpuUtilization(iState.CPU, iState.CPUTotal)
		if err != nil {
			return 0, err
		}
		iCPUUtil += util
		count++
	}
	return (iCPUUtil / count), nil
}

// cpuUtilization returns the percentage of CPU used of a given instance.
func cpuUtilization(cpuUsed, cpuTotal float64) (float64, error) {
	//cpuUsed in nanosecond/second, cpuTotal in milliseconds/second
	if cpuTotal == 0 {
		return 0, fmt.Errorf("CPU usage cannot be computed because CPU reservation not set on target job.")
	}
	return ((cpuUsed / cpuTotal) / 10000), nil
}

func (jmc *defaultJobMetricCalc) MemoryUtilization(jobFQN string) (float64, error) {
	return -1, fmt.Errorf("Memory utilizaiton not calculated.")
}

func (jmc *defaultJobMetricCalc) DiskUtilization(jobFQN string) (float64, error) {
	return -1, fmt.Errorf("Disk utilization not calculated.")
}

func (jmc *defaultJobMetricCalc) NetworkUtilization(jobFQN string) (float64, error) {
	return -1, fmt.Errorf("Network utilization not calculated.")
}
