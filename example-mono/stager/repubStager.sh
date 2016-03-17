#!/bin/bash

name="mono"
apc staging pipeline delete /apcera::${name} --batch
apc stager delete /apcera/stagers::${name} --batch
apc stager create ${name} --start-command="./stager.rb" --staging=/apcera::ruby --batch --namespace /apcera/stagers
apc staging pipeline create /apcera/stagers::${name} --name ${name}  --namespace /apcera --batch
