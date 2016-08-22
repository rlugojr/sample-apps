#!/usr/bin/env ruby
# New Relic for Java Stager for Apcera HCOS
# Copyright 2015 the original author or authors.
#
# Licensed under the Apache License, Version 2.0 (the "License");
# you may not use this file except in compliance with the License.
# You may obtain a copy of the License at
#
#      http://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# See the License for the specific language governing permissions and
# limitations under the License.
#
# Note: This stager is meant to be appended to a Java staging pipeline

# Load dependent libraries
require 'bundler'
Bundler.setup

require 'continuum-stager-api'

# Initialize stager
$stdout.sync = true
$stager = Apcera::Stager.new

def add_package(dependency_list)
  relaunch = false
  dependency_list.each do |pkg|
    pkg_type = pkg.keys[0]
    pkg_name = pkg[pkg_type]
    if $stager.dependencies_add(pkg_type.to_s, pkg_name)
      $stager.output("  - #{pkg_name} added")
      relaunch = true
    end
  end
  $stager.relaunch if relaunch
end

# Dependency_list should be an array of hashes of packages where
# each hash key is package type and each hash value is the name of the package
#
# Example:
# dependency_list = [{package:'<my_custom_package>'},{runtime:'<my_custom_runtime>'}]
dependency_list = [
    {package:'newrelic-java-3.28.0'}
]

# Add, download, and extract stager dependencies
$stager.output('Adding New Relic dependencies...')
add_package(dependency_list)

$stager.output('Downloading package...')
$stager.download

$stager.output('Extracting package...')
$stager.extract('app')

# Since this is chained to the Java stager, we need to
# make sure the the app is in "/app" not "/app/app"
$stager.execute_app('sudo cp -R app/* .')
$stager.execute_app('sudo rm -rf app')

# Make sure all files are owned by runner.
$stager.execute_app('sudo chown -R runner:runner .')

$stager.output('Done setting up New Relic Agent for Java.')
$stager.complete
