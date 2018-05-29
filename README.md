# Solace Orchestra
A distributed music playing game over messaging.


## Starting it up

There are four components that you need to run:

* conductor
* symphony
* dashboard
* musician - in orchestra-hero directory

### Startup for symphony, dashboard and musician

First you need to fill in the URLs and credentials for a messaging broker in `common/env.js`. The javascript apps use 
the SMF port.

All three of these components are javascript single-page apps for the browswer. To get them to work, you need to go into each directory and run:

1. `npm install`
2. `npm run watch` - note that this never exits, so you will need a separate terminal for each

Then you need to start some sort of web-server to serve the files. The easiest way to do this is to navigate to the
root directory of the project and run:

  `python -m SimpleHTTPServer 8000`
  
This runs a very bare-bones server that can serve up the files. I find it a bit flakey, so you might have to
restart it occasionally.

To run a component, you should be able to go to: 

  * Dashboard:  http://localhost:8080/dashboard/dist/index.html
  * Symphony: http://localhost:8080/symphony/dist/index.html
  * Musician: http://localhost:8080/orchestra-hero/dist/index.html

### Startup for conductor

For the conductor, the easiest way to run it is to do:

1. Navigate to solace-orchestra/conductor/conductor
2. Run the following:

```
  virtualenv -p python3 env
  . env/bin/activate
  pip install -r ../requirements.txt
```

Next you need a credentials file in your home directory called `solace.cloud`. Its contents are:

```
  url=<solace-cloud-service-url>
  port=<mqtt-port>
  username=<username>
  password=<password>
```


After than, run the conductor with:

```
  python3 conductor.py
```


