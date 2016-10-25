#!/bin/bash

echo "elasticsearch.username: \"kibana\"" >> /opt/apcera/kibana/config/kibana.yml
echo "elasticsearch.password: \"kibana-password\"" >> /opt/apcera/kibana/config/kibana.yml

start-kibana.sh


