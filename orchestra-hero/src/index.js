import env       from '../../common/env';
import Messaging from '../../common/messaging';
import TimeRef from '../../common/TimeRef';
import '../assets/solaceSymphonyInverted.png';
import 'bootstrap';
import 'bootstrap/dist/css/bootstrap.min.css';
import '../css/hero.scss';
import $ from 'jquery';

var myId = 'orchestra-hero-' + uuid();

var theatreId = "default";
var channelId = "0";
var messaging;
var timeRef;
var syncReady = false;
var musicianName = '';

// Amount of time it takes the slider to slide down the track
var sliderTimeSecs = 1.5;
var publisher = {};

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
  mainLoop();
}

function mainLoop() {
  
  messaging = new Messaging(
    {
      callbacks: {
        connected:     (...args) => connected(...args),
        music_score:   (...args) => receiveMusicScore(...args),
        register_response: (...args) => registerResponse(...args),
        reregister: (...args) => reregister(...args),
        
      }
    }
  );
  
  timeRef = new TimeRef(messaging, 
    function(){
      syncReady = true;
      console.log('Sync Ready');
    });
  
  // Start the demo
  addDemoSliders();

  // Show the "get name" modal
  setTimeout(() => $('#getNameModal').modal('toggle'), 3200);
  $('#submitName').click(() => getName());
}

function getName() {
  musicianName = String($('#musician-name').val());
  if (musicianName !== "") {
    $('#getNameModal').modal('toggle');
    registerMusician(musicianName);
    enableButtons();
  }
}

function enableButtons() {
  document.getElementById("button1").addEventListener("click", () => buttonPress(1));
  document.getElementById("button2").addEventListener("click", () => buttonPress(2));
  document.getElementById("button3").addEventListener("click", () => buttonPress(3));
  document.getElementById("button4").addEventListener("click", () => buttonPress(4));
  document.getElementById("button5").addEventListener("click", () => buttonPress(5));
  document.getElementById("button6").addEventListener("click", () => buttonPress(6));
  document.getElementById("button7").addEventListener("click", () => buttonPress(7));
}

function connected() {
  console.log("Connected.");
  // Subscribe to theatreId and channelId
  var subscriberTopic = `orchestra/theatre/${theatreId}/${channelId}`;
  messaging.subscribe(
    "orchestra/broadcast",
    "orchestra/p2p/" + myId,
    subscriberTopic
  );
}

function receiveMusicScore(message) {
  // Sent by the conductor on a per channel basis to let all musicians know what to play and when to play it
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
  var publisherTopic = `orchestra/theatre/${theatreId}/${channelId}/note`;
  messageJSon.msg_type = "play_note";
  messaging.sendMessage(publisherTopic, messageJSon);
}

function publishSpontaneousNoteMessage(messageJSon) {
  // TODO: discuss topic to be used for spontaneous play
  var publisherTopic = `orchestra/theatre/${theatreId}/${channelId}/note`;
  messageJSon.msg_type = "music_score";
  messaging.sendMessage(publisherTopic, messageJSon);
}

function registerMusician(musicianName) {
  var publisherTopic = `orchestra/registration`;
  var messageJson = {
      msg_type:       'register',
      component_type: 'musician',
     client_id: myId,
     name: musicianName
  };
  messaging.sendMessage(publisherTopic, messageJson);
}

function addTimedSlider(message) {
  if (message.hasOwnProperty('note_list')) {
    message.note_list.forEach(function (noteMessage) {
      var currentTime = timeRef.getSyncedTime();
      var timeoutSeconds = noteMessage.play_time - noteMessage.current_time - sliderTimeSecs;
      if (timeoutSeconds < 1.5) {
        timeoutSeconds = 1.5;
      }

      setTimeout(function () {
        addSlider(noteMessage.id, noteMessage.track, noteMessage);
      }, timeoutSeconds * 1000);
    });
  }
}

function addDemoSlider(id, track, timeout) {
  setTimeout(function() {
    addSlider(id, track);
  }, timeout);   
}

function buildSlider(id, track, message) {
  var slider = {};
  slider.element = document.createElement("div");
  slider.track = track;
  slider.id = id;
  slider.message = message;
  slider.element.className +=
    "slider slider-anim-" + track + " track" + track + " shape color" + track;

  slider.addTime = Date.now();
  return slider;
}

function addSlider(id, track, message) {
  var sliders = document.getElementById("sliders");
  var slider = buildSlider(id, parseInt(track), message);
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

// Handle button presses on all tracks
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

  //var currentTime = Date.now();
  var currentTime = timeRef.getSyncedTime();

  if (slider != null) {
    slider.pressed = true;

    var timeOffset = 0;
    if (slider.removeTime != null) {
      timeOffset = currentTime - slider.removeTime;
      console.log("Too late by", currentTime - slider.removeTime);
    } else {
      timeOffset = -((slider.addTime + (sliderTimeSecs * 1000)) - currentTime);
      console.log("Too early by", (slider.addTime + (sliderTimeSecs * 1000)) - currentTime);
    }

    // Send the message
    if (slider.message != null) {
      var noteMsg = {
        client_id: myId,
        current_time: currentTime,
        msg_type: 'play_note',
        noteId: slider.message.noteId,
        time_offset: timeOffset
      };
      publishPlayNoteMessage(noteMsg);
    }

  } else {

    // There is no note attached to the button press
    // This is a spontaneous note
    console.log("Spontaneous note");

    // Generate a note based on which button is pressed
    var spontaneousNote = {
      client_id: myId,
      current_time: currentTime,
      msg_type: 'play_note',
      note_list: [
        {
          program: 0,
          track: track,
          noteid: noteArray[track - 1],
          channel: 0,
          duration: 750,
          play_time: currentTime
        }
      ]
    };

    publishSpontaneousNoteMessage(spontaneousNote);
  }
}

function uuid() {
  return 'xxxxxxxx'.replace(/[x]/g, function(c) {
    var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

$(document).ready(function(){
   setup();
});
