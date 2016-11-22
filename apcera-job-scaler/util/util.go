// Copyright 2016 Apcera Inc. All right reserved.

package util

import (
	"bytes"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"os"
)

// JSONJob is JSON view of the Apcera platform's Job API.
type JSONJob map[string]interface{}

// GetAPIEndpoint return the API_ENDPOINT value set in the environment.
func GetAPIEndpoint() string {
	apiEndpoint := os.Getenv("API_ENDPOINT")
	if apiEndpoint == "" {
		log.Fatalf("Cluster endpoint var 'API_ENDPOINT' not configured.")
	}
	return apiEndpoint
}

// GetJob returns a JSON map of the Job API
// Refer https://docs.apcera.com/api/apcera-api-endpoints/#get-v1jobs
func GetJob(jobFQN string) (JSONJob, error) {
	targetURL := "http://" + GetAPIEndpoint() + "/v1/jobs"
	client := &http.Client{}
	req, err := http.NewRequest("GET", targetURL, nil)
	if err != nil {
		return JSONJob{}, err
	}
	q := req.URL.Query()
	q.Add("fqn", jobFQN)
	req.URL.RawQuery = q.Encode()
	resp, err := client.Do(req)
	if err != nil {
		return JSONJob{}, err
	}
	defer resp.Body.Close()

	job := []JSONJob{}
	d := json.NewDecoder(resp.Body)
	d.UseNumber()
	err = d.Decode(&job)
	if err != nil {
		return JSONJob{}, err
	}

	if len(job) == 0 {
		return JSONJob{}, fmt.Errorf("Job %v record does not exist")
	}
	return job[0], nil
}

// SetJob updates the Job property in the platform based on the JSON view thats
// passed in.
func SetJob(job JSONJob) error {
	targetURL := "http://" + os.Getenv("API_ENDPOINT") + "/v1/jobs/" + job["uuid"].(string)
	client := &http.Client{}
	b := new(bytes.Buffer)
	json.NewEncoder(b).Encode(job)
	request, err := http.NewRequest("PUT", targetURL, b)
	if err != nil {
		return err
	}

	response, err := client.Do(request)
	if err != nil {
		return err
	}
	defer response.Body.Close()
	return nil
}
