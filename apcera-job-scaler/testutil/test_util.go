package testutil

import (
	"fmt"
	"sort"
	"time"

	"github.com/apcera/sample-apps/apcera-job-scaler/types"
)

// Behavior generator mocks events for a single instance.
type BehaviorGenerator interface {
	Generate() ([]types.InstanceState, error)
}

// JobConfig describes the behavior of all mock instances for a job.
type JobConfig struct {
	Generators []BehaviorGenerator
}

// MockEventsGeneratorConfig describes the behavior of all mocked
// jobs.
type MockEventsGeneratorConfig struct {
	JobConfigs []JobConfig
}

//MockEventsGenerator is used to mock the event stream behavior of
//multiple jobs.
type MockEventsGenerator struct {
	Config MockEventsGeneratorConfig
}

// NewMockEventsGenerator constructs a MockEventsGenerator.
func NewMockEventsGenerator(config MockEventsGeneratorConfig) *MockEventsGenerator {
	return &MockEventsGenerator{
		Config: config,
	}
}

// GenerateMockInstanceData generates a slice of InstanceStates
// according to the specified configuration.
func (g *MockEventsGenerator) GenerateMockInstanceData() ([]types.InstanceState, error) {

	iStates := []types.InstanceState{}

	for _, job := range g.Config.JobConfigs {
		for _, instance := range job.Generators {
			newIStates, err := instance.Generate()
			if err != nil {
				return nil, err
			}

			iStates = append(iStates, newIStates...)
		}
	}

	sort.Sort(ByTime{iStates})

	return iStates, nil
}

// CPUGenerator implements the BehaviorGenerator interface.
type CPUGenerator struct {
	config BehaviorGeneratorConfig
}

// NewCPUGenerator is a constructor for a CPUGenerator.
func NewCPUGenerator(config BehaviorGeneratorConfig) *CPUGenerator {
	return &CPUGenerator{config: config}
}

// BehaviorGeneratorConfig specifies the configuration of the desired
// behavior for one instance.
type BehaviorGeneratorConfig struct {
	CPUSequence  []float64
	StartTime    time.Time
	InstanceUUID string
	JobFQN       string
	JobUUID      string
	CPUTotal     float64
}

// Initialize sets the configuration for CPUGenerator.
func (g *CPUGenerator) Initialize(config BehaviorGeneratorConfig) {
	g.config = config
}

// Generate generates a list of InstanceStates for one mock instance.
func (g *CPUGenerator) Generate() ([]types.InstanceState, error) {
	iStates := []types.InstanceState{}

	for i, cpuPercentage := range g.config.CPUSequence {
		cpu := cpuPercentage * float64(g.config.CPUTotal)
		timestamp := float64(g.config.StartTime.Add(time.Duration(time.Duration(10*i) * time.Second)).UnixNano())
		iStates = append(iStates, types.InstanceState{
			InstanceUUID: g.config.InstanceUUID,
			JobUUID:      g.config.JobUUID,
			JobFQN:       g.config.JobFQN,
			CPUTotal:     g.config.CPUTotal,
			CPU:          cpu,
			Timestamp:    timestamp,
		})
	}

	return iStates, nil
}

// The  following types  are defined  to  allow sorting  of events  by
// time. This allows the returned slice of InstanceStates to be sorted
// to simulate a stream of events coming from the cluster.
type InstanceStateSort []types.InstanceState

func (s InstanceStateSort) Len() int      { return len(s) }
func (s InstanceStateSort) Swap(i, j int) { s[i], s[j] = s[j], s[i] }

type ByTime struct{ InstanceStateSort }

func (s ByTime) Less(i, j int) bool {
	return s.InstanceStateSort[i].Timestamp < s.InstanceStateSort[j].Timestamp
}

// JobsCPUusage structure is a triply nested slice. By layer, the
// structure is:
//
// 1. slice of jobs
// 2. slice of instances per job
// 3. slice of cpu time-series per instance.
type JobsCPUUsage []InstanceCPUUsage

// InstancesCPUUsage type is a doubly nested slice. By layer, the
// structure is:
//
// 1. slice of instances per job
// 2. slice of cpu time-series per instance.
type InstanceCPUUsage []float64

// GenerateJobCPUevents takes a JobCPUusage  in order to Generate mock
// CPU time-series for an arbitrary number of jobs and instances.
func GenerateJobCPUEvents(cpuSeqs []JobsCPUUsage) ([]types.InstanceState, error) {
	startTime, err := time.Parse("Jan 2, 2006 at 3:04pm (MST)", "Feb 3, 2013 at 7:54pm (PST)")
	if err != nil {
		return nil, err
	}

	allStates := []types.InstanceState{}

	for i, jobSeq := range cpuSeqs {
		for j, instanceSeq := range jobSeq {
			genConfig := MockEventsGeneratorConfig{
				JobConfigs: []JobConfig{
					JobConfig{
						Generators: []BehaviorGenerator{
							NewCPUGenerator(BehaviorGeneratorConfig{
								CPUSequence:  instanceSeq,
								StartTime:    startTime,
								InstanceUUID: fmt.Sprintf("instance-uuid-%d", j),
								JobUUID:      fmt.Sprintf("job-uuid-%d", i),
								JobFQN:       fmt.Sprintf("job-fqn-%d", i),
								CPUTotal:     100,
							}),
						},
					},
				},
			}

			gen := NewMockEventsGenerator(genConfig)

			iStates, err := gen.GenerateMockInstanceData()
			if err != nil {
				return nil, err
			}

			allStates = append(allStates, iStates...)
		}
	}

	return allStates, nil
}
