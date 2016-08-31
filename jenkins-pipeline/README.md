# Overview

Jenkins [Pipeline](https://github.com/jenkinsci/pipeline-plugin/blob/master/TUTORIAL.md) allows you to create discrete steps in a Continuous Deployment process.

The goal of this example is to demonstrate how to:

1. Deploy a Jenkins Docker Image to the Apcera Platform.
1. Create a pipeline workflow that deploys to the local Apcera cluster.

# Longer Term Goals

Ideally, we get to the point where we integrate Apcera directly to jenkins using an official apc pipeline plugin. This would allow us to no longer require a specialized Docker Image. It would also enable calling into apc without a separate shell script.

This is an optimization and doesn't prohibit us from demonstrating how jenkins can be used alongside Apcera for your continuous deployment process.
