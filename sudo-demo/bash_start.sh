#!/bin/bash

# Demonstrate that Apcera apps can use sudo to add users, add groups, and chown and chmod files as root.

set -e

cd /app
sudo useradd owner1
sudo useradd owner2
sudo useradd owner3
sudo groupadd group1
sudo groupadd group2
sudo groupadd group3
pwd

touch file1 file2 file3
ls -al
echo

sudo chown owner1:group1 file1
sudo chown owner2:group2 file2
sudo chown owner3:group3 file3
ls -al
echo

sudo chmod 640 file1 file2 file3
ls -al
echo

# Don't exit
touch /app/noexit
tail -f /app/noexit
