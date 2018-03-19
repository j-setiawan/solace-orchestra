function setup() {
  mainLoop();
}

function mainLoop() {
  addTimedSlider(1, 0);
  addTimedSlider(2, 200);
  addTimedSlider(3, 400);
  addTimedSlider(4, 600);
  addTimedSlider(5, 800);
  addTimedSlider(6, 1000);
  addTimedSlider(7, 1200);
  addTimedSlider(6, 1400);
  addTimedSlider(5, 1600);
  addTimedSlider(4, 1800);
  addTimedSlider(3, 2000);
  addTimedSlider(2, 2200);
  addTimedSlider(1, 2400);
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

