# Starting this job

OK, there is a manifest, but that does not support linking to another job

### Create the App

This app has to be bound to an elasticsearch instance.  Make sure that 
you have one running!

```bash
apc app delete my-syslog  -q  ; \
apc app create --allow-ssh ; \
apc app link my-syslog --to elasticsearch --name elasticsearch --port 0 ; \
apc app start my-syslog ; \
apc app connect my-syslog
```


This might need a tcp route rather than an http route

## Note that the IP for the tcp router of the Hybrid Cluster is (52.27.133.114)

(this assumes that you have started the todo app, set the route accordingly)

```console
apc app create --allow-ssh --start --routes http://todo-drain.hybridcloud.apcera.net
```

#### For prove:


nc -w0 52.7.157.82 8888 <<< "testing again from my home machine"
apc drain add syslog://52.7.157.82:8888 --app todo

#### For Hybrid:

nc -w0 52.27.133.114 8888 <<< "testing again from my home machine"
apc drain add syslog://52.27.133.114:8888 --app todo

## Filters, Codecs, and Plugins, Oh My...

The whole premise of this app flavor is to serve as a syslog target (that is to say
that we are set up using a syslog input).  Granted, we don't have a tremendous 
amount of knowledge about what is coming in.  For this we want to set up FILTERS.

In this case we are setting up a log drain for the todo-map app.  That app outputs 
records as such (note that these are approximations, things change):

```code
2016-06-29T17:49:29.000Z 10.0.0.183 access-log 10.0.1.27 - Wed, 29 Jun 2016 17:49:29 GMT latency 0.851 ms job::/sandbox/jamie.smith::todo 6b239a6d-8a06-4a10-8505-7d7a4b6310e9 "GET / HTTP/1.1" 200 8058 "-" "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_11_5) AppleWebKit/601.6.17 (KHTML, like Gecko) Version/9.1.1 Safari/601.6.17"
2016-06-29T17:49:29.000Z 10.0.0.183 access-log 10.0.1.27 - Wed, 29 Jun 2016 17:49:29 GMT latency 0.715 ms job::/sandbox/jamie.smith::todo 233ce4d6-a85e-4482-8b6f-3c5c62a52aa8 "GET /toDoApp.js HTTP/1.1" 304 - "http://todo-y3xaec.demo.proveapcera.io/" "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_11_5) AppleWebKit/601.6.17 (KHTML, like Gecko) Version/9.1.1 Safari/601.6.17"
```

Which kind of looks like a standard apache log, but really isn't. It is a morgan 
format log, specified as:

```code
morgan.format('apcera', 'access-log :remote-addr - :remote-user [:date[clf]] latency :response-time ms :cntm-job :cntm-instance ":method :url HTTP/:http-version" :status :res[content-length] ":referrer" ":user-agent"')
```


The first two fields: `2016-06-29T15:10:13.000Z 10.0.0.183` are fields added by
syslog for the date and source IP, which leaves the remainder, broken up in to 
the following fields:

| field name                     | value                         |
|--------------------------------|-------------------------------|
| access-log                     | access-log                    |
|:remote-addr -                  | 10.0.0.156 - |
|:remote-user                    | (blank)- |
|:date[clf]                      | Wed, 29 Jun 2016 15:10:13 GMT |
|:response-time ms               | latency 1.389 ms |
|:cntm-job                       | job::/sandbox/jamie.smith::todo |
|:cntm-instance                  | cba33a3f-e8d4-415e-9291-a324a2b4a77b |
|:method :url HTTP/:http-version | "GET /api/todos HTTP/1.1" |
|:status                         | 200 |
|:res[content-length]            | 3543 |
|":referrer"                     | "http://todo-y3xaec.demo.proveapcera.io/" |
|":user-agent"'                  | "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_11_5) AppleWebKit/601.6.17 (KHTML, like Gecko) Version/9.1.1 Safari/601.6.17"|

Using http://grokconstructor.appspot.com/do/constructionstep

We can build

```code
%{TIMESTAMP_ISO8601:received_time} %{IP:source_ip} access-log %{IP:remote_addr} %{NOTSPACE:remoteuser} %{DAY:access_day}, %{MONTHDAY:access_monthday} %{MONTH:access_month} %{YEAR:access_} %{TIME:access_time} GMT latency %{NUMBER:latency_ms} ms %{NOTSPACE:jobname} %{NOTSPACE:uuid} %{QUOTEDSTRING:action} %{NUMBER:returncode} %{NOTSPACE:contentlength} %{QUOTEDSTRING:refer} %{QUOTEDSTRING:agent}
```

which translates to something like:

```json
{
  "remoteip": [
    [
      "71.75.126.189"
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
      "job::/sandbox/jamie.smith::todo"
    ]
  ],
  "instanceid": [
    [
      "d0fa7706-e9e7-42b7-9d52-d7c786608239"
    ]
  ],
  "action": [
    [
      "GET /api/db    HTTP/1.1"
    ]
  ],
  "size": [
    [
      "-"
    ]
  ],
  "referrer": [
    [
      "http://todo-drain.hybridcloud.apcera.net/"
    ]
  ],
  "useragent": [
    [
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_11_5) AppleWebKit/601.6.17 (KHTML, like Gecko) Version/9.1.1 Safari/601.6.17"
    ]
  ]
}
```


Note that the client-ip may reflect the ELB if you haven't turned on proxy protocol
support on both the ELB and the router.
