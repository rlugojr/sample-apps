#!/bin/bash

export SYSLOG_PORT=${PORT:-3333}

# tail -f /dev/null

sed "s|SYSLOG_PORT|$SYSLOG_PORT|" pipeline.conf > syslog-pipeline.conf

logstash -f syslog-pipeline.conf

