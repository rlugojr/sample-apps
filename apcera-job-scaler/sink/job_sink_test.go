package sink

import (
	"reflect"
	"testing"

	"github.com/apcera/sample-apps/apcera-job-scaler/testutil"
)

func TestJobSinkStoresOneEvent(t *testing.T) {
	jobSeqs := []testutil.JobsCPUUsage{
		[]testutil.InstanceCPUUsage{
			[]float64{.20},
		},
	}

	iStates, err := testutil.GenerateJobCPUEvents(jobSeqs)
	if err != nil {
		t.Fatal(err)
	}

	js := NewDefaultJobSink()

	js.SetJobState(iStates[0])
	jobState := js.GetJobState("job-fqn-0")

	instance, ok := jobState.InstanceStates[iStates[0].InstanceUUID]
	if !ok {
		t.Fatalf("Expected jobState to contain InstanceUUID: %q", iStates[0].InstanceUUID)
	}

	if len(instance) != 1 {
		t.Fatalf("Expected slice of length 1")
	}

	if !reflect.DeepEqual(iStates[0], instance[0]) {
		t.Fatalf("Input state %+v != output state %+v", iStates[0], instance[0])
	}
}

func TestJobSinkStoresTwoEvents(t *testing.T) {
	jobSeqs := []testutil.JobsCPUUsage{
		[]testutil.InstanceCPUUsage{
			[]float64{.20, .30}},
	}

	iStates, err := testutil.GenerateJobCPUEvents(jobSeqs)
	if err != nil {
		t.Fatal(err)
	}

	js := NewDefaultJobSink()

	for _, iState := range iStates {
		js.SetJobState(iState)
	}

	jobState := js.GetJobState("job-fqn-0")

	instance, ok := jobState.InstanceStates["instance-uuid-0"]
	if !ok {
		t.Fatalf("Expected instance %q to be present in JobState", "instance-uuid-0")
	}

	expectedCPU := []float64{20, 30}

	for i, iState := range instance {
		if expectedCPU[i] != iState.CPU {
			t.Fatalf("Expected CPU to be %f, got %f", expectedCPU[i], iState.CPU)
		}
	}

}

func TestJobSinkWithTwoInstances(t *testing.T) {
	jobSeqs := []testutil.JobsCPUUsage{
		[]testutil.InstanceCPUUsage{
			[]float64{.20, .30},
			[]float64{.40, .40, .40},
		},
	}

	iStates, err := testutil.GenerateJobCPUEvents(jobSeqs)
	if err != nil {
		t.Fatal(err)
	}

	js := NewDefaultJobSink()

	for _, iState := range iStates {
		js.SetJobState(iState)
	}

	jobState := js.GetJobState("job-fqn-0")

	instance1, ok := jobState.InstanceStates["instance-uuid-0"]
	if !ok {
		t.Fatalf("Expected instance %q to be present in JobState", "instance-uuid-0")
	}

	expectedCPU := []float64{20, 30}
	for i, iState := range instance1 {
		if expectedCPU[i] != iState.CPU {
			t.Fatalf("Expected CPU to be %f, got %f", expectedCPU[i], iState.CPU)
		}
	}

	instance2, ok := jobState.InstanceStates["instance-uuid-1"]
	if !ok {
		t.Fatalf("Expected instance %q to be present in JobState", "instance-uuid-1")
	}

	expectedCPU = []float64{40, 40, 40}
	for i, iState := range instance2 {
		if expectedCPU[i] != iState.CPU {
			t.Fatalf("Expected CPU to be %f, got %f", expectedCPU[i], iState.CPU)
		}
	}
}

func TestJobSinkWithTwoJobs(t *testing.T) {
	jobSeqs := []testutil.JobsCPUUsage{
		[]testutil.InstanceCPUUsage{
			[]float64{.20, .30},
		},
		[]testutil.InstanceCPUUsage{
			[]float64{.40, .40, .40},
		},
	}

	iStates, err := testutil.GenerateJobCPUEvents(jobSeqs)
	if err != nil {
		t.Fatal(err)
	}

	js := NewDefaultJobSink()

	for _, iState := range iStates {
		js.SetJobState(iState)
	}

	jobState1 := js.GetJobState("job-fqn-0")

	instance1, ok := jobState1.InstanceStates["instance-uuid-0"]
	if !ok {
		t.Fatalf("Expected instance %q to be present in JobState", "instance-uuid-0")
	}

	expectedCPU := []float64{20, 30}
	for i, iState := range instance1 {
		if expectedCPU[i] != iState.CPU {
			t.Fatalf("Expected CPU to be %f, got %f", expectedCPU[i], iState.CPU)
		}
	}

	jobState2 := js.GetJobState("job-fqn-1")

	instance2, ok := jobState2.InstanceStates["instance-uuid-0"]
	if !ok {
		t.Fatalf("Expected instance %q to be present in JobState", "instance-uuid-0")
	}

	expectedCPU = []float64{40, 40, 40}
	for i, iState := range instance2 {
		if expectedCPU[i] != iState.CPU {
			t.Fatalf("Expected CPU to be %f, got %f", expectedCPU[i], iState.CPU)
		}
	}

}
