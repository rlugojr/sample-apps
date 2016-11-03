#!/bin/bash

# Be creative - if x-pack is installed, add these users
#
if [ -d /opt/apcera/elasticsearch/bin/x-pack ]
then
	echo "x-pack is configured, adding users"
	
	# Lets switch to file-based realms so we can use the users script
	#
	USER_COMMAND=/opt/apcera/elasticsearch-5.0.0/bin/x-pack/users
	${USER_COMMAND} useradd apcera -r superuser -p "apcera-password"
	${USER_COMMAND} useradd apcera-kibana -r kibana -p "kibana-password"
	${USER_COMMAND} useradd logstash -r logstash_writer -p "logstash-password"
	
else
	echo "x-pack is not configured, skipping users"
fi

start-elasticsearch.sh

