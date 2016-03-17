#!/usr/bin/env ruby

# The API is located at: https://github.com/apcera/continuum-stager-api-ruby
#
# To delete the stager:
#     apc staging pipeline delete /apcera::mono --batch 
#     apc stager delete /apcera/stagers::mono --batch
#
# Create the stager & pipeline:
#     apc stager create mono --start-command="./stager.rb" --staging=/apcera::ruby --batch --namespace /apcera/stagers
#     apc staging pipeline create /apcera/stagers::mono --name mono  --namespace /apcera --batch
#
# Use the stager:
#     apc app create my-app --staging=/apcera::mono --start
#
# OR- if you specify staging_pipeline: "/apcera::mono" in the manifest, just:
#     apc app create my-app --start
#

require "bundler"
Bundler.setup

# Bring in continuum-stager-api
require "continuum-stager-api"

# Make sure stdout is sync'd.
#
STDOUT.sync = true
stager = Apcera::Stager.new

puts "Adding dependencies"
should_restart = false

if stager.dependencies_add("runtime", "mono")
  should_restart = true
end

if should_restart == true
  stager.relaunch
end

# Download the package from the staging coordinator.
# 
puts "Downloading Package..."
stager.download

# Extract the package to the "app" directory.
# 
puts "Extracting Package..."
stager.extract("app")

# Set the start command.
#

# start_cmd = "xsp4 --port $PORT --verbose --nonstop"
start_cmd = "/bin/startMonoFastcgi.sh $PORT"
puts "Setting start command to '#{start_cmd}'"
stager.start_command = start_cmd

# Set the start path.
# 
start_path = "/app"
puts "Setting start path to '#{start_path}'"
stager.start_path = start_path

# Finish staging, this will upload your final package to the
# staging coordinator.
# 
puts "Completed Staging..."
stager.complete
