#!/bin/bash

# Be creative - if shield is installed, add these users
#
if [ -d /opt/apcera/elasticsearch/bin/shield ]
then
	echo "Shield is configured, adding users"
	cd /opt/apcera/elasticsearch/bin/shield
	./esusers useradd apcera -r admin -p "apcera-passwd"
	./esusers useradd kibana -r kibana4_server -p "kibana-passwd"
	./esusers useradd logstash -r logstash -p "logstash-passwd"
else
	echo "Shield is not configured, skipping users"
fi

start-elasticsearch.sh
