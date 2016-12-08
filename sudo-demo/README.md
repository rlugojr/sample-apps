### sudo-demo

This is a sample `bash` application that demonstrates how to use `sudo` to add users, add groups, and `chown` and `chmod` files as `root`.

By default apps run as the user `runner`, group `runner`. If a specific command needs to run as user `root`, preface the command with `sudo`.

To create the app, perform the following:

```
cd sudo-demo
apc app create sudo-demo --batch
apc app start sudo-demo --batch
```

The app will output the results of the `bash_start.sh` script to the screen.

