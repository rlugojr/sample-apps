var http = require('http');
var randomstring = require("randomstring");
var express = require('express');
var request = require('request');
var app = express();
var bodyParser = require('body-parser');
app.use(bodyParser());
require('request-debug')(request);
var address = process.env.CLUSTER;
var policydocument = process.env.POLICYDOCUMENT;
var user = process.env.username;
var password = process.env.password;
var auth_address = address.replace("api","gauth");
var docker_address = address.replace("api.","");
var port = process.env.PORT;
var accesstoken = process.env.TOKEN;
var lineReader = require('line-reader');
var package_array = [];
var route_array = [];
var network_array = [];
var previous_path = "";
var previous_endpoint = "";
var previous_type = "";
var server = require("http").createServer(app);
var version = '0';

function getVersion(){
    var responseString = "";
    var options = {
        host: address,
        port: 80,
        path: '/v1/version',
        headers: {
            'Authorization': 'Bearer ' + accesstoken
        }
    }
    var request = http.get(options, function(response){
        response.on('data', function(data) {
            responseString += data;
            var build_number = JSON.parse(responseString);
            return(build_number.build_number);
        });
    });
}

var defaultHTML = (
    '<html>'
    +'<body bgcolor="#f5f5f5">'
    );

app.get('/hardtag', function(req, res) {
    var responseString = "";
    var second_responseString = "";
    var app = req.query['app'];
    var uuid = req.query['uuid'];
    var fqn = req.query['fqn'];
    var tag = req.query['tag'];
    var options = {  host: address,port: 80, path: '/v1/jobs/' + uuid, headers: { 'Authorization': 'Bearer ' + accesstoken } }
    res.write(defaultHTML);


    var get_request = http.get(options, function(response){
      response.on('data', function(data) {
        responseString += data;
    });

      response.on('end', function(data){
        responseString.state = '';
        var change_state = JSON.parse(responseString)
        change_state.scheduling_tags =  [ { 'type': 'hard', 'tag': tag, 'source': 'user'} ];
        change_state.state = 'stopped';
        var options = {
            url: 'http://' + address + '/v1/jobs/' + uuid,
            headers: {
                'Authorization': 'Bearer ' + accesstoken
            },
            body: JSON.stringify(change_state)
        }

        var stop = request.put(options, function(error, response, body) {
        //res.write('Stopped Job');

        var options = {  uri: 'http://127.0.0.1:' + port + '/start?uuid=' + uuid + '&fqn=' + fqn};
        var start_app = request.get(options, function(error, response, body) {
         var options = {  uri: 'http://127.0.0.1:' + port + '/viewjob?app=' + app};
         var display_app = request.get(options, function(error, response, body) {
            res.end(body);
        });
     });


    });
    });
  });

});

app.get('/stop', function(req, res) {
    var responseString = "";
    var uuid = req.query['uuid'];
    var app = req.query['app'];
    var fqn = req.query['fqn'];
    var options = {  host: address,port: 80, path: '/v1/jobs/' + uuid, headers: { 'Authorization': 'Bearer ' + accesstoken } }
    res.write(defaultHTML);

    var get_request = http.get(options, function(response){
        response.on('data', function(data) {
            responseString += data;
        });
        response.on('end', function(data){
            responseString.state = '';
            var change_state = JSON.parse(responseString)
            change_state.state = 'stopped';
            var options = {
                url: 'http://' + address + '/v1/jobs/' + uuid,
                headers: {
                    'Authorization': 'Bearer ' + accesstoken
                },
                body: JSON.stringify(change_state)
            }

            var stop = request.put(options, function(error, response, body) {
                var options = {  uri: 'http://127.0.0.1:' + port + '/viewjob?app=' + app};
                var display_app = request.get(options, function(error, response, body) {
                    res.end(body);
                });
            });
        });
    });
});

app.get('/createdocker', function(req, res) {
    var dockername = req.query['dockername'];
    var dockerimage = req.query['dockerimage'];
    var namespace = ""
    var uuid = "";
    var responseString = "";
    var startcommand = req.query['startcommand'];

    res.write(defaultHTML);
    res.write('Creating Docker Job.............');

    var options = {
        host: address,
        port: 80,
        path: '/v1/namespace/default',
        headers: {
            'Authorization': 'Bearer ' + accesstoken
        }
    };

    var namespace = http.get(options, function(response){
        response.on('data', function(data) {
            responseString += data;
        });
        response.on('end', function(data){

            if(response.statusCode != 200) {
               res.end('<br><br>An error has occurred with the request. Are you authenticated?');
           } else {

            var parseResponse = JSON.parse(responseString);
            namespace = parseResponse.namespace;


            var body =  {
                "allow_egress": true,
                "env": {},
                "exposed_ports": [],
                "image_url":"https://index.docker.io/" + dockerimage + ":latest",
                "job_fqn": "job::" + namespace + "::" + dockername,
                "resources": { 
                    "cpu":0,
                    "disk":1073741824,
                    "memory":268435456,
                    "netmax":0,
                    "network":5000000
                },
                "routes": {},
                "start":true,
                "start_command":[
                startcommand
                ]
            };

            var options = {
                url: 'http://' + address + '/v1/jobs/docker',
                method: 'POST',
                headers: {
                    'Authorization': 'Bearer ' + accesstoken,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(body)
            }

            request(options, function(error, response, body) {
                if (response.statusCode != "200") {
                    res.end("<br><br>An error has occurred. ");
                } else {
                    var location = JSON.parse(body);
                    if (!location.location) {
                        res.end("<br><br>An error has occurred.");
                    } else {
                        var parse1 = location.location;
                        uuid = parse1.replace("http://" + address, "");

                        res.end(
                            '<form action="/viewtask" method="get">'
                            + '<input type="hidden" name="app" value="' + dockername + '">'
                            + '<input type="hidden" name="uuid" value="' + uuid + '">'
                            + '<br><br>'
                            + 'Click View to check application status. '
                            + '<br><br>'
                            + '<input type="submit" value="View"'
                            + ' name="Submit" id="frm1_view" />'
                            + '</form>'
                            );
                    }
                }

            }).on('error', function(e) {
                console.log("Got error 2 : " + e.message);
            });
        }
    });
    });
});

app.get('/viewtask', function(req, res){
    var dockername = req.query['app'];
    var responseString = "";
    var uuid = req.query['uuid'];
    var options = {
        host: address,
        port: 80,
        path: uuid,
        headers: {
            'Authorization': 'Bearer ' + accesstoken
        }
    }
    var stop = 1;

    var request = http.get(options, function(response){
        response.on('data', function(data) {
            responseString += data;
        });
        response.on('end', function(data){
            var jobs = JSON.parse(responseString);
            if (jobs.state == "complete" || jobs.state == "stopped"){
                res.write(defaultHTML);
                res.end(
                    '<form action="/viewjob" method="get">'
                    + '<input type="hidden" name="app" value="' + dockername + '">'
                    + 'Application is running. Click View to check application status. <br><br> '
                    + '<input type="submit" value="View"'
                    + ' name="Submit" id="frm1_view" />'
                    + '</form>'
                    );
            } else {
                res.write(defaultHTML);
                res.end(
                    '<form action="/viewtask" method="get">'
                    + '<input type="hidden" name="app" value="' + dockername + '">'
                    + '<input type="hidden" name="uuid" value="' + uuid + '">'
                    + '<br><br>'
                    + 'Your Application is not ready yet. Click View again to check application status. '
                    + '<br><br>'
                    + '<input type="submit" value="View"'
                    + ' name="Submit" id="frm1_view" />'
                    + '</form>'
                    );
            }
        });
    }).on('error', function(e) {
        console.log("Got error: " + e.message);
    });
});

app.get('/start', function(req, res) {
    var responseString = "";
    var uuid = req.query['uuid'];
    var app = req.query['app'];
    var options = {
        host: address,
        port: 80,
        path: '/v1/jobs/' + uuid,
        headers: {
            'Authorization': 'Bearer ' + accesstoken
        }
    }
    res.write(defaultHTML);

    var get_request = http.get(options, function(response){
        response.on('data', function(data) {
            responseString += data;
        });
        response.on('end', function(data){
            responseString.state = '';
            var change_state = JSON.parse(responseString)
            change_state.state = 'started';
            var options = {
                url: 'http://' + address + '/v1/jobs/' + uuid,
                headers: {
                    'Authorization': 'Bearer ' + accesstoken
                },
                body: JSON.stringify(change_state)
            }

            var stop = request.put(options, function(error, response, body) {
                if(app) {
                    var options = {  uri: 'http://127.0.0.1:' + port + '/viewjob?app=' + app};
                    var display_app = request.get(options, function(error, response, body) {
                        res.end(body);
                    }); 
                }
            });
        });
    });
});

app.get('/delete', function(req, res) {
    var app = req.query['app'];
    var responseString = "";
    var uuid = req.query['uuid'];
    var package_uuid = '';
    var fqn = req.query['fqn'];
    var data = {
        fqn: fqn,
        state: 'stopped'
    };
    var options = {
        host: address,
        port: 80,
        path: '/v1/packages?name=' + app,
        headers: {
            'Authorization': 'Bearer ' + accesstoken
        }
    }

    var package_request = http.get(options, function(response){
        response.on('data', function(data) {
            responseString += data;
        });
        response.on('end', function(data){
            var packageuuidparse = JSON.parse(responseString);
            for (var i = 0; i < packageuuidparse.length; i++){
                if(packageuuidparse[i].name == app) {
                    package_uuid = packageuuidparse[i].uuid;
                }
            }

            var options = {  uri: 'http://127.0.0.1:' + port + '/stop?uuid=' + uuid};
            var stop_first = request.get(options, function(error, response, body) {


              var options = {  uri: 'http://' + address + ':80/v1/jobs/' + uuid,headers: {
                'Authorization': 'Bearer ' + accesstoken}};           

                var deleteJob = request.del(options, function(error, response, body) {   

                  var options = {  uri: 'http://' + address + ':80/v1/packages/' + package_uuid, headers: {
                    'Authorization': 'Bearer ' + accesstoken}};
                    var deletePackage = request.del(options, function(error, response, body) {});
                    setTimeout(function() {
                     var options = {  uri: 'http://127.0.0.1:' + port + '/getjobs'};
                     var display_app = request.get(options, function(error, response, body) {
                        res.end(body);
                    }, 2000);
                 });  
                });

            });
        });

    });
});

app.get('/getjobs', function(req, res) {
    res.write(defaultHTML);
    res.write("<p align=left><b>All Running Jobs</b><br><br></p>");
    var responseString = "";
    var options = {
        host: address,
        port: 80,
        path: '/v1/jobs',
        headers: {
            'Authorization': 'Bearer ' + accesstoken
        }
    }
    var request = http.get(options, function(response){
        response.on('data', function(data) {
            responseString += data;
        });
        response.on('end', function(data){
         var jobs = JSON.parse(responseString);
         res.write('<ul>');
         for (var i = 0; i < jobs.length; i++){
            res.write(
                '<li><b>Job Name: </b><a href="/viewjob?app='
                + jobs[i].name
                + '&Submit=View">'
                + jobs[i].name
                + '</a> <b> Status: </b>' + jobs[i].state + '</li>'
                );
        }
        res.end('</ul>');
        request.end();
    });
    });
});

app.get('/migrate', function(req, res){
    var app = req.query['app'];
    var tag = req.query['tag'];
    var responseString = "";
    var uuid = "";
    var url = "";
    var fqn = "";

    var options = {
        host: address,
        port: 80,
        path: '/v1/jobs',
        headers: {
            'Authorization': 'Bearer ' + accesstoken
        }
    }


    var get_request = http.get(options, function(response){
        response.on('data', function(data) {
            responseString += data;
        });
        response.on('end', function(data){
            var jobs = JSON.parse(responseString);
            for (var i = 0; i < jobs.length; i++){
               if(jobs[i].name == app) {
                   uuid = jobs[i].uuid;
                   fqn = jobs[i].fqn;
                   state = jobs[i].state;
                   if(jobs[i].ports) {
                    if(   url = jobs[i].ports[0].routes){
                        url = jobs[i].ports[0].routes[0].endpoint;
                    }
                }
            }
        }

        res.write(defaultHTML);

        if(uuid.length < 10) {
            res.end("Error, Application not found!");
        } else {
           var options = {  uri: 'http://127.0.0.1:' + port + '/hardtag?uuid=' + uuid + '&fqn=' + fqn + '&tag=' + tag};
           var start_app = request.get(options, function(error, response, body) {
               console.log('Migration request complete');
           });
       }
   });
    });
});

app.get('/getquotapolicy', function(req, res){
    var responseString = "";
    var policy_output = [];
    var options = {
        host: auth_address,
        port: 80,
        path: '/v1/policy/' + policydocument,
        headers: {
            'Authorization': 'Bearer ' + accesstoken
        }
    }

    var request = http.get(options, function(response){
        response.on('data', function(data) {
            responseString += data;
        });
        response.on('end', function(data){
           var rules = JSON.parse(responseString);
           if(!rules.name) {
            res.end('<html>Quota Document not found. Did you set the ENVAR for POLICYDOCUMENT? </html>' );
        } else {
            var parse_data = rules.text.split('{');
            for (var i = 0; i < parse_data.length; i++) {
                if(parse_data[i].indexOf('max.job.cpu') > -1) {
                    parse_data[i] =  parse_data[i].replace('max.job.cpu','');
                }
                if(parse_data[i].indexOf('max.job.memory') > -1) {
                    parse_data[i] =  parse_data[i].replace('max.job.memory','');
                }
                if(parse_data[i].indexOf('max.job.disk') > -1) {
                    parse_data[i] =  parse_data[i].replace('max.job.disk','');
                }
                if(parse_data[i].indexOf('max.job.network') > -1) {
                    parse_data[i] =  parse_data[i].replace('max.job.network','');
                }
                if(parse_data[i].indexOf('}') > -1) {
                    parse_data[i] =  parse_data[i].replace('}','');
                }
            }
            for (var i = 2; i < parse_data.length; i++) {
               parse_data[i] =  parse_data[i].replace(/\s/g, '');
               if(parse_data[i].indexOf('}') > -1) {
                  parse_data[i] =  parse_data[i].replace('}','');
              }
              policy_output.push(parse_data[i]);
          }

          res.end(JSON.stringify(policy_output)); 
      }
  });
    });
});


app.get('/getroutes', function(req, res){
    var app = req.query['app'];
    var responseString = "";
    var uuid = "";
    route_array = [];

    var options = {  uri: 'http://' + address + ':80/v1/jobs',headers: {
        'Authorization': 'Bearer ' + accesstoken
    }};


    var get_job_list = request.get(options, function(error, response, body) {
        var results = JSON.parse(body);
        for (var i = 0; i < results.length; i++){
           if(results[i].name == app) {  
              if(results[i].ports) {
                 if(results[i].ports[0]) {
                    var len =   results[i].ports.length;
                    for(var h=0;h < len; h++ ) {
                        if(results[i].ports[h].routes) {
                          var analyze = JSON.stringify(results[i].ports[h].routes);
                          var split_analyze = analyze.split("endpoint")
                          for(var z=0;z < split_analyze.length; z++ ) {
                              var split_again = split_analyze[z].split(",");
                              split_again[0] = split_again[0].replace(/[\\\"{\[]/gi, '')
                              if(split_again[0].indexOf('tcp') > -1){
                               split_again[0] = split_again[0].replace('tcp','');
                           }
                           if(split_again[0].indexOf('http') > -1){
                               split_again[0] = split_again[0].replace('http','');
                           }
                           if(split_again[0].indexOf('type') > -1){
                               split_again[0] = split_again[0].replace('type','');
                           }
                           if(split_again[0].substring(0,1) == ':') {
                            split_again[0] = split_again[0].replace(':','');
                        }

                        route_array.push(split_again[0]);

                    }
                }
            }
        }   
    }
}
}
res.end(JSON.stringify(route_array));
});

});

app.get('/getnetwork', function(req, res){
    var app = req.query['app'];
    var responseString = "";
    var uuid = "";
    network_array = [];

    var options = {  uri: 'http://' + address + ':80/v1/jobs',headers: {
        'Authorization': 'Bearer ' + accesstoken
    }};

    var get_job_list = request.get(options, function(error, response, body) {
      var network_list = JSON.parse(body);
      for (var i = 0; i < network_list.length; i++){
         if(network_list[i].name == app) {  
            for (var binding in network_list[i].bindings) {
              if (network_list[i].bindings.hasOwnProperty(binding)) {
                network_array.push(network_list[i].bindings[binding].service_fqn);
            }
        }
    }
}
res.send(JSON.stringify(network_array));
});
});



app.get('/gettags', function(req, res){
    var app = req.query['app'];
    var responseString = "";
    var uuid = "";
    var tag_array = [];
    var options = {
        host: address,
        port: 80,
        path: '/v1/jobs',
        headers: {
            'Authorization': 'Bearer ' + accesstoken
        }
    }
    var request = http.get(options, function(response){
        response.on('data', function(data) {
            responseString += data;
        });
        response.on('end', function(data){
            var jobs = JSON.parse(responseString);
            for (var i = 0; i < jobs.length; i++){
               if(jobs[i].name == app) {  
                if(jobs[i].scheduling_tags) {
                 for(var h=0; h < jobs[i].scheduling_tags.length; h++){
                    tag_array.push( jobs[i].scheduling_tags[h].tag);
                }
            }
        }
    }
    res.end(JSON.stringify(tag_array));
});
    });
});




app.get('/getquota', function(req, res){
    var app = req.query['app'];
    var responseString = "";
    var uuid = "";
    var quota_array = [];
    var options = {
        host: address,
        port: 80,
        path: '/v1/jobs',
        headers: {
            'Authorization': 'Bearer ' + accesstoken
        }
    }
    var request = http.get(options, function(response){
        response.on('data', function(data) {
            responseString += data;
        });
        response.on('end', function(data){
            var jobs = JSON.parse(responseString);
            for (var i = 0; i < jobs.length; i++){
               if(jobs[i].name == app) {  
                  if(!jobs[i].resources) {
                    res.end('Application not found' );
                } else {
                   quota_array.push(jobs[i].resources.cpu);
                   quota_array.push(jobs[i].resources.memory);
                   quota_array.push(jobs[i].resources.disk);
                   quota_array.push(jobs[i].resources.network);
                   quota_array.push(jobs[i].resources.netmax);
               }
           }
       }
       res.end(JSON.stringify(quota_array));
   });
    });
});



app.get('/resetdemo', function(req, res){
    var app = req.query['app'];
    var responseString = "";
    var uuid = "";
    var tag = "";
    var url = "";
    var fqn = "";
    var state = "";
    var options = {
        host: address,
        port: 80,
        path: '/v1/jobs',
        headers: {
            'Authorization': 'Bearer ' + accesstoken
        }
    }
    var info_request = http.get(options, function(response){
        response.on('data', function(data) {
            responseString += data;
        });
        response.on('end', function(data){
            var jobs = JSON.parse(responseString);
            for (var i = 0; i < jobs.length; i++){
               if(jobs[i].name == app) {
                   uuid = jobs[i].uuid;
                   fqn = jobs[i].fqn;
               }
           }

           res.write(defaultHTML);

           if(uuid.length < 10) {
            res.end("Error, Application not found!");
        } else {

           var options = {
            host: 'http://127.0.0.1:' + port,
            path: '/v1/jobs/' + uuid,
            headers: {
                'Authorization': 'Bearer ' + accesstoken
            }
        };

        var options = {  uri: 'http://127.0.0.1:' + port + '/stop?uuid=' + uuid + '&fqn=' + fqn};
        var stop_app = request.get(options, function(error, response, body) {
         res.end('<br>stopped Job');
         var options = {  uri: 'http://127.0.0.1:' + port + '/delete?uuid=' + uuid + '&fqn=' + fqn};
         var delete_app = request.get(options, function(error, response, body) {
             res.end('<br>deleted Job');
         });
     });
    }

});
    });
});

app.get('/getcomposition', function(req, res){
    var app = req.query['app'];
    var responseString = ""; 
    var packageResponseString = "";
    var uuid = "";
    package_array = [];

    var options = {
        host: address,
        port: 80,
        path: '/v1/jobs',
        headers: {
            'Authorization': 'Bearer ' + accesstoken
        }
    }
    var info_request = http.get(options, function(response){
        response.on('data', function(data) {
            responseString += data;
        });
        response.on('end', function(data){

           var jobs = JSON.parse(responseString);
           for (var i = 0; i < jobs.length; i++){
               if(jobs[i].name == app) {
                   uuid = jobs[i].uuid;
               }
           }

           if(!uuid) {
            res.end("Error, Application not found!");
        } else {



            var options = {  uri: 'http://' + address + ':80/v1/jobs/' + uuid,headers: {
                'Authorization': 'Bearer ' + accesstoken
            }};

            var get_job_details = request.get(options, function(error, response, body) {
                var packages = JSON.parse(body);
                for (var i = 0; i < packages.packages.length - 1; i++){

                    var options = {  uri: 'http://' + address + ':80/v1/packages/' + packages.packages[i].uuid,headers: {
                        'Authorization': 'Bearer ' + accesstoken
                    }};
                    var get_package_details = request.get(options, function(error, response, body) {
                        var results = JSON.parse(body);
                        package_array.push(results.name);   

                    });
                }
                setTimeout(function() {
                    res.end(JSON.stringify(package_array));
                }, 5000);      
            });
        }
    });
    });
});

app.get('/appfrompackage', function(req, res){
 var appname = req.query['app'];
 var startcommand = req.query['startcommand'];
 var packagename = req.query['package'];
 var namespace = "";
 var appfrompackage = 'package::' + packagename;
 var PackageresponseString = "";
 var package_uuid = "";
 var fqn = "";
 var responseString = "";
 var instances = "1";

 var options = {
    host: address,
    port: 80,
    path: '/v1/namespace/default',
    headers: {
        'Authorization': 'Bearer ' + accesstoken
    }
}
var namespace = http.get(options, function(response){
    response.on('data', function(data) {
        responseString += data;
    });
    response.on('end', function(data){
        if(response.statusCode != 200) {
            res.end('An error has occurred with the request. Are you authenticated?');
        } else {
            var parseResponse = JSON.parse(responseString);
            namespace = parseResponse.namespace;
            fqn = 'job::' + namespace + '::' + appname;

            var options = {  uri: 'http://' + address + ':80/v1/packages?fqn=' + appfrompackage, headers: {
                'Authorization': 'Bearer ' + accesstoken}};

                var getPackage = request.get(options, function(error, response, body) { 
                  if(body.indexOf('uuid') > -1 ){
                    var get_uuid =  body.split(":");
                    var split_uuid =  get_uuid[1].split(",");
                    package_uuid = split_uuid[0];
                    package_uuid =package_uuid.replace('\"','');
                    package_uuid =package_uuid.replace('\"','');

                    if(package_uuid.length > 15) {

                      var request_body =  {
                        "name": appname,
                        "fqn": fqn,
                        "num_instances":  1,
                        "tags": { "app": appname },
                        "packages": [{ "uuid": package_uuid 
                    }],
                    "processes": { "app": { 
                        "start_command_raw": [],
                        "start_command": startcommand,
                        "start_command_timeout": 30,
                        "stop_command_raw": [],
                        "stop_command": "",
                        "stop_timeout": 5
                    },
                },
                "resources": {
                    "cpu": 0,
                    "memory": 268435456,
                    "disk": 104857600,
                    "network": 5000000,
                    "netmax": 0
                },
                "ports": [
                {
                  "number": 0,
                  "optional": false,
                  "routes": [
                  {
                      "type": "http",
                      "endpoint": appname + ".demo.apcera.net",
                      "weight": 0
                  }
                  ]
              }
              ],
              "state": "started",
              "tags": {
                "app": appname
            }
        };

        var options = {
            url: 'http://' + address + '/v1/jobs',
            method: 'POST',
            headers: {
                'Authorization': 'Bearer ' + accesstoken,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(request_body)
        }

        request(options, function(error, response, body) {
            if (response.statusCode != "200") {
                res.end("An error has occurred.");
            } else {
               res.send('Successful!');
           }
       })
    } else {
        res.end('Error: UUID parsing error!');    
    }
} else {
    res.end('An error has occurred.');
}
});
            }
        });

});

});



app.get('/viewjob', function(req, res){
    var app = req.query['app'];
    var responseString = "";
    var uuid = "";
    var tag = "";
    var url = "";
    var fqn = "";
    var state = "";
    route_array = [];
    var options = {
        host: address,
        port: 80,
        path: '/v1/jobs',
        headers: {
            'Authorization': 'Bearer ' + accesstoken
        }
    }
    var job_request = http.get(options, function(response){
        response.on('data', function(data) {
            responseString += data;
        });
        response.on('end', function(data){
            var jobs = JSON.parse(responseString);
            for (var i = 0; i < jobs.length; i++){
               if(jobs[i].name == app) {
                   uuid = jobs[i].uuid;
                   fqn = jobs[i].fqn;
                   state = jobs[i].state;
                   if(jobs[i].ports) {
                    if(   url = jobs[i].ports[0].routes){
                        url = jobs[i].ports[0].routes[0].endpoint;
                    }
                }
                if(jobs[i].scheduling_tags) {
                    tag = jobs[i].scheduling_tags[0].tag;
                }
            }
        }


        var options = {  uri: 'http://127.0.0.1:' + port + '/getcomposition?app=' + app};
        var get_routes = request.get(options, function(error, response, body) {

            var options = {  uri: 'http://127.0.0.1:' + port + '/getroutes?app=' + app};
            var get_routes = request.get(options, function(error, response, body) {

               var options = {  uri: 'http://127.0.0.1:' + port + '/getnetwork?app=' + app};
               var get_routes = request.get(options, function(error, response, body) {
                   res.write(defaultHTML);

                   if(uuid.length < 10) {
                    res.end("Error, Application not found!");
                } else {
                    res.end(  
                        '<p align=left>'
                        + '<table style="width:10%">'
                        + '<tr>'
                        + '<b>Application Options</b><br><br>'
                        + '<td><form action="/start">'
                        + '<input type="hidden" name="app" value="' + app + '"/>'
                        + '<input type="hidden" name="uuid" value="' + uuid + '"/>'
                        + '<input type="hidden" name="fqn" value="' + fqn + '"/>'
                        + '<input type="submit" value="Start Job"/>'
                        + '</form></td>'
                        + '<td><form action="/stop">'
                        + '<input type="hidden" name="uuid" value="' + uuid + '"/>'
                        + '<input type="hidden" name="app" value="' + app + '"/>'
                        + '<input type="hidden" name="fqn" value="' + fqn + '"/>'
                        + '<input type="submit" value="Stop Job"/>'
                        + '</form></td>'
                        + '<td><form action="/delete">'
                        + '<input type="hidden" name="uuid" value="' + uuid + '"/>'
                        + '<input type="hidden" name="app" value="' + app + '"/>'
                        + '<input type="hidden" name="fqn" value="' + fqn + '"/>'
                        + '<input type="submit" value="Delete Job"/>'
                        + '</form></td>'
                        + '<td>Set a hard tag: ' 
                        + '<form action="/hardtag">'
                        + '<input type="hidden" name="app" value="' + app + '"/>'
                        + '<input type="hidden" name="uuid" value="' + uuid + '"/>'
                        + '<input type="hidden" name="fqn" value="' + fqn + '"/>'
                        + '<input type="text" name="tag" value=""/>'
                        + '<input type="submit" value="Set Hard Tag"/>'
                        + '</form></td>'
                        + '</tr></table>'
                        + '<table style="width:10%">'
                        + '<tr>'
                        + '<br><b>Application Details:</b>'
                        + '<br><br>Job Name: ' + app
                        + '<br><br>Job UUID: ' + uuid
                        + '<br><br>FQN: ' + fqn
                        + '<br><br>Application State: ' + state
                        + '<br><br>URL: <a href="http://' + url + '" target="_blank">Connect </a>'
                        + '<br><br>Tag: ' + tag
                        + '<br><br>Packages: ' + JSON.stringify(package_array)
                        + '<br><br>Routes: ' + JSON.stringify(route_array)
                        + '<br><br>Networks: ' + JSON.stringify(network_array)
                        + '</tr>'
                        + '</table>'
                        + '</body></html>'
                        );
                }
            });
           });
        });        
    });
});
});


app.get('/version', function(req, res) {
    var responseString = "";
    var options = {
        host: address,
        port: 80,
        path: '/v1/version',
        headers: {
            'Authorization': 'Bearer ' + accesstoken
        }
    }
    var request = http.get(options, function(response){
        response.on('data', function(data) {
            responseString += data;
        });

        response.on('end', function(error,data) {
            res.write(defaultHTML);
            var build_number = JSON.parse(responseString);
            if (!build_number.build_number) {
                res.end('<br><br>An error occurred when trying to get the version number.<br><br>');
            } else {
                res.write("<p align=left>Apcera Version: ");
                res.write(build_number.build_number);
                res.end("</p>");
            }
        });
    });
});

app.get('/oauth2', function(req,res){
    var responseString = "";
    var options = {
        host: auth_address,
        port: 80,
        path: '/v1/oauth2/device/google/getcode'
    }
    var request = http.get(options, function(response){
        response.on('data', function(data){
         responseString += data;
     });
        response.on('end', function(data){
          var authResponse = JSON.parse(responseString);
          res.write(defaultHTML);
          res.end('<html><body bgcolor="#f5f5f5">'
            + 'Please click here: <a target="_blank" href="'+ authResponse.verification_url + '">Google</a> and enter code: <b>' + authResponse.user_code + '</b> when prompted. Continue to follow the prompts on your screen. <br><br>When authentication is completed with Google, click the "Authentication Completed" button below'
            + '<form action="/transfertoken">'
            + '<input type="hidden" name="devicecode" value="' + authResponse.device_code + '">'
            + '<br><br>'
            + '<input type="submit" value="Authentication Completed"/>'
            + '</form>'
            );
      });
    });
});

app.get('/transfertoken', function(req, res) {
    var devicecode = req.query['devicecode'];
    var startcommand = req.query['startcommand'];
    var refresh_token = "";
    var responseString = "";
    var body =  {
        "device_code": devicecode
    };

    res.write(defaultHTML);
    var options = {
        url: 'http://' + auth_address + '/v1/oauth2/device/google/redeemed',
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(body)
    }

    request(options, function(error, response, body) {
        var get_token = JSON.parse(body);
        var redeem_body = {
            "refresh_token": get_token.refresh_token,
            "token_type": "GOOGLE_REFRESH"
        }
        var options = {
            url: 'http://' + auth_address + '/v1/oauth2/device/google/refresh',
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(redeem_body)
        }
        var redeem_token = request(options, function(error, response, body) {
            var get_bearer = JSON.parse(body);
            accesstoken = get_bearer.access_token;

            var options = {  uri: 'http://127.0.0.1:' + port + '/getjobs'};
            var display_app = request.get(options, function(error, response, body) {
                res.end(body);
            }, 2000);
        });
    });
});


var sandbox_html = ('<html>'
    + '<title>Apcera Platform API Demonstration</title>'
    + '<head>'
    + '<link rel="icon"' 
    + 'type="image/png"'
    + 'href="https://www.apcera.com/sites/default/files/favicon-32x32.png">'
    + '<style type="text/css">.myinput { width:200px; height:50px; } </style>'
    + '</head>'
    + '<body bgcolor="#f5f5f5">'
    + '<p align=center>'
    + '<b>API Playground</b><br><br>'
    + '<table style="width:10%">'
    + '<tr>'
    + '<td><form action="/runsandbox" method="POST">'
    + '<b>API Endpoint:</b><br><input type="text" size="50" name="endpoint" value="api.demo.apcera.net"><br>'
    + '<b>Request Path:</b><br><input type="text" size="50" name="path" value="/v1/jobs"><br>'
    + '<b>Request Type:</b><br><input type="text" size="50" name="type" value="GET"><br><br>'
    + '<b>JSON Payload:</b><br><textarea rows="30" cols="100" name="payload" enctype="application/json"></textarea><br><br>'
    + '<input type="submit" value="Submit"/>'
    + '</form></td></tr></table></p><p align=center><b>Response from Server:</b></p><pre>');


function sandbox_html_response(previous_endpoint, previous_path, previous_type){
    return('<html>'
        + '<title>Apcera Platform API Demonstration</title>'
        + '<head>'
        + '<link rel="icon"' 
        + 'type="image/png"'
        + 'href="https://www.apcera.com/sites/default/files/favicon-32x32.png">'
        + '<style type="text/css">.myinput { width:200px; height:50px; } </style>'
        + '</head>'
        + '<body bgcolor="#f5f5f5">'
        + '<p align=center>'
        + '<b>API Playground</b><br><br>'
        + '<table style="width:10%">'
        + '<tr>'
        + '<td><form action="/runsandbox" method="POST">'
        + '<b>API Endpoint:</b><br><input type="text" size="50" name="endpoint" value="' + previous_endpoint + '"><br>'
        + '<b>Request Path:</b><br><input type="text" size="50" name="path" value="' + previous_path + '"><br>'
        + '<b>Request Type:</b><br><input type="text" size="50" name="type" value="' + previous_type + '"><br><br>'
        + '<b>JSON Payload:</b><br><textarea rows="30" cols="100" name="payload" enctype="application/json"></textarea><br><br>'
        + '<input type="submit" value="Submit"/>'
        + '</form></td></tr></table></p><p align=center><b>Response from Server:</b></p><pre>');
}



app.post('/runsandbox', function(req, res){
    var type = req.body.type;
    var endpoint = req.body.endpoint;
    var path = req.body.path;
    var payload = req.body.payload;
    var responseString = "";

    previous_endpoint = endpoint;
    previous_type = type;
    previous_path = path;

    var options = {
        host: endpoint,
        path: path,
        headers: {
            'Authorization': 'Bearer ' + accesstoken
        }
    };

    if(type == "GET") {
        var request = http.get(options, function(response){
            response.on('data', function(data) {
                responseString += data;
            });
            response.on('end', function(data){
                res.write(sandbox_html_response(previous_endpoint, previous_path, previous_type));
                if(responseString.indexOf('Bad Request') > -1) {
                   res.end('An error has occurred with your request.');
               } else {
                  res.end('<p align=center><textarea rows="30" cols="100" name="results">' + JSON.stringify(JSON.parse(responseString),null,2) + '</textarea>' );         
              }
          });
        });
    }

    if(type == "PUT") {
        if(payload.length <1 ){
           res.write(sandbox_html_response(previous_endpoint, previous_path, previous_type));
           res.end('Error, empty or incomplete payload.');
       } else {
         var options = {
            hostname: endpoint,
            port    : '80',
            path    : path,
            method  : 'PUT',
            headers : {
                'Content-Type': 'application/json',
                'Cache-Control': 'no-cache',
                'Content-Length': payload.length,
                'Authorization': 'Bearer ' + accesstoken
            }
        };
    }
    var request = http.request(options, function(response){
        response.on('data', function(data) {
            responseString += data;
        });
        response.on('end', function(data){
          res.write(sandbox_html_response(previous_endpoint, previous_path, previous_type));
          if((responseString.indexOf('Bad Request') > -1) || (responseString.indexOf('Not Found') > -1)) {
           res.end('An error has occurred with your request.');
       } else {
          res.end('<p align=center><textarea rows="30" cols="100" name="results">' + JSON.stringify(JSON.parse(responseString),null,2) + '</textarea>' );         
      }
  });
    });
    request.write(payload);
    req.end;
}

if(type == "POST") {
    if(payload.length <1 ){
       res.write(sandbox_html_response(previous_endpoint, previous_path, previous_type));
       res.end('Error, empty or incomplete payload.');
   } else {
     var options = {
        hostname: endpoint,
        port    : '80',
        path    : path,
        method  : 'POST',
        headers : {
           'Content-Type': 'application/json',
           'Content-Length': payload.length,
           'Authorization': 'Bearer ' + accesstoken
       }
   };

   var request = http.request(options, function(response){
    response.on('data', function(data) {
        responseString += data;
    });
    response.on('end', function(data){
      res.write(sandbox_html_response(previous_endpoint, previous_path, previous_type));
      if(responseString.indexOf('Bad Request') > -1) {
       res.end('An error has occurred with your request.');
   } else {
      res.end('<p align=center><textarea rows="30" cols="100" name="results">' + JSON.stringify(JSON.parse(responseString),null,2) + '</textarea>' );         
  }
});
});
   request.write(payload);
   req.end;
}
}


if(type == "DELETE"){
    var options = {
        host: endpoint,
        port: 80,
        method: 'DELETE',
        path: path,
        headers: {  'Authorization': 'Bearer ' + accesstoken }
    }

    var request = http.request(options, function(response){
        response.on('data', function(data) {
            responseString += data;
        });
        response.on('end', function(data){
          res.write(sandbox_html_response(previous_endpoint, previous_path, previous_type));
          if(responseString.indexOf('Bad Request') > -1) {
           res.end('An error has occurred with your request.');
       } else {
          res.end('<p align=center><textarea rows="30" cols="100" name="results">' + JSON.stringify(JSON.parse(responseString),null,2) + '</textarea>' );         
      }
  });
    });
    request.end();
} 

});



app.get('/sandbox', function(req, res){
    res.end(sandbox_html);
});


app.get('/login', function(req, res){
    var get_user = req.query['username'];
    var get_pass = req.query['password'];
    if (get_user == user)  {
        if (get_pass == password){
          res.end('<html>'
            + '<title>Apcera Platform API Demonstration</title>'
            + '<head>'
            + '<link rel="icon"' 
            + 'type="image/png"'
            + 'href="https://www.apcera.com/sites/default/files/favicon-32x32.png">'
            + '<p align=center><a href="/"><img src="/logo.png"></a></p>'
            + '</head>'
            + '<body bgcolor="#f5f5f5">'
            + '<p align=center>'
            + '<b><font size="6">API Demonstration in Node.js<b><br><br></font>'
            + '<table style="width:10%">'
            + '<tr>'
            + '<td><form action="/getjobs" method="get" target="iframe_a">'
            + '<input type="submit" value="List all jobs" name="Submit" id="frm1_jobs"/>'
            + '</form></td>'
            + '<td><form action="/version" target="iframe_a">'
            + '<input type="submit" value="Cluster Version"/>'
            + '</form></td>'
            + '<td><form action="/sandbox" target="iframe_a">'
            + '<input type="submit" value="API Playground"/>'
            + '</form></td>'
            + '<td><form action="/docker" target="iframe_a">'
            + '<input type="submit" value="Run Docker"/>'
            + '</form></td>'
            + '<td><form action="/oauth2" target="iframe_a">'
            + '<input type="submit" value="Google Auth"/>'
            + '</form></td></tr></table>'
            + '<IFRAME SRC="/body" name="iframe_a" WIDTH=1200 HEIGHT=1000></html>');
      } else {
        res.end('<html>'
            + '<title>Access Denied</title>'
            + '<head>'
            + '<link rel="icon"' 
            + 'type="image/png"'
            + 'href="https://www.apcera.com/sites/default/files/favicon-32x32.png">'
            + '<p align=center><a href="/"><img src="/logo.png"></a></p>'
            + '</head>'
            + '<body><p align=center> Invalid Login!</p></body</html>');
    }
} else {
    res.end('<html>'
        + '<title>Access Denied</title>'
        + '<head>'
        + '<link rel="icon"' 
        + 'type="image/png"'
        + 'href="https://www.apcera.com/sites/default/files/favicon-32x32.png">'
        + '<p align=center><a href="/"><img src="/logo.png"></a></p>'
        + '</head>'
        + '<body><p align=center> Invalid Login!</p></body</html>');
}
});


app.get('/docker', function(req, res){
    var responseString = "";
    res.write(defaultHTML);
    var randomdata = randomstring.generate(7);
    res.end(
        '<p><b>Docker Container Wizard</b></p><br>'
        + '<form action="/createdocker" method="get">'
        + 'Name for Application: '
        + '<input type="text" name="dockername" value="myapp_' + randomdata + '">'
        + '<br><br>'
        + 'Docker Hub image to run: '
        + '<input type="text" name="dockerimage" value="apcerademos/empty">'
        + '<br><br>'
        + 'Start Command: '
        + '<input type="text" name="startcommand" value="/start.sh">'
        + '<br><br>'
        + '<input type="submit" value="Create"'
        + '<name="Create" id="frm1_view" />'
        + '</form>'
        + '</body></html>'
        );
});

app.get('/', function(req, res){
    var responseString = "";
    res.sendFile(__dirname + '/index.html');
});

app.get('/paste/background.png', function(req, res){
    res.sendFile(__dirname + '/background.png');
});

app.get('/body', function(req, res){
    var responseString = "";
    res.end(defaultHTML);
});

app.get('/logo.png', function(req, res){
    res.sendFile(__dirname + '/logo.png');
});

server.listen(port, function() {
    console.log('Listening on port %d', server.address().port);
});

