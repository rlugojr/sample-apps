package sink

import (
	"sync"

	"github.com/apcera/sample-apps/apcera-job-scaler/types"
	"github.com/op/go-logging"
)

var log = logging.MustGetLogger("Job Sink")

// JobState tracks and keeps a history of instance metrics of a given Job
// keyed by its FQN.
type JobState struct {
	InstanceStates map[string][]types.InstanceState
}

// JobSink interface defines the behavior expected from a JobSink used by
// other services like Job Monitor and Job Metric.
type JobSink interface {
	SetJobState(types.InstanceState)
	GetJobState(string) JobState
	ResetStore()
}

type defaultJobSink struct {
	lock    sync.RWMutex
	jStates map[string]JobState
}

// NewDefaultJobSink creates a default implementation of Job Sink, which stores
// the instance metrics as basic in-memory map of Job States.
func NewDefaultJobSink() JobSink {
	js := &defaultJobSink{}
	js.jStates = make(map[string]JobState)
	return js
}

// SetJobState processes an individual instance metric event and stores it.
func (js *defaultJobSink) SetJobState(iState types.InstanceState) {
	js.lock.Lock()
	defer js.lock.Unlock()

	var jobState JobState
	if s, ok := js.jStates[iState.JobFQN]; !ok {
		jobState = JobState{
			InstanceStates: map[string][]types.InstanceState{},
		}
	} else {
		jobState = s
	}

	var iStates []types.InstanceState
	if s, ok := jobState.InstanceStates[iState.InstanceUUID]; !ok {
		iStates = []types.InstanceState{}
	} else {
		iStates = s
	}

	jobState.InstanceStates[iState.InstanceUUID] = append(iStates, iState)
	js.jStates[iState.JobFQN] = jobState

	log.Debugf("Total of %v metrics gathered for instance %v of Job %v in the current window.",
		len(jobState.InstanceStates[iState.InstanceUUID]), iState.InstanceUUID, iState.JobFQN)

	return
}

// GetJobState returns the state gathered by the JobSink for the given Job FQN.
func (js *defaultJobSink) GetJobState(jobFQN string) JobState {
	js.lock.RLock()
	defer js.lock.RUnlock()
	if _, ok := js.jStates[jobFQN]; !ok {
		return JobState{}
	}
	return js.jStates[jobFQN]
}

// Reset resets the store being used the Job Sink.
func (js *defaultJobSink) ResetStore() {
	js.lock.Lock()
	defer js.lock.Unlock()
	js.jStates = make(map[string]JobState)
}
