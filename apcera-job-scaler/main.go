// Copyright 2016 Apcera Inc. All rights reserved.

package main

import (
	"fmt"
	"os"
	"strconv"
	"time"
)

// getScalingJobConfig constructs the configurations of the scaling job and
// its associated scaling triggers from environment variables if set, or else
// populates with default values
func getScalingJobConfig() ScalingJobConfig {
	sj := ScalingJobConfig{}

	jobFQN := os.Getenv("TARGET_JOB")
	if jobFQN == "" {
		fmt.Println("TARGET_JOB not set in environment")
		os.Exit(1)
	}

	sj.jobFQN = jobFQN
	scalingFrequency := os.Getenv("SCALING_FREQ")
	if scalingFrequency == "" {
		fmt.Println("SCALING_FREQ not set. Defaulting scaling frequency to 1 minute")
		sj.scalingFrequency = 1 * time.Minute
	} else {
		sf, _ := strconv.Atoi(scalingFrequency)
		sj.scalingFrequency = time.Duration(sf) * time.Second
	}

	cpuRoof := os.Getenv("CPU_ROOF")
	if cpuRoof == "" {
		fmt.Println("CPU_ROOF not set. Defaulting cpu roof to 80%")
		sj.cpuRoof = 80
	} else {
		sj.cpuRoof, _ = strconv.Atoi(cpuRoof)
	}

	cpuFloor := os.Getenv("CPU_FLOOR")
	if cpuFloor == "" {
		fmt.Println("CPU_FLOOR not set. Defaulting cpu floor to 20%")
		sj.cpuFloor = 20
	} else {
		sj.cpuFloor, _ = strconv.Atoi(cpuFloor)
	}

	instanceCounter := os.Getenv("INSTANCE_COUNTER")
	if instanceCounter == "" {
		fmt.Println("INSTANCE_COUNTER not set. Defaulting instance counter to 1")
		sj.instanceCounter = 1
	} else {
		sj.instanceCounter, _ = strconv.Atoi(instanceCounter)
	}

	maxInstances := os.Getenv("MAX_INSTANCES")
	if maxInstances == "" {
		fmt.Println("MAX_INSTANCES not set. Defaulting max instances to 99")
		sj.maxInstances = 99
	} else {
		sj.maxInstances, _ = strconv.Atoi(maxInstances)
	}

	minInstances := os.Getenv("MIN_INSTANCES")
	if minInstances == "" {
		fmt.Println("MIN_INSTANCES not set. Defaulting min instances to 1")
		sj.minInstances = 1
	} else {
		sj.minInstances, _ = strconv.Atoi(minInstances)
	}

	fmt.Println("Scaling Job Config set...")
	fmt.Println("FQN: ", sj.jobFQN)
	fmt.Println("Scaling Frequency: ", sj.scalingFrequency)
	fmt.Println("Lower CPU limit: ", sj.cpuFloor)
	fmt.Println("Upper CPU limit: ", sj.cpuRoof)
	fmt.Println("Minimum Instance limit: ", sj.minInstances)
	fmt.Println("Maximum Instance limit: ", sj.maxInstances)
	fmt.Println("No. of Instances to be added/removed when scaling behavior triggered: ", sj.instanceCounter)
	return sj
}

func main() {
	// The DefaultJobScaler / the default scaling algorithm to be used
	// for making scaling decisions.
	jobScaler := NewJobScaler()
	jobScaler.EnableAutoScale(getScalingJobConfig())

	for {
		select {
		case <-jobScaler.Inactive():
			fmt.Println("Job Scaler Down. Shutting down...")
			os.Exit(1)
		}
	}
}
