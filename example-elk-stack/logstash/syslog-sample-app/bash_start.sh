#!/bin/bash

export SYSLOG_PORT=${PORT:-3333}

sed "s|SYSLOG_PORT|$SYSLOG_PORT|" pipeline.conf > syslog-pipeline.conf

logstash -f syslog-pipeline.conf

