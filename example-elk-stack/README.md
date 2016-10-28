# The ELK Stack on Apcera

## Customers Want to Analyze their Data

When working with customers we often hear the same question: "How can I view my
logs and data".  The answer for this is very easy with the Apcera Platform:
enter [_Log Drains_](http://docs.apcera.com/tutorials/logdrain/).  Log Drains
allow your applications to send their `stdout` and `stderr` log messages directly 
to a syslog service such as Splunk or Papertrail with very little effort.

"That is great for production, but is too expensive and time consuming setting
up accounts for individual developers" is what we basically hear next.
One option is the built-in log-tailing utility, `apc app logs my-shiny-app`.
This is really straightforward, and great in a pinch, but definitely not 
something you can use to visualize your output (unless you are *really* good at
ascii-art graphs).

The ELK Stack to the rescue!

## Visualization of Data

The ELK stack is primarily composed of three products:

* Elasticsearch -- an open source JSON-based search and analytics engine 
* Logstash -- an extensible data collection pipeline
* Kibana -- extensible and powerful analytics interface to Elasticsearch

There are others, but we will be focusing on the core of the stack in this post.

When used in concert, the whole of the ELK stack is greater than the sum of its
parts.  Yes, each piece can be used by itself, but when used together it becomes
a powerful tool that gives you access to actionable insights from virtually any
form of data, whether it be structured or unstructured.

The goal of this isn't to go in to a great deal of depth with each component of
the stack, but rather to show how they can be used in the Apcera Platform.  We
will show how to create the packages for each layer in the stack, create
reference applications for each layer, and tie them together.  It is also
possible to create one single application that contains each element of the
stack (or other combination), but that is not the purpose of this endeavor.  

## Creating the Packages

We will be creating Apcera [packages](http://docs.apcera.com/packages/using/) to
make reusable pieces for our stack. Near the end of the post you will find a
directory tree so you can see how we stored the pieces in the filesystem.  In
this article you will see how to set up the packages of the ELK stack, as well
as how to instantiate a stack for dev use.  You only need to create the packages
once for them to be shared across your development team.  This post also
demonstrates the use of the Elasticsearch shield package, but includes tips for
omitting it.  If you don't want to follow along you can simply clone the
accompanying github repo (which may be newer than the article) and move at your
own pace.  The repo can be found under Apcera's 
[sample-apps](https://github.com/apcera/sample-apps) (any path references
in this article will be relative to that sample-apps/example-elk-stack base to 
make it easier to follow along).

```code
git clone https://github.com/apcera/sample-apps.git
cd example-elk-stack
```

### The Elasticsearch Package

The first piece of the puzzle that we will create is a package for
Elasticsearch.  Our package will be based on what is the current release at the
time of writing, which is elasticsearch version 2.4.1.  Installation is fairly
straightforward, only requiring untarring the package, and, in our case,
installing a trial version of the Elasticsearch Shield.  We will also include
build helper script to start elasticsearch.

To build an Apcera package we first need to specify a 
[package configuration file.](http://docs.apcera.com/packages/creating/#sample-configuration-file)
The package configuration file tells the system what to download, what to
upload, and the commands to run to create the package.  In our case we will be
downloading the package from elastic.co's website.  In the `elasticsearch/`
directory, our package spec(in our case called `elasticsearch-2.4.1.conf`) is:

```code
name:      "elasticsearch-2.4.1"
version:   "2.4.1"
namespace: "/apcera/pkg/packages"

sources [
  { url: "https://download.elastic.co/elasticsearch/release/org/elasticsearch/distribution/tar/elasticsearch/2.4.1/elasticsearch-2.4.1.tar.gz",
    sha1: "6a6acfc7bf7b4354dc6136daea54db1c844d632f" },
]

depends  [ { os: "ubuntu-14.04" },
			{ runtime: "java-1.8"}
		 ]
provides      [ { package: "elasticsearch" },
                { package: "elasticsearch-2" },
                { package: "elasticsearch-2.4" },
                { package: "elasticsearch-2.4.1" }]

environment {
	"PATH": "/opt/apcera/elasticsearch/bin:$PATH"
			}

include_files [
	"start-elasticsearch.sh"
	]
	
cleanup [
          "/root"
        ]

build (
	mkdir -p /opt/apcera
	tar -C /opt/apcera -xvf elasticsearch-2.4.1.tar.gz
	chmod a+x start-elasticsearch.sh
	cp start-elasticsearch.sh /opt/apcera/elasticsearch-2.4.1/bin/.

	echo "Installing Shield"

	cd /opt/apcera/elasticsearch-2.4.1
	./bin/plugin install elasticsearch/license/latest
	./bin/plugin install elasticsearch/shield/latest

	chown -R runner:runner /opt/apcera/elasticsearch-2.4.1
	cd /opt/apcera
	ln -s elasticsearch-2.4.1 elasticsearch
)
```

Which includes installing a trial license for 
[shield](https://www.elastic.co/products/shield) "Security for Elasticsearch"

The `sources` section tells the package creation process to download the
elasticsearch archive and validate its secure hash.  Once that is done it
follows through the `build` section.  It makes a directory and untars the
archive to that directory.  Next, it makes sure that the execute bit of the
start script is set, then copies it to the bin directory underneath our new
elasticsearch tree.  It then uses the elasticsearch plugin utility to install
the license plugin as well as the shield plugin.  Finally, it changes the
ownership of the whole tree to `runner`, a predefined user, and sets up a soft
link to make the paths nicer.

The `environment` section adds `/opt/apcera/elasticsearch/bin` to the path.
When this package is included in a container, the environment will be updated
to include this.

If you don't want to include shield, simple omit the two `plugin install` lines.

To simplfy starting elasticsearch, we create a helper script 
(`elasticsearch/start-elasticsearch.sh`) which looks like:

```bash
	#!/bin/sh

	HTTP_PORT=${PORT:-9200}

	elasticsearch \
		--http.port=${HTTP_PORT} \
		--network.host=0 \
		--path.home=/app/data \
		--path.logs=/app/logs \
		--path.scripts=/app/data/scripts $@
```

Note the pattern for the port: `HTTP_PORT=${PORT:-9200}`.  If the environment
variable `PORT` is not set (for example, if an application were deployed with
the `--disable-routes flag`) then it will fall back to using 9200.  We also
want to make sure that we store the data under the application directory, so 
we specify path information.

#### Build the Elastisearch package

Creating the package from this manifest is pretty simple:

```console
cd elasticsearch/
apc package build elasticsearch-2.4.1.conf
```

which will create a package that looks like this:    

![Elasticsearch Package](/example-elk-stack/readme-images/elasticsearch-package.png "Elasticsearch Package")

###### Getting an error?

> If you get an error while building, related to SSLException and
> InvalidAlgorithmParameterException, then your java package might be out of
> date.  Jump ahead to an updated [java package build](#problems-with-keystores)
> and that should take care of it.  Come back up here, we will be waiting

#### Deploy the first application

To deploy and start the standalone application (in the
`elasticsearch/sample-app/` directory) we will leverage the bash stager, which
also allows us to specify the users and passwords that we will be using.  Our
`elasticsearch/sample-app/bash_start.sh` looks like this (you probably want to
use better passwords):

```bash
	#!/bin/bash

	# Add some users
	#
	cd /opt/apcera/elasticsearch/bin/shield
	./esusers useradd apcera -r admin -p "apcera-password"
	./esusers useradd kibana -r kibana4_server -p "kibana-password"
	./esusers useradd logstash -r logstash -p "logstash-password"

	start-elasticsearch.sh
```
Again- if you aren't using shield, go ahead and skip the `useradd` lines.

Our [application manifest](http://docs.apcera.com/jobs/manifests/)
`elasticsearch/sample-app/continuum.conf` sets the default application name as
`elasticsearch`, as well as requiring the appropriate package and resources

```code
name: elasticsearch
instances: 1

package_dependencies: [
	"package.elasticsearch"
]

allow_egress: true

start: true

resources {
	memory: "1GB"
}
```

#### Create the Elasticsearch App

Replacing the domain with one appropriate for our cluster and user, we can now
deploy and start the application via the following commands:

```bash
	cd elasticsearch/sample-app/
	apc app create \
		--memory 1GB \
		--routes https://elasticsearch.<your-domain> \
		--allow-ssh \
		--batch
```

### The Kibana Package

Kibana can be seen as the "viewer" for the elasticsearch database- it provides
charting, graphs, queries, and advanced visualizations to the data stored in the
elasticsearch database.

Creation of the Kibana package looks fairly similar to the elasticsearch config,
again using a package build spec (`kibana/kibana-4.6.2.conf`):

```code
name:		"kibana"
version:   "4.6.2"
namespace: "/apcera/pkg/packages"

sources [
	{ url: "https://download.elastic.co/kibana/kibana/kibana-4.6.2-linux-x86_64.tar.gz",
	sha1: "b77b58b6a2b25152e1f208ee959261ee6868d57b" },
]

depends  [ { os: "ubuntu-14.04" },
			{ runtime: "java-1.8"}
		 ]
provides		[ { package: "kibana" },
				{ package: "kibana-4" },
				{ package: "kibana-4.6" },
				{ package: "kibana-4.6.2" }]

environment {
	"PATH": "/opt/apcera/kibana/bin:$PATH"
			}

include_files [
	"start-kibana.sh"
	]
	
cleanup [
			"/root"
		]

build (
	chmod a+x start-kibana.sh

	mkdir -p /opt/apcera
	tar -C /opt/apcera/ -xzf kibana-4.6.2-linux-x86_64.tar.gz

	cp start-kibana.sh /opt/apcera/kibana-4.6.2-linux-x86_64/bin/
	
	cd /opt/apcera/
	ln -s kibana-4.6.2-linux-x86_64 kibana

	chown -R runner:runner /opt/apcera/kibana-4.6.2-linux-x86_64/
)
```

while `kibana/start-kibana.sh` script is simply:

```bash
	#!/bin/bash
	SERVER_PORT=${PORT:-5601}

	if [ -n "$ELASTICSEARCH_URI" ]
	then
		export ELASTICSEARCH=$(echo $ELASTICSEARCH_URI/ | sed "s|tcp|http|")
	else
		echo "ERROR, job not linked to elasticsearch"
		exit 9
	fi

	kibana --elasticsearch.url $ELASTICSEARCH --server.port=${SERVER_PORT} $@
```

We use the same pattern for the port `SERVER_PORT=${PORT:-5601}` as we did with
the elasticsearch package.  There is a difference though- note the logic around
the `ELASTICSEARCH_URI` - the kibana package expects a [job
link](http://docs.apcera.com/jobs/job-links/) to the elasticsearch instance- in
fact, it will not funciton without it-- it is a front-end to elasticsearch.  The
job link URI has a `tcp` scheme, so we change that to http to match the format
that kibana expects.

#### Build the Kibana package

Creating the package from this manifest is pretty simple:

```console
cd kibana/
apc package build kibana-4.6.2.conf 
```

The Kibana package, based on the now-current 4.6.2 is depicted here:
![Kibana Package](/example-elk-stack/readme-images/kibana-package.png "Kibana Package")

Creating a standalone application instance is a little more complicated than our
elasticsearch example, because we need to include the job link.  We have the
same files: A manifest (`kibana/sample-app/continuum.conf`) and our 
`bash_start.sh` stager

The manifest is very similar to the one for the elasticsearch app:
```code
	name: kibana
	instances: 1

	package_dependencies: [
		"package.kibana"
	]

	allow_egress: true

	start: false

	resources {
		memory: "1GB"
	}
```

Note that in the case of kibana, the manifest has the start flag set to false-
this is because we need to add the job link to elasticsearch before it can be 
used.

Our `bash_start.sh` simply adds the elasticsearch user to the kibana 
config (something that you can skip if you aren't using shield):

```bash
	#!/bin/bash

	# Add some users
	#
	echo "elasticsearch.username: \"kibana\"" >> /opt/apcera/kibana/config/kibana.yml
	echo "elasticsearch.password: \"kibana-password\"" >> /opt/apcera/kibana/config/kibana.yml

	start-kibana.sh
```

Finally we can deploy the app as such- note the addition of a job link to 
dynamically bind kibana to its elasticsearch server, and the subsequent start
command (again replacing the domain):

#### Deploy the Kibana app

```console
cd kibana/sample-app/

apc app create kibana \
	--memory 1GB \
	--routes https://kibana.<your-domain> \
	--allow-ssh \
	--batch

apc job link kibana --to elasticsearch --name elasticsearch --port 0 

apc app start kibana
```

Navigating to the route should result in a page similar to the one below (note
that we can't really do anything with it, yet!).  Shield users, make sure that
you log in using the apcera user's credentials that we defined above,
`apcera/apcera-password`

![Kibana Interface](/example-elk-stack/readme-images/kibana-interface.png "Kibana Interface")

### The Logstash Package

Finally we move on to [Logstash](https://www.elastic.co/products/logstash).  In
our example we will be using logstash as a syslog target, which we bind to
applications as a [_log drain_](http://docs.apcera.com/jobs/logs/#log_drains).

Logstash is a way to map from various data sources to elasticsearch, via
"plugins", which we describe later - but first we need a package for logstash.

Our package build specification for logstash rumtime looks similar to the 
elasticsearch and kibana counterparts, our specification, 
`logstash/logstash-2.4.0.conf`:

```code
name:      "logstash-2.4.0"
version:   "2.4.0"
namespace: "/apcera/pkg/packages"

sources [
  { url: "https://download.elastic.co/logstash/logstash/logstash-2.4.0.tar.gz",
    sha1: "97314d7b503b966cd4fae13497fdd97d219447ae" },
]

depends  [ { os: "ubuntu-14.04" },
			{ runtime: "java-1.8"}
		 ]
provides      [ { package: "logstash" },
                { package: "logstash-2" },
                { package: "logstash-2.4" },
                { package: "logstash-2.4.0" }]

environment {
	"PATH": "/opt/apcera/logstash/bin:$PATH"
			}

cleanup [
          "/root"
        ]

build (
	mkdir -p /opt/apcera
	tar -C /opt/apcera/ -xzf logstash-2.4.0.tar.gz

	cd /opt/apcera/
	cd logstash
	
	# Install some plugins
	#
	./bin/logstash-plugin install --verbose logstash-output-kafka

	# Update the geo ip data
	#
	curl -s -O "http://geolite.maxmind.com/download/geoip/database/GeoLiteCity.dat.gz"
	gunzip GeoLiteCity.dat.gz
	rm -f GeoLiteCity.dat.gz
	
	cd -
	chown -R runner:runner logstash-2.4.0/
)
```

Note that we have installed a more robust set of IP-to-geography mappings when
we built the logstash package (see right after the comment `Update the geo ip 
data`)

Our logstash package is meant to be used in the guise of an application- it only
makes sense for each individual application to define their own configuration
for logstash.

#### Build the Logstash package

Creating the package from this manifest is pretty simple:

```console
cd logstash/
apc package build logstash-2.4.0.conf
```

Which yields a package that looks similar to:

![Logstash Package](/example-elk-stack/readme-images/logstash-package.png "Logstash Package")

## Pulling the Pieces Together

At this point we have the E(lasticsearch) & K(ibana) parts of the stack running-
now we need to tie in the L(ogstash).  To do this we will be tying a logstash
application to a sample applicaiton as a log drain.  Let's build out a sample
syslog target!

The whole premise of this app flavor is to serve as a syslog target (that is to say
that we are set up using a syslog input).  Granted, we don't have a tremendous 
amount of knowledge about what is coming in.  For this we want to set up FILTERS.

To do this we need to create a logstash
[_pipeline_](https://www.elastic.co/guide/en/logstash/current/pipeline.html) to
process the data.  Logstash has many predefined patterns and filters, but we
need a custom one (because our log format is custom).

We will be setting up a pipeline with a syslog input, and two outputs- one for
elasticsearch, and one for stdout (which will make debugging easier).

So far, so good - let's build up a pipeline for our logstash instance.  A
logstash pipeline (`logstash/syslog-sample-app/pipeline.conf`) sending to
elasticsearch starts out looking like this:

```code
input 
{
  syslog {}
}
filter {}
output 
{
  elasticsearch {}		
  stdout {}
}
```

As you can see, we have input, output, and filter sections - a prototype logstash 
filter.  We will fill these out with a little more detail a bit later.

First now we need to bind our logstash application to our other applications,
and have behave in a more cloud-native manner.  For this, we will use a script
to have it get the syslog port.  Our `logstash/syslog-sample-app/bash_start.sh`
start script for the bash stager will preprocess our logstash pipeline, to make
sure it picks up the correct port:

```bash
	#!/bin/bash

	export SYSLOG_PORT=${PORT:-3333}

	# tail -f /dev/null

	sed "s|SYSLOG_PORT|$SYSLOG_PORT|" pipeline.conf > syslog-pipeline.conf

	logstash -f syslog-pipeline.conf
```

In this case we are using the same pattern for the `$PORT` variable as with the
previous applications, but this time we are preprocessing our pipeline using
`sed` - but we need a place for that value to land.  We can now update our
pipeline to include this:

```
input 
{
		syslog
		{
			# This will be replaced by the PORT from the env
			port => SYSLOG_PORT
		}
}
filter {}
output 
{
	elasticsearch {}		
	stdout {}
}
```

We still have a few more things to do.  Next we need to tell logstash where to
send the data - we specified the elasticsearch output, but we need to leverage
Apcera [job templates](http://docs.apcera.com/jobs/templates/) to map the
bindings.  We replace our `elasticsearch {}` with a version specifying the
template to process, and go ahead and include the credentials, so logstash knows
how to authenticate with our elasticsearch instance:

```
	(...)
	elasticsearch {
		user => "logstash"
		password => "logstash-password"
		hosts => [
			{{range bindings}}{{if .URI.Scheme}}"{{.URI.Host}}:{{.URI.Port}}"{{end}}{{end}}
		]
	(...)
	}		
```

During the deployent process, the template translation will process the
directives, generating a file that contains something like this (note that the
IP address will be different):

```
	(...)
	elasticsearch 
	{
		user => "logstash"
		password => "logstash-password"
		hosts => [
			"169.254.0.14:10000"
		]
	}		
	(...)
```

We still need logstash to know how to take apart the messages that it receives.
It can process plain text, but it is more convenient for us to define the format
ahead of time.  This is done by using filters - in this case we will be using a
[grok filter](https://www.elastic.co/guide/en/logstash/current/plugins-filters-grok.html)

The sample application we will be using (the one that will drain to our logstash) 
is written in node.js, and uses [Morgan logger middleware](https://github.com/expressjs/morgan).  
The pertinent parts of the format specification, and the logger syntax are:

```javascript
morgan.token('cntm-instance', function getUUID (req) {
  return process.env['CNTM_INSTANCE_UUID']
})

morgan.token('real-client', function getRealClient (req) {
    return req["headers"]["x-forwarded-for"];
})

morgan.token('cntm-job', function getJobFQN (req) {
  return process.env['CNTM_JOB_FQN']
})

morgan.token('zulu-date', function getZuluDate (req) {
	return new Date().toISOString();
})

morgan.format('apcera', 'access-log :real-client :remote-user :zulu-date latency :response-time ms :cntm-job :cntm-instance ":method :url HTTP/:http-version" :status :res[content-length] ":referrer" ":user-agent"')

app.use(morgan('apcera'))
```

and some sample records

```code
access-log 71.75.0.0 - 2016-10-24T17:46:53.409Z latency 0.831 ms job::/sandbox/demouser::todo eb93dcf5-b0ca-4e93-86dd-76a5def65f04 "POST /api/todos HTTP/1.1" 200 5099 "http://todo.your.domain.com/" "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_11_6) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/53.0.2785.116 Safari/537.36"
access-log 71.75.0.0 - 2016-10-24T17:46:55.286Z latency 0.356 ms job::/sandbox/demouser::todo eb93dcf5-b0ca-4e93-86dd-76a5def65f04 "DELETE /api/todos// HTTP/1.1" 404 27 "http://todo.your.domain.com/" "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_11_6) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/53.0.2785.116 Safari/537.36"
access-log 71.75.0.0 - 2016-10-24T17:46:58.355Z latency 0.349 ms job::/sandbox/demouser::todo eb93dcf5-b0ca-4e93-86dd-76a5def65f04 "DELETE /api/todos// HTTP/1.1" 404 27 "http://todo.your.domain.com/" "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_11_6) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/53.0.2785.116 Safari/537.36"
access-log 71.75.0.0 - 2016-10-24T17:47:04.036Z latency 0.787 ms job::/sandbox/demouser::todo eb93dcf5-b0ca-4e93-86dd-76a5def65f04 "POST /api/todos HTTP/1.1" 200 5113 "http://todo.your.domain.com/" "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_11_6) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/53.0.2785.116 Safari/537.36"
access-log 71.75.0.0 - 2016-10-24T17:47:05.308Z latency 1.503 ms job::/sandbox/demouser::todo eb93dcf5-b0ca-4e93-86dd-76a5def65f04 "DELETE /api/todos/%!C(MISSING) HTTP/1.1" 200 5099 "http://todo.your.domain.com/" "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_11_6) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/53.0.2785.116 Safari/537.36"
```

Which kind of looks like a standard apache log, but with a bit more.  Broken
down, it looks like this:

| field name                     | value                         |
|--------------------------------|-------------------------------|
| access-log                     | access-log                    |
|:remote-addr -                  | 71.75.0.0 |
|:remote-user                    | (blank)- |
|:zulu-date                      | 2016-10-24T17:46:53.409Z |
|:response-time ms               | latency 0.831 ms |
|:cntm-job                       | job::/sandbox/demouser::todo |
|:cntm-instance                  | eb93dcf5-b0ca-4e93-86dd-76a5def65f04 |
|:method :url HTTP/:http-version | "POST /api/todos HTTP/1.1"  |
|:status                         | 200 |
|:res[content-length]            | 5099 |
|":referrer"                     | "http://todo.your.domain.com/" |
|":user-agent"'                  | "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_11_6) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/53.0.2785.116 Safari/537.36"|

We need a filter to match the above patterns.  To build the pipeline we will use
the [grok debugger](http://grokdebug.herokuapp.com) to help generate our 
format.  Using the tool is pretty straightforward.  Another helpful tool is the
[Grok Constructor](http://grokconstructor.appspot.com). In our case it looks like:

![Grok Tool](/example-elk-stack/readme-images/grok-debug.png "Grok Tool")

with our format as 

`access-log %{IP:remoteip} %{NOTSPACE:remoteuser} %{TIMESTAMP_ISO8601:access_time} latency %{NUMBER:latency_ms:float} ms %{NOTSPACE:jobname} %{NOTSPACE:instanceid} %{QUOTEDSTRING:action} %{NUMBER:returncode:int} %{NOTSPACE:size} %{QUOTEDSTRING:referrer} %{QUOTEDSTRING:useragent}`

We want to make sure that we actually match all rows, so we will specify a
catch-all pattern as well `access-log %{IP:remoteip} %{GREEDYDATA:catchall}`

Now our final `pipeline.conf` looks like this:

```
input 
{
	syslog
	{
		port => SYSLOG_PORT
	}
}
filter 
{
	grok
	{
		match => { "message" => "access-log %{IP:remoteip} %{NOTSPACE:remoteuser} %{TIMESTAMP_ISO8601:access_time} latency %{NUMBER:latency_ms:float} ms %{NOTSPACE:jobname} %{NOTSPACE:instanceid} %{QUOTEDSTRING:action} %{NUMBER:returncode:int} %{NOTSPACE:size} %{QUOTEDSTRING:referrer} %{QUOTEDSTRING:useragent}"}
		match => { "message" => "access-log %{IP:remoteip} %{GREEDYDATA:catchall}"}
	}
}
output 
{
	elasticsearch 
	{
		user => "logstash"
		password => "logstash-password"
		hosts => [
			{{range bindings}}{{if .URI.Scheme}}"{{.URI.Host}}:{{.URI.Port}}"{{end}}{{end}}
		]
	}		
	stdout {}
}
```

If you are skipping shield, omit the setting of the user and password from the
above elasticsearch section, leaving only the `hosts` block.

Now, when records pass through our logstash pipeline, they will be compared 
against the various match records we have, and be mapped to records that look
something like this:

```json
{
  "remoteip": [
	[
		"71.75.0.0"
	]
  ],
  "remoteuser": [
	[
		"-"
	]
  ],
  "access_time": [
	[
		"2016-07-06T13:43:00.252Z"
	]
  ],
  "jobname": [
	[
		"job::/sandbox/demouser::todo"
	]
  ],
  "instanceid": [
	[
		"d0fa7706-e9e7-42b7-9d52-d7c786608239"
	]
  ],
  "action": [
	[
		"GET /api/db	HTTP/1.1"
	]
  ],
  "size": [
	[
		"-"
	]
  ],
  "referrer": [
	[
		"http://todo-drain.<domain-name>"
	]
  ],
  "useragent": [
	[
		"Mozilla/5.0 (Macintosh; Intel Mac OS X 10_11_5) AppleWebKit/601.6.17 (KHTML, like Gecko) Version/9.1.1 Safari/601.6.17"
	]
  ]
}
```

We can also add a filter to translate geoip information, allowing us to get an idea where 
requests are coming from (_note that this assumes that your router and any
upstream load balancers/ELB include the forwarded IP from the client, otherwise
these will only be the IPs of your router_).  With this in place, the filter 
block of our pipeline looks like:

```
filter 
{
	grok 
	{
		match => { "message" => "access-log %{IP:remoteip} %{NOTSPACE:remoteuser} %{TIMESTAMP_ISO8601:access_time} latency %{NUMBER:latency_ms:float} ms %{NOTSPACE:jobname} %{NOTSPACE:instanceid} %{QUOTEDSTRING:action} %{NUMBER:returncode:int} %{NOTSPACE:size} %{QUOTEDSTRING:referrer} %{QUOTEDSTRING:useragent}"}
		match => { "message" => "access-log %{IP:remoteip} %{GREEDYDATA:catchall}"}
	}
	geoip 
	{
		source => "remoteip"
		target => "geoip"
		database => "/opt/apcera/logstash/GeoLiteCity.dat"
		add_field => [ "[geoip][coordinates]", "%{[geoip][longitude]}" ]
		add_field => [ "[geoip][coordinates]", "%{[geoip][latitude]}"  ]
	}
	mutate 
	{
		convert => [ "[geoip][coordinates]", "float"]
	}
}
```

We also include an application manifest for our syslogger 
(`logstash/syslog-sample-app/continuum.conf`)

```code
	name: my-syslog
	instances: 1

	package_dependencies: [
		"package.logstash"
	]

	allow_egress: true

	# Cannot start it since it has to be bound
	#
	start: false

	resources {
		memory: "1GB"
	}

	templates: [
		{
			path: "pipeline.conf"
		}
	]
	ports: [
		{
			number: 0,
			routes: [
				{
					type: "tcp",
					# This needs to be the tcp address of your tcp router
					#
					endpoint: "x.x.x.x:8888",
					weight: 0.0
				}
			]
		}
	]

```

#### Deploy the Logstash syslog app

Note that you must replace the x.x.x.x with the IP address of your TCP router.
We can deploy our syslog app via the following commands:

```console
	cd logstash/syslog-sample-app/
	
	# Create the app  (the --allow-ssh here is optional)
	#
	apc app create --allow-ssh
	
	# This is crucual - this logstash instance needs to know where
	# elasticsearch is, which is provided via job links.  The port 0 tells it
	# to bind to the system-configured port
	#
	apc app link my-syslog --to elasticsearch --name elasticsearch --port 0
	
	# Finally we can start the app
	#
	apc app start my-syslog 
```

Finally, we tie the logstash with the sample app (in our case called "todo"), 
again replacing the x's with your actual IP.  First, find the correct address
by running

```console
apc app show todo
(...)
│ Exposed Ports:       │ 0 (chosen by system, env: $PORT)                │
│                      │ 222                                             │
│                      │                                                 │
│ Routes:              │ tcp://x.x.x.x:8888 [to port 0] (Weight: auto)   │
(...)
```

and looking for the `Routes:` entry.  Changing the scheme to syslog, we can add
the log drain:

```console
apc drain add syslog://x.x.x.x:8888 --app todo
```

# Seeing your results

Once everything is all tied together, we can start to visualize our logs in 
Kibana.  Going back to our kibana browser, we want to register a new index:

![kibana-index](/example-elk-stack/readme-images/kibana-index.png "kibana-index")

then click "create".  Now, visitng the _Discover_ tab we can see records coming
(Ok, this assumes that the application has been sending log records- in my case
I reloaded the app's page a few times)

![discover-kibana](/example-elk-stack/readme-images/discover-kibana.png "discover-kibana")

But we can do much more- kibana can be used to create bar charts, graphs, 
even dashboards.  

![hmmm-304](/example-elk-stack/readme-images/hmmm-304.png "hmmm-304")
Hmmm, I am getting a lot of 304's, I wonder if that is OK.

## Summary

Starting from scratch we have built and used a complete elk stack, including 
binding our application directly to our own logstash instance, defining
our own format.  It even helped me learn something about my application
(the 304 errors, which I still haven't looked in to, but seems like it is OK).

The patterns don't need to stop there- the platform doesn't care where 
elasticsearch is- the other components could easily be reconfigured to point
elsewhere.  

While this is a pretty long set of instructions, most of what is in here is 
directly reusable.  Multiple logstash instances can log to the same elasticsearch
instance, while using only one kibana viewer.  It is also very flexible- each
developer can set up their own stack- either as discrete applications, or one
large bundle.  Remember - you only need to create the packages once for your
team to leverage the stack.

## Package Resolution

Now that we have a set of packages for the ELK stack we want to make them the
default for our cluster.  We can do this using policy to enforce the 
[package resolution](http://docs.apcera.com/policy/examples/resolution/)

My new policy for these packages will be:

```code
	// Elk Stack
	//
	if (dependency equals package.elasticsearch) 
	{
		package.default "package::/apcera/pkg/packages::elasticsearch-2.4.1"
	}
	if (dependency equals package.logstash) 
	{
		package.default "package::/apcera/pkg/packages::logstash-2.4.0"
	}
	if (dependency equals package.kibana) 
	{
		package.default "package::/apcera/pkg/packages::kibana-4.6.2"
	}
```

## So, _So_ much more.

There is a great deal more you can do with filters and codecs then we have
covered.  You can set up multiple filters to handle for many different
message typese coming in, and handle them accordingly.  You can enrich, delete,
or anonymize data.

For more information on filters and related topics on logstash, take a look at:

* [Plugins In General](http://tinyurl.com/oydypop)
* [inputs](http://tinyurl.com/ozjp9wf)
* [outputs](http://tinyurl.com/zw4br8h)
* [filters](http://tinyurl.com/nlwwjnr)
* [codecs](http://tinyurl.com/p8tzgtc)

What we have covered here is a great way to for developers to spin up their own
ELK stack for their own use, and it also serves as a foundation for a production
way to deploy the stack.  Use multiple instances of elasticsearch in a [virtual
network](http://docs.apcera.com/jobs/virtual-networks/) to form a cluster;
attach persistent disk to them using
[APCFS.](http://docs.apcera.com/services/types/service-apcfs/) Even take them to
the next level and incorporate
[watcher](https://www.elastic.co/downloads/watcher) or
[graph](https://www.elastic.co/downloads/graph).


#### Directory Layout

When all is said and done, this is what the directory hierarchy looks like for
our project:

```code
├── README.md (this file)
├── elasticsearch
│   ├── elasticsearch-2.4.1.conf
│   ├── sample-app
│   │   ├── bash_start.sh
│   │   ├── continuum.conf
│   └── start-elasticsearch.sh
├── kibana
│   ├── kibana-4.6.2.conf
│   ├── sample-app
│   │   ├── bash_start.sh
│   │   ├── continuum.conf
│   └── start-kibana.sh
├── logstash
│   ├── logstash-2.4.0.conf
│   └── syslog-sample-app
│       ├── bash_start.sh
│       ├── continuum.conf
│       └── pipeline.conf
├── openjdk
│   └── openjdk-1.8.0-u91-b14.conf
```

This is now availble in the sample applications repository on Apcera's github,
see https://github.com/apcera/sample-apps/tree/elk-stack.  To copy, simply do:

```code
git clone https://github.com/apcera/sample-apps.git
cd example-elk-stack
```

#### Problems with keystores?

If, when installing or running, you run in to a problem with a keystore that 
looks like this:

```code
[staging] Failed: SSLException[java.lang.RuntimeException: Unexpected error: java.security.InvalidAlgorithmParameterException: the trustAnchors parameter must be non-empty]; nested: RuntimeException[Unexpected error: java.security.InvalidAlgorithmParameterException: the trustAnchors parameter must be non-empty]; nested: InvalidAlgorithmParameterException[the trustAnchors parameter must be non-empty];
```

Then try with a newer version of the openjdk or oraclejdk.  You can find a sample
java package specification in `openjdk/openjdk-1.8.0-u91-b14.conf`:

```code
name:      "openjdk-1.8.0-u91-b14"
version:   "1.8.0"
namespace: "/apcera/pkg/runtimes"

depends  [ { os: "linux" } ]
provides [ { runtime: "java" },
           { runtime: "java-1.8" },
           { runtime: "java-1.8.0" },
           { runtime: "java-1.8.0-u91" },
           { runtime: "java-1.8.0-u91-b14" } ]

environment { "PATH": "/usr/lib/jvm/java-8-openjdk-amd64/bin:$PATH",
              "JAVA_HOME": "/usr/lib/jvm/java-8-openjdk-amd64" }

build (

	apt-get update
	apt-get install --yes software-properties-common python-software-properties
	add-apt-repository --yes ppa:openjdk-r/ppa
	apt-get update
	apt-get --yes --no-install-recommends install openjdk-8-jdk=8u91-b14-0ubuntu4~14.04
)
```

You build that in the same way you build the ELK stack pieces:

```code
cd openjdk/
apc package build openjdk-1.8.0-u91-b14.conf
```

then add policy to make your package resolution to force that:

```code
if (dependency equals runtime.java-1.8) 
{
	package.default "package::/apcera/pkg/runtimes::openjdk-1.8.0-u91-b14"
}
```

Now that we have taken care of that, jump back to [where you probably 
were](#build-the-elastisearch-package)

 