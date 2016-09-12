# Set APC_HOME environment variable to current app directory (or any writable directory)
export APC_HOME=`pwd`

# Target cluster over HTTP and login with --app-auth parameter
# $target is set as environment variable on Bash app (see README)
./apc target http://$target
./apc login --app-auth

# List jobs
./apc job list

# Keep process alive so Health Manager doesn't try to restart app.
tail -f
