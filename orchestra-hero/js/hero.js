// var factoryProps = new solace.SolclientFactoryProperties();
// factoryProps.profile = solace.SolclientFactoryProfiles.version10;
// solace.SolclientFactory.init(factoryProps);

// hosturl="<Solace Cloud Web Messaging URL and Port";
// vpn="<VPN>";
// username="<USER>";
// pass="<PASS>";

// // create session
// session = solace.SolclientFactory.createSession({
//     url:      hosturl,
//     vpnName:  vpn,
//     userName: username,
//     password: pass
// });

// session.on(solace.SessionEventCode.MESSAGE, function (message) {
//   let contents = message.getBinaryAttachment();
//   let pianoKey = document.getElementById(contents);
//   pianoKey.style.background = "red";
//   setTimeout(function(){
//       pianoKey.style.background = "white";
//   }, 100);
// });

// session.on(solace.SessionEventCode.UP_NOTICE, function (sessionEvent) {
//   console.log('Connected');
// });

// session.on(solace.SessionEventCode.SUBSCRIPTION_OK, function (sessionEvent) {
//  console.log('Subscribed');
// });

// try {
//   session.connect();
// } catch (error) {
//   console.log(error.toString());
// }


function setup() {
  mainLoop();
}

function mainLoop() {
  addTimedSlider(1, 0);
  addTimedSlider(2, 400);
  addTimedSlider(3, 800);
  addTimedSlider(4, 1200);
  addTimedSlider(5, 1600);
  addTimedSlider(6, 2000);
  addTimedSlider(7, 2400);
  addTimedSlider(6, 2800);
  addTimedSlider(5, 3200);
  addTimedSlider(4, 3600);
  addTimedSlider(3, 4000);
  addTimedSlider(2, 4400);
  addTimedSlider(1, 4800);
}

function addTimedSlider(track, timeout) {
  setTimeout(function() {
    addSlider(track);
  }, timeout);    
}
function addSlider(track) {
  var sliders = document.getElementById("sliders");
  var slider = document.createElement("div");
  slider.className +=
    "slider slider-anim-" + track + " track" + track + " shape color" + track;
  sliders.append(slider);

  // Remove the slider after it hits the end
  setTimeout(function() {
    slider.remove();
  }, 1500);
}

window.onload = setup;

