### rsnapshot-backup

This is a sample bash application that runs a script to schedule rsnapshot, as accepted by Apcera Platform's built-in bash stager:

1. `bash_start.sh` creates a crontab file `/etc/cron.d/backup` to run rsnapshot every hour, starts a monitoring loop, and starts cron.

It assumes that the service for accessing the source of the backup already exists. (Let us call it rsnapshot-src-storage)

To create the app, perform the following:

```
cd rsnapshot-backup
apc app create rsnapshot-backup-app --allow-egress --allow-ssh
```

Create NFS service for destination storage

```
apc service create rsnapshot-backup-storage --provider /apcera/providers::apcfs --description "Storage for mysql-service backups" --batch
```

Bind the services to the backup app 

```
apc service bind rsnapshot-src-storage --job rsnapshot-backup-app --batch -- --mountpath /nfs/src/

apc service bind rsnapshot-backup-storage --job rsnapshot-backup-app --batch -- --mountpath /nfs/dst/
```

Next, start the app as follows:

```
apc app start rsnapshot-backup-app
```

Navigate to the URL provided from the app staging process to view the output page. It should display the number of seconds since the last successful backup. If a backup hasn't happened in over a day and a half it throws a 500 error and displays the number of seconds since the last successful backup. 
