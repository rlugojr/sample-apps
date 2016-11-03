#!/bin/bash

kibana_config=/opt/apcera/kibana/config/kibana.yml

if [ -n "$ELASTICSEARCH_URI" ]
then
    export ELASTICSEARCH=$(echo $ELASTICSEARCH_URI/ | sed "s|tcp|http|")
else
	echo "ERROR, job not linked to elasticsearch"
	exit 9
fi

# change the password for the kibana and elastic special users
# You should really use something better.
#
SECURITY_URL=${ELASTICSEARCH}_xpack/security/user

curl -s -XPUT -u elastic:changeme "${SECURITY_URL}/elastic/_password" -d '{"password" : "elastic-password"}'
curl -s -XPUT -u elastic:elastic-password "${SECURITY_URL}/kibana/_password" -d '{"password" : "kibana-password"}'

echo "elasticsearch.username: \"kibana\"" >>  ${kibana_config}
echo "elasticsearch.password: \"kibana-password\"" >> ${kibana_config}

start-kibana.sh
