#!/bin/bash

# Create cron job to backup the MySQL database

set -e

source_dir="/source"
destination_dir="/destination"

echo "==> CHECKING if the source and destination has been mounted"
for d in $source_dir $destination_dir; do
    if ! [ -d $d ]; then
        echo "ERROR: Directory '$d' does not exist" >&2
        exit 1
    fi
done

echo "==> CONFIGURING crond"

sudo -s -- <<EOF

echo "---------------------- Configuring rsnapshot -------------------------------"
cp /app/rsnapshot.conf /etc/rsnapshot.conf
echo "PATH=$PATH" > /etc/cron.d/backup
echo "# Backup the directory every hour on the half hour" >> /etc/cron.d/backup

echo "30 * * * * root rsnapshot hourly && touch /tmp/backup.complete >> /tmp/cron.log 2>&1" >> /etc/cron.d/backup
chmod 0644 /etc/cron.d/backup
cat /etc/cron.d/backup
touch /tmp/cron.log
EOF

# File that is touched when backup has completed by /root/rsnapshot_backup.sh
touch /tmp/backup.complete

(
    while true; do
        LAST_BACKUP=`stat -c '%Y' /tmp/backup.complete`
        CURRENT_TIME=`date +'%s'`
        BEHIND=$((CURRENT_TIME - LAST_BACKUP))
        ONE_HALF_DAYS=129600

        if [ $BEHIND -gt $ONE_HALF_DAYS ]; then
            echo -ne "HTTP/1.0 500 OK\r\n\r\n${BEHIND}" | nc -l -p ${PORT:?}
        else
            echo -ne "HTTP/1.0 200 OK\r\n\r\n${BEHIND}" | nc -l -p ${PORT:?}
        fi
    done
) &

echo "==> STARTING crond"
sudo cron && tail -f /tmp/cron.log
