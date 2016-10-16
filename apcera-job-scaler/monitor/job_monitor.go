// Copyright 2016 Apcera Inc. All right reserved.

package monitor

import (
	"encoding/json"
	"fmt"
	"sync"
	"time"

	"gopkg.in/beatgammit/turnpike.v2"

	"github.com/apcera/sample-apps/apcera-job-scaler/sink"
	"github.com/apcera/sample-apps/apcera-job-scaler/types"
	"github.com/apcera/sample-apps/apcera-job-scaler/util"
	"github.com/op/go-logging"
)

var log = logging.MustGetLogger("Job Monitor")

const (
	nginxTimeout = 55 * time.Second
	esRealm      = "com.apcera.api.es"
)

// JobMonitor defines a set of behavior expected of the Job Monitor
type JobMonitor interface {
	MonitorJob(string) error
	UnmonitorJob(string) error
	MonitorDown() chan bool
}

// defaultJobMonitor provides with a default implementation of the JobMonitor.
type defaultJobMonitor struct {
	lock sync.Mutex
	// jobSink is where the monitor Job's latest state is stored.
	jobSink        sink.JobSink
	wampClient     *turnpike.Client
	monitorStopped chan bool
}

// NewDefaultJobMonitor constructs the Monitor based on Apcera's Event System
// and unloads the subscribed data onto configured JobSink.
func NewDefaultJobMonitor(jobSink sink.JobSink) JobMonitor {
	jm := &defaultJobMonitor{}
	jm.jobSink = jobSink

	err := jm.establishEventsSession()
	if err != nil {
		log.Fatal(err)
	}

	jm.monitorStopped = make(chan bool)
	return jm
}

// establishWAMPSession establishes the WAMP protocol session to interact with
// Events API.
func (jm *defaultJobMonitor) establishEventsSession() error {
	targetURL := "ws://" + util.GetAPIEndpoint() + "/v1/wamp"

	var err error
	jm.wampClient, err = turnpike.NewWebsocketClient(turnpike.JSON, targetURL, nil)
	if err != nil {
		return fmt.Errorf("Failed creating the wamp websocket transport to ", targetURL, err)
	}
	_, err = jm.wampClient.JoinRealm(esRealm, nil)
	if err != nil {
		return fmt.Errorf("Failed joining the Event Server realm ", esRealm, err)
	}
	// ReceiveDone is notified when the client's connection to the router is lost.
	jm.wampClient.ReceiveDone = make(chan bool)

	go func(jm *defaultJobMonitor) {
		keepAlive := time.NewTicker(nginxTimeout).C
		for {
			select {
			// Streams till the connection is closed by the API Server
			case <-jm.wampClient.ReceiveDone:
				fmt.Println("WAMP Transport closed by the API Server. Job Monitoring Stopped.")
				jm.monitorStopped <- true
			case <-keepAlive:
				// NGINX terminates inactive connections post 60 seconds.
				// Sending a WAMP Hello{} message (harmless) as a packet ping to NGINX
				// to keep the connection alive.
				jm.wampClient.Send(&turnpike.Hello{})
			}
		}
	}(jm)

	return nil
}

// MonitorDown to reflect if the stream of events corresponding to the Job(s)
// being monitored by the Monitor is alive or not.
func (jm *defaultJobMonitor) MonitorDown() chan bool {
	return jm.monitorStopped
}

// MonitorJob subscribes to events for a given Job FQN.
func (jm *defaultJobMonitor) MonitorJob(jobFQN string) error {
	err := jm.wampClient.Subscribe(jobFQN, jm.eventHandler)
	if err != nil {
		return fmt.Errorf("Can't monitor job %v. %v", jobFQN, err)
	}
	return nil
}

// UnmonitorJob unsubscribes itself from the event stream of a given Job FQN.
func (jm *defaultJobMonitor) UnmonitorJob(jobFQN string) error {
	err := jm.wampClient.Unsubscribe(jobFQN)
	if err != nil {
		return fmt.Errorf("Can't unmonitor job %v. %v", jobFQN, err)
	}
	return nil
}

// 'args' and 'kwargs' are a list of items and map of key-word items that
// are published(optionally) by the publisher on the subscribed topic.
// Ref: WAMP Message Types PUBLISH/EVENT
func (jm *defaultJobMonitor) eventHandler(args []interface{}, kwargs map[string]interface{}) {
	// Find out what kind of event it is.
	event := args[0].(map[string]interface{})

	// Get and analyze event payload.
	payload, ok := event["payload"].(map[string]interface{})
	if !ok {
		log.Debug("Received unparsable event %v.", event)
		return
	}

	// Checking to see if it is an instance metric event.
	// TODO: Meta way to determine event payload type.
	_, ok = payload["cpu"]
	if !ok {
		log.Infof("Received Job event %v", payload)
		return
	}

	go jm.processInstanceStatePayload(payload)

	return
}

func (jm *defaultJobMonitor) processInstanceStatePayload(payload map[string]interface{}) {
	jsonPayload, err := json.Marshal(payload)
	if err != nil {
		log.Errorf("Non json event payload format. %v", jsonPayload)
		return
	}

	var iState types.InstanceState
	err = json.Unmarshal(jsonPayload, &iState)
	if err != nil {
		log.Errorf("Failed unmarshalling. ", err)
		return
	}

	jm.lock.Lock()
	defer jm.lock.Unlock()
	jm.jobSink.SetJobState(iState)
}
