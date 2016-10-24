#!/bin/sh

# It appears that elasticsearch needs two ports, one client port and one 
# transport port.  the transport port is for clutering.  Might experiment
# with that later, but for now only dealing with the one
#
HTTP_PORT=${PORT:-9200}

# --network.host=0 
# allows it to listen on the non_local interface
#
elasticsearch --http.port=${HTTP_PORT} --network.host=0 $@

# Might also want stuff from: 
# - path.data: /path/to/data
# - path.logs: /path/to/logs

