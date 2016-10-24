#!/bin/sh

# It appears that elasticsearch needs two ports, one client port and one 
# transport port.  the transport port is for clutering.  Might experiment
# with that later, but for now only dealing with the one
#
SERVER_PORT=${PORT:-5601}

if [ -n "$ELASTICSEARCH_URI" ]
then
    export ELASTICSEARCH=$(echo $ELASTICSEARCH_URI/ | sed "s|tcp|http|")
else
	echo "ERROR, job not linked to elasticsearch"
	exit 9
fi

kibana --elasticsearch.url $ELASTICSEARCH --server.port=${SERVER_PORT} $@
