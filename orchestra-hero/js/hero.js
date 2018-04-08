// Amount of time it takes the slider to slide down the track
var sliderTimeSecs = 1.5;

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
    msgHandler(message, 0);
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

var allSliders = [];

function addDemoSliders() {
  addDemoSlider(1, 1, 0);
  addDemoSlider(2, 3, 100);
  addDemoSlider(3, 2, 200);
  addDemoSlider(4, 4, 300);
  addDemoSlider(5, 3, 400);
  addDemoSlider(6, 5, 500);
  addDemoSlider(7, 4, 600);
  addDemoSlider(8, 6, 700);
  addDemoSlider(9, 5, 800);
  addDemoSlider(10, 7, 900);
  addDemoSlider(11, 6, 1000);
  addDemoSlider(12, 4, 1100);
  addDemoSlider(13, 5, 1200);
  addDemoSlider(14, 3, 1300);
  addDemoSlider(15, 4, 1400);
  addDemoSlider(16, 2, 1500);
  addDemoSlider(17, 3, 1600);
  addDemoSlider(18, 1, 1700);
}

function setup() {
  mainLoop();
}

function mainLoop() {
  initializeMessaging(addTimedSlider);
  addDemoSliders();
}

function addTimedSlider(message) {
  var timeoutSeconds = message.play_time - message.current_time - sliderTimeSecs;
  if (timeoutSeconds < 1.5) {
    timeoutSeconds = 1.5;
  }

  setTimeout(function() {
    addSlider(message.id, message.track);
  }, timeoutSeconds * 1000);   
}

function addDemoSlider(id, track, timeout) {
  setTimeout(function() {
    addSlider(id, track);
  }, timeout);   
}

function buildSlider(id, track) {
  var slider = {};
  slider.element = document.createElement("div");
  slider.track = track;
  slider.id = id;
  slider.element.className +=
    "slider slider-anim-" + track + " track" + track + " shape color" + track;

  slider.addTime = Date.now();
  return slider;
}

function addSlider(id, track) {
  var sliders = document.getElementById("sliders");
  var slider = buildSlider(id, track);
  sliders.appendChild(slider.element);

  allSliders.push(slider);

  // Remove the slider after it hits the end
  setTimeout(function() {
    slider.element.remove();
    slider.removeTime = Date.now();
    slider = {};
  }, sliderTimeSecs * 1000);

  // Remove the event
  setTimeout(function() {
    var index = allSliders.map(function(s) { return s.id; }).indexOf(id);
    console.log("Removing slider at index", index);
    allSliders.splice(index, 1);    
  }, sliderTimeSecs * 1000 + 200);
}

function buttonPress(track) {
  console.log("Button press on track", track);
  // Check if there are any sliders for this track
  var index = allSliders.map(function(s) {
    if (s.pressed != null) {
     return null; 
    } else
    return s.track;
    }).indexOf(track);
  var slider = allSliders[index];

  if (slider != null) {
    slider.pressed = true;
    var currentTime = Date.now();

    if (slider.removeTime != null) {
      console.log("Too late by", currentTime - slider.removeTime);
    } else {
      console.log("Too early by", (slider.addTime + (sliderTimeSecs * 1000)) - currentTime);
    }

  } else {
    console.log("No slider!!");
  }
  //console.log(slider, currentTime);
}

window.onload = setup;

