#!/bin/sh

HTTP_PORT=${PORT:-9200}

myip=$(ifconfig | grep 169.| sed "s|:| |g" | awk '{print $3}')

elasticsearch -E http.port=${HTTP_PORT} -E network.host=$myip $@


