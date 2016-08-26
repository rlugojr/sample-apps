# set APC_HOME to current working directory
# Specify target cluster's API host
target=api.cosmic.apcera-platform.io

# Download and unzip APC
echo "Downloading APC..."
wget http://$target/v1/apc/download/linux_amd64/apc.zip
echo "Unzipping APC..."
unzip apc.zip
rm apc.zip

# Target cluster and login with --app-auth parameter:
echo "Targeting cluster.."
./apc target http://$target
echo "Logging in with --app-auth option..."
./apc login --app-auth
