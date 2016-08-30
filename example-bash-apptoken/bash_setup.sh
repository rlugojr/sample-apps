# Set the target cluster (e.g. your-cluster.apcera-platform.io):
export target=cluster-name.example.com

# Download APC from target cluster and unzip (note: this endpoint does not require authentication)
wget http://api.$target/v1/apc/download/linux_amd64/apc.zip
unzip apc.zip
rm apc.zip
