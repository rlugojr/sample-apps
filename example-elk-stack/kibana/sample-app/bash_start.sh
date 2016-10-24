#!/bin/bash

echo "elasticsearch.username: \"kibana\"" >> /opt/apcera/kibana/config/kibana.yml
echo "elasticsearch.password: \"zzwa-kibana-passwd\"" >> /opt/apcera/kibana/config/kibana.yml

start-kibana.sh


