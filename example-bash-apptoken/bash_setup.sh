# Set the target cluster (e.g. your-cluster.apcera-platform.io):
export target=your-cluster.example.com

# Download APC from target cluster and unzip:
wget http://api.$target/v1/apc/download/linux_amd64/apc.zip
unzip apc.zip
rm apc.zip
