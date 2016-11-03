#!/bin/bash

SERVER_PORT=${PORT:-5601}

if [ -n "$ELASTICSEARCH_URI" ]
then
    export ELASTICSEARCH=$(echo $ELASTICSEARCH_URI/ | sed "s|tcp|http|")
else
	echo "ERROR, job not linked to elasticsearch"
	exit 9
fi

kibana --elasticsearch $ELASTICSEARCH --port=${SERVER_PORT} --host $(hostname) $@
