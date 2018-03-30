function initializeMessaging(msgHandler) {

  var factoryProps = new solace.SolclientFactoryProperties();
  factoryProps.profile = solace.SolclientFactoryProfiles.version10;
  solace.SolclientFactory.init(factoryProps);

  var topic = "/orchestra/default/0";

  // create session
  var session = solace.SolclientFactory.createSession({
    url: hosturl,
    vpnName: vpn,
    userName: username,
    password: pass
  });

  session.on(solace.SessionEventCode.MESSAGE, function (message) {
    let contents = message.getBinaryAttachment();
    console.log("Got a message", contents);
    message = JSON.parse(contents);
    msgHandler(parseInt(message.track), 0);
  });

  session.on(solace.SessionEventCode.UP_NOTICE, function (sessionEvent) {
    console.log('Connected');
    session.subscribe(
      solace.SolclientFactory.createTopicDestination("orchestra/default/0"),
      true, // generate confirmation when subscription is added successfully
      "orchestra/default/0", // use topic name as correlation key
      10000 // 10 seconds timeout for this operation
  );

  });

  session.on(solace.SessionEventCode.SUBSCRIPTION_OK, function (sessionEvent) {
    console.log('Subscribed');
  });

  try {
    session.connect();
  } catch (error) {
    console.log(error.toString());
  }

  return session;
}

function setup() {
  mainLoop();
}

function mainLoop() {
  initializeMessaging(addTimedSlider);
  addTimedSlider(1, 0);
  addTimedSlider(3, 200);
  addTimedSlider(2, 400);
  addTimedSlider(4, 600);
  addTimedSlider(3, 800);
  addTimedSlider(5, 1000);
  addTimedSlider(4, 1200);
  addTimedSlider(6, 1400);
  addTimedSlider(5, 1600);
  addTimedSlider(7, 1800);
  addTimedSlider(6, 2000);
  addTimedSlider(4, 2200);
  addTimedSlider(5, 2400);
  addTimedSlider(3, 2600);
  addTimedSlider(4, 2800);
  addTimedSlider(2, 3000);
  addTimedSlider(3, 3200);
  addTimedSlider(1, 3400);
}

function addTimedSlider(track, timeout) {
  setTimeout(function() {
    addSlider(track);
  }, timeout);    
}

function addSlider(track) {
  var sliders = document.getElementById("sliders");
  var slider = {};
  slider.element = document.createElement("div");
  slider.track = track;
  slider.element.className +=
    "slider slider-anim-" + track + " track" + track + " shape color" + track;
  var d = new Date();
  slider.addTime = d.getMilliseconds();
  sliders.append(slider.element);

  // Remove the slider after it hits the end
  setTimeout(function() {
    slider.element.remove();
    slider = {}
  }, 1500);
}

window.onload = setup;

