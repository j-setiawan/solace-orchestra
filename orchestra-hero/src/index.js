import env from '../../common/env';
import Messaging from '../../common/messaging';
import jst from '../../common/jayesstee';
import '../assets/solaceSymphonyInverted.png';
import '../assets/background.png';
import 'bootstrap';
import 'bootstrap/dist/css/bootstrap.min.css';
import '../css/hero.scss';
import $ from 'jquery';
import templates from './templates';

var myId = 'orchestra-hero-' + uuid();

var scoreUpdater;
var theatreId = "default";
var channelId = 0;
var messaging;
var timeRef;
var syncReady = false;
var musicianName = '';

var hitThreshold = 200;
var notesTooCloseThreshold = 200;
var score = {};

// Amount of time it takes the slider to slide down the track
var sliderTimeSecs = 1.5;
var publisher = {};

var sliderTimeouts = [];

jst.makeGlobal();

// Midi note to play when the button is pressed for a track
// Track is the offset, note is the value;
var noteArray = [60, 62, 64, 65, 67, 69, 71];

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
  jst("body").replaceChild(templates.page(score));
  resetScore();
  mainLoop();
}

function mainLoop() {

  $(document).bind('touchmove', function (event) {
    event.preventDefault();
    return false;
  }); // turns off double-hit zoom
  //$('body').bind('touchend', function(event) { event.preventDefault(); $(this).click(); }); // turns off double-hit zoom
  document.ontouchmove = function (event) {
    event.preventDefault();
  };

  messaging = new Messaging({
      callbacks: {
        connected: (...args) => connected(...args),
        note_list: (...args) => receiveMusicScore(...args),
        start_song: (...args) => startSong(...args),
        stop_song: (...args) => stopSong(...args),
        register_response: (...args) => registerResponse(...args),
        reregister: (...args) => reregister(...args),
      }
    }

  );

  myId = messaging.myId;

  // Start the demo
  addDemoSliders();

  // Show the "get name" modal
  setTimeout(() => {
    $('#getNameModal').modal('toggle');
    $('#lines').hide();
    $('#buttons').hide();
  }, 3200);
  $('#submitName').click(() => getName());
  $('#musician-name').on("keypress", (e) => {
    if (e.keyCode == 13) {
      getName();
    }
  });
}

function getName() {
  musicianName = String($('#musician-name').val());
  if (musicianName !== "") {
    $('#getNameModal').modal('toggle');
    registerMusician(musicianName);
    $('#lines').show();
    $('#buttons').show();
    enableButtons();
  }
}

function startSong(topic, message) {
  console.log("Start song ", topic, message);
  resetScore();
  channelId = message.channel_id;
  var subscriberTopic = `orchestra/theatre/${theatreId}/${channelId}`;
  messaging.subscribe(
    subscriberTopic
  );

  messaging.sendMessage(`orchestra/theatre/${theatreId}`, {
    'msg_type': 'player_start',
    'channel_id': channelId,
    'name': musicianName
  });

  if (scoreUpdater) {
    clearInterval(scoreUpdater);
  }

  scoreUpdater = setInterval(function () {
    let total = score.hits + score.misses;
    let percent = total ? (100.0 * score.hits / total).toFixed(0) : "";
    messaging.sendMessage(`orchestra/theatre/${theatreId}/score_update`, {
      'msg_type': 'score_update',
      'channel_id': channelId,
      'name': musicianName,
      'hits': score.hits,
      'misses': score.misses,
      'percent': percent
    });
  }, 2500);

  messaging.sendResponse(message, {});

  // Show the countdown
  startCountdown();
}

function stopSong(topic, message) {
  console.log("Stop song ", topic, message);

  clearInterval(scoreUpdater);
  scoreUpdater = undefined;

  var subscriberTopic = `orchestra/theatre/${theatreId}/${channelId}`;
  messaging.unsubscribe(
    subscriberTopic
  );
  messaging.sendResponse(message, {});

  // Cleanup existing notes
  sliderTimeouts.forEach(timeout => clearTimeout(timeout));
  sliderTimeouts = [];

  // Remove all sliders
  let sliderDiv = document.getElementById("sliders");
  while (sliderDiv.firstChild) sliderDiv.removeChild(sliderDiv.firstChild);

  // Reset to original channel
  channelId = "0";
  
}

function enableButtons() {
  let eventName = "mousedown";
  if ('ontouchstart' in window || navigator.msMaxTouchPoints) {
    eventName = "touchstart";
  }
  document.getElementById("button1").addEventListener(eventName, (e) => buttonPress(e, 1));
  document.getElementById("button2").addEventListener(eventName, (e) => buttonPress(e, 2));
  document.getElementById("button3").addEventListener(eventName, (e) => buttonPress(e, 3));
  document.getElementById("button4").addEventListener(eventName, (e) => buttonPress(e, 4));
  document.getElementById("button5").addEventListener(eventName, (e) => buttonPress(e, 5));
  document.getElementById("button6").addEventListener(eventName, (e) => buttonPress(e, 6));
  document.getElementById("button7").addEventListener(eventName, (e) => buttonPress(e, 7));
}

function connected() {
  console.log("Connected.");
  // Subscribe to theatreId and channelId
  messaging.subscribe(
    "orchestra/theatre/default",
    "orchestra/broadcast",
    "orchestra/p2p/" + myId
  );
}

function receiveMusicScore(topic, message) {
  // Sent by the conductor on a per channel basis to let all musicians know what to play and when to play it
  console.log("Got score");
  addTimedSlider(message);
}

function registerResponse(message) {
  // Sent by dashboard as a response to registration
  console.log('Received register_response');
  console.log(message);
}

function reregister(message) {
  // Sent by dashboard when it starts
  console.log('Reregister');
  registerMusician(musicianName);
}

function publishPlayNoteMessage(messageJSon) {
  var publisherTopic = `orchestra/theatre/${theatreId}/${channelId}/play_note`;
  messageJSon.msg_type = "play_note";
  messaging.sendMessage(publisherTopic, messageJSon);
}

function publishSpontaneousNoteMessage(messageJSon) {
  // TODO: discuss topic to be used for spontaneous play
  var publisherTopic = `orchestra/theatre/${theatreId}/${channelId}`;
  messageJSon.msg_type = "note";
  messaging.sendMessage(publisherTopic, messageJSon);
}

function registerMusician(musicianName) {
  var publisherTopic = `orchestra/registration`;
  var messageJson = {
    msg_type: 'register',
    component_type: 'musician',
    client_id: myId,
    name: musicianName
  };
  messaging.sendMessage(publisherTopic, messageJson);
}

function addTimedSlider(message) {
  if (message.hasOwnProperty('note_list')) {
    let lastTime = -9999;
    let lastRiders;
    let lastNoteId;
    message.note_list.forEach(function (noteMessage) {

      // Add the slider 1.5 seconds ahead of time
      var currentTime = messaging.getSyncedTime();
      var latencyToSymphony = 200;
      var timeoutSeconds = noteMessage.play_time - currentTime - (sliderTimeSecs * 1000) - latencyToSymphony;
      if (timeoutSeconds < 0) {
        timeoutSeconds = 0;
      }

      if ((timeoutSeconds - lastTime) < notesTooCloseThreshold && lastRiders) {
        // Notes too close together in time - just add this note
        // as a rider on the last one
        console.log("Adding rider", noteMessage);
        lastRiders.push({
          message: noteMessage
        });
      } else {
        lastRiders = new Array();
        lastTime = timeoutSeconds;
        lastNoteId = noteMessage.note_id;
        console.log("Adding note ", noteMessage);
        (function (riders) {
          sliderTimeouts.push(setTimeout(function () {
            addSlider(noteMessage.note_id, noteMessage.track,
              noteMessage, riders);
          }, timeoutSeconds));
        })(lastRiders);
      }
    });
  }
}

function addDemoSlider(id, track, timeout) {
  setTimeout(function () {
    addSlider(id, track);
  }, timeout);
}

function buildSlider(id, track, message) {
  var slider = {};
  slider.element = document.createElement("div");
  slider.track = track;
  slider.id = id;
  slider.message = message;

  if (typeof message !== 'undefined') {
    slider.pressed = false;
  } else {
    slider.pressed = true;
  }
  slider.element.className +=
    "slider slider-anim-" + track + " track" + track + " shape color" + track;

  slider.addTime = Date.now();
  return slider;
}

function addSlider(id, track, message, riders) {
  var sliders = document.getElementById("sliders");
  var slider = buildSlider(id, parseInt(track), message);

  // Set the time to remove the slider
  slider.removeTime = Date.now() + sliderTimeSecs * 1000;
  slider.riders = riders;

  sliders.appendChild(slider.element);

  allSliders.push(slider);

  // Remove the slider after it hits the end
  setTimeout(function () {
    slider.element.remove();
    // slider = {};
  }, sliderTimeSecs * 1000);

  // Remove the event
  setTimeout(function () {
    var index = allSliders.map(function (s) {
      return s.id;
    }).indexOf(id);
    var slider = allSliders[index];
    if (!slider.pressed ||
      'offset' in slider && Math.abs(slider.offset) > hitThreshold) {
      score.misses++;
      score.inARow = 0;
    } else {
      score.hits++;
      score.inARow++;
    }
    score.total++;
    updateScore();
    allSliders.splice(index, 1);
  }, sliderTimeSecs * 1000 + 200);

  return slider;

}

// Handle button presses on all tracks
function buttonPress(e, track) {
  //console.log("Button press on track", track);

  e.preventDefault();

  var slider = allSliders.find(s => !s.pressed && s.track === track);

  var currentTime = Date.now();
  //var currentTime = messaging.getSyncedTime();

  if (slider != null) {
    slider.pressed = true;

    var timeOffset = 0;
    if (slider.removeTime != null) {
      timeOffset = currentTime - slider.removeTime;
      //console.log("Too late by", currentTime - slider.removeTime);
    } else {
      timeOffset = -((slider.addTime + (sliderTimeSecs * 1000)) - currentTime);
      //console.log("Too early by", (slider.addTime + (sliderTimeSecs * 1000)) - currentTime);
    }

    // Send the message
    if (slider.message != null) {
      var noteMsg = {
        client_id: myId,
        current_time: currentTime,
        msg_type: 'play_note',
        note: slider.message.note_id,
        time_offset: timeOffset
      };
      publishPlayNoteMessage(noteMsg);
      if (slider.riders.length) {
        for (let rider of slider.riders) {
          let riderMsg = {
            msg_type: 'play_note',
            note: rider.message.note_id,
            time_offset: timeOffset
          };
          publishPlayNoteMessage(riderMsg);
        }
      }
    }

  } else {

    // There is no note attached to the button press
    // This is a spontaneous note
    console.log("Spontaneous note");

    // Generate a note based on which button is pressed
    var spontaneousNote = {
      client_id: myId,
      current_time: currentTime,
      msg_type: 'note',
      note_list: [{
        program: 0,
        track: track,
        note: noteArray[track - 1],
        channel: 0,
        duration: 750,
        play_time: currentTime
      }]
    };

    publishSpontaneousNoteMessage(spontaneousNote);
  }

  return false;
}

function resetScore() {
  score = {
    hits: 0,
    misses: 0,
    total: 0,
    percent: 0,
    inARow: 0
  };
  updateScore();
}

function updateScore() {
  let scoreDisplay = "";

  let total = score.hits + score.misses;
  score.percent = (100.0 * score.hits / (total)).toFixed(0);

  if (total) {
    score.percent = (100.0 * score.hits / (total)).toFixed(0);
  } else {
    score.percent = 0;
  }

  jst.update("score", score);

}

function startCountdown() {
  countDownByOne(5);
}

function countDownByOne(num) {
  if (num <= 0) {
    jst.update("number", "");
    return;
  }
  jst.update("number", num.toString());
  var newNum = num - 1;
  setTimeout(() => countDownByOne(newNum), 1000);
}

function uuid() {
  return 'xxxxxxxx'.replace(/[x]/g, function (c) {
    var r = Math.random() * 16 | 0,
      v = c == 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

$(document).ready(function () {
  setup();
});