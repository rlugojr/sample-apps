package types

type NetUsage struct {
	TxBytes float64 `json:",omitempty"`
	RxBytes float64 `json:",omitempty"`
}

// InstanceState defines the payload of an instance metric event.
type InstanceState struct {
	// InstanceUUID is the UUID of the instance for which this event was published.
	InstanceUUID string `json:"instance_uuid"`

	// JobUUID is the UUID of the job for which this event was published.
	JobUUID string `json:"job_uuid"`

	// JobFQN is the FQN of the job that this instance was running.
	JobFQN string `json:"job_fqn"`

	// Timestamp for the metric.
	Timestamp float64 `json:"timestamp"`

	// CPU is an instance CPU usage (%).
	CPU float64 `json:"cpu"`

	// CPUTotal is total CPU usage allowed for instance (milliseconds/second).
	// 0 means it's unlimited.
	CPUTotal float64 `json:"cpu_total"`

	// MemTotal is total instance memory (bytes).
	MemTotal float64 `json:"memory_total"`

	// MemUsed is memory currently used by instance (bytes).
	MemUsed float64 `json:"memory_used"`

	// DiskTotal is total instance disk space (bytes).
	DiskTotal float64 `json:"disk_total"`

	// DiskUsed is disk space currently used by instance (bytes).
	DiskUsed float64 `json:"disk_used"`

	// NetworkTotal is total throughput allowed in bytes/sec. Applies to
	// all interfaces.
	NetworkTotal float64 `json:"network_total"`

	// Network used is a map from interface name to NetUsage.
	NetworkUsed map[string]NetUsage `json:"network_used"`
}
