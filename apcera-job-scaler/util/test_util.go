package util

import (
	"fmt"
	"sort"
	"time"

	"github.com/apcera/sample-apps/apcera-job-scaler/types"
)

type BehaviorGenerator interface {
	Generate() ([]types.InstanceState, error)
}

type JobConfig struct {
	Generators []BehaviorGenerator
}

type MockGeneratorConfig struct {
	JobConfigs []JobConfig
}

type MockGenerator struct {
	Config MockGeneratorConfig
}

func NewMockGenerator(config MockGeneratorConfig) *MockGenerator {
	return &MockGenerator{
		Config: config,
	}
}

func (g *MockGenerator) GenerateMockInstanceData() ([]types.InstanceState, error) {

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

type CPUGenerator struct {
	config BehaviorGeneratorConfig
}

func NewCPUGenerator(config BehaviorGeneratorConfig) *CPUGenerator {
	return &CPUGenerator{config: config}
}

type BehaviorGeneratorConfig struct {
	CPUSequence  []float64
	StartTime    time.Time
	InstanceUUID string
	JobFQN       string
	JobUUID      string
	CPUTotal     float64
}

// TODO this should probably take a configuration with max mem, max cpu, etc
func (g *CPUGenerator) Initialize(config BehaviorGeneratorConfig) {
	g.config = config
}

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

type InstanceStateSort []types.InstanceState

func (s InstanceStateSort) Len() int      { return len(s) }
func (s InstanceStateSort) Swap(i, j int) { s[i], s[j] = s[j], s[i] }

type ByTime struct{ InstanceStateSort }

func (s ByTime) Less(i, j int) bool {
	return s.InstanceStateSort[i].Timestamp < s.InstanceStateSort[j].Timestamp
}

func GenerateJobCPUEvents(cpuSeqs [][][]float64) ([]types.InstanceState, error) {
	startTime, err := time.Parse("Jan 2, 2006 at 3:04pm (MST)", "Feb 3, 2013 at 7:54pm (PST)")
	if err != nil {
		return nil, err
	}

	allStates := []types.InstanceState{}

	for i, jobSeq := range cpuSeqs {
		for j, instanceSeq := range jobSeq {
			genConfig := MockGeneratorConfig{
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

			gen := NewMockGenerator(genConfig)

			iStates, err := gen.GenerateMockInstanceData()
			if err != nil {
				return nil, err
			}

			allStates = append(allStates, iStates...)
		}
	}

	return allStates, nil
}
