import env       from '../environment/env';
import jst       from './jayesstee';
import templates from './templates';
import Messaging from './messaging';
import $         from 'jquery';

import './style.css';


class Dashboard {

  constructor() {
    this.conductors = [];
    this.songs      = [];
    this.musicians  = [];
    this.symphonies = [];

    this.conductorMap = {};
    this.musicianMap  = {};
    this.symphonyMap  = {};

    this.testSeqNum   = 0;
    
    this.messaging = new Messaging({
      callbacks: {
        connected: (...args) => {
          this.connected.apply(this, args);
        },
        register: (...args) => {
          this.register.apply(this, args);
        },
        start_song: (...args) => {
          this.startSong.apply(this, args);
        },
        stop_song: (...args) => {
          this.stopSong.apply(this, args);
        },
        complete_song: (...args) => {
          this.completeSong.apply(this, args);
        },
        score_update: (...args) => {
          this.scoreUpdate.apply(this, args);
        }
      }
    });

    // Fill in all the HTML from the templates
    jst("body").appendChild(jst.stamp("dashboard", templates.page, this));
    $(".add-conductor").on("click", e => {
      this.addConductor();
    });
    $(".add-musician").on("click", e => {
      this.addMusician();
    });
    $(".add-symphony").on("click", e => {
      this.addSymphony();
    });
    $(".inc-button").on("click", e => {
      this.incButton();
    });
    $(".clear-button").on("click", e => {
      this.clearButton();
    });
    
  }

  connected() {
    this.messaging.subscribe(
      "orchestra/broadcast",
      "orchestra/p2p/" + this.myId,
      "orchestra/registration"
    );
  }

  register(topic, message) {

    for (let checkField of ["component_type", "name"]) {
      if (!message[checkField]) {
        console.log("Received invalid register message. Missing ", checkField);
        this.messaging.sendResponse(message, {status: 'error', message: 'Missing ' + checkField});
        return;
      }
    }

    if (message.component_type === "conductor") {
      if (!message.song_list) {
        console.log("Received invalid register message. Missing song_list");
        this.messaging.sendResponse(message, {status: 'error', message: 'Missing song_list'});
        return;
      }

      let newSongs = [];

      if (this.conductorMap[message.name]) {

        // Already have a conductor with this name
        let conductor = this.conductorMap[message.name];
        
        if (conductor.client_id !== message.client_id) {
          console.warn("Duplicate conductor of name ", message.name);
        }
        
        // Remove all old songs for this conductor
        for (let song of this.songs) {
          if (song.conductor_name != message.name) {
            newSongs.push(song);
          }
        }
        
      }
      else {
        newSongs = this.songs;
      }

      for (let song of message.song_list) {
        let newSong = Object.assign({conductor_name: message.name,
                                     numChannels: song.song_channels.length},
                                    song);
        newSongs.push(newSong);
      }

      this.songs = newSongs;

      this.conductorMap[message.name] = {
        name:     message.name,
        numSongs: message.song_list.length
      };
      this.conductors = Object.values(this.conductorMap);
        
      //console.log("Registered:", this.songs, message);
      jst.update("conductor");
      jst.update("song");
      
    }
    else if (message.component_type === "musician") {

      this.musicianMap[message.name] = {
        name:    message.name,
        hits:    message.hits    || 0,
        misses:  message.misses  || 0,
        percent: message.percent || 0,
        latency: message.latency || 0
      };

      this.musicians = Object.values(this.musicianMap);
      jst.update("musician");
      
    }
    else if (message.component_type === "symphony") {

      this.symphonyMap[message.name] = {
        name: message.name,
        latency: 0
      };
      this.symphonies = Object.values(this.symphonyMap);
      jst.update("symphony");
      
    }
    else {

      console.warn("Unexpected component_type in register message:",
                   message.component_type, message);
      this.messaging.sendResponse(message,
                                  {status: 'error',
                                   message: 'Unexpected component_type: ' +
                                   message.component_type});
      
    }
    
    this.messaging.sendResponse(message, {status: 'ok'});

  }
  
  startSong(topic, message) {
    console.log("Received start_song message: ", message);
    this.messaging.sendResponse(message, {status: 'ok'});
  }
  
  stopSong(topic, message) {
    console.log("Received stop_song message: ", message);
  }
  
  completeSong(topic, message) {
    console.log("Received complete_song message: ", message);
  }
  
  scoreUpdate(topic, message) {
    console.log("Received scoreUpdate message: ", message);
  }

  //
  // Temp testing stuff
  //
  addConductor() {
    let songs = [];
    for (let i = 0; i < 10; i++) {
      songs.push(this.makeSong());
    }

    let msg = {
      msg_type:       "register",
      component_type: "conductor",
      name:           `my-conductor-${this.testSeqNum++}`,
      song_list:      songs
    };

    this.messaging.sendMessage("orchestra/registration", msg);
    
  }

  makeSong() {
    return {
      song_id:     this.testSeqNum++,
      song_name:   `Song number ${this.testSeqNum++}`,
      song_length: (Math.random() * 150).toFixed(0),
      song_channels: [
        {channel_id: this.testSeqNum++, instrument_name: "piano", num_notes: this.testSeqNum++},
        {channel_id: this.testSeqNum++, instrument_name: "piano", num_notes: this.testSeqNum++},
        {channel_id: this.testSeqNum++, instrument_name: "piano", num_notes: this.testSeqNum++}
      ]
    };
  }

  addMusician() {
    let msg = {
      msg_type:       "register",
      component_type: "musician",
      name:           `my-musician-${this.testSeqNum++}`,
      hits:           0,
      misses:         0,
      percent:        0
    };
    this.messaging.sendMessage("orchestra/registration", msg);
  }

  addSymphony() {
    let msg = {
      msg_type:       "register",
      component_type: "symphony",
      name:           `my-symphony-${this.testSeqNum++}`
    };
    this.messaging.sendMessage("orchestra/registration", msg);
  }

  incButton() {
    setInterval(() => {
      this.musicians[0].hits++;
      jst.update("musician");
    }, 100);
  }

  clearButton() {
    this.conductors = [];
    this.songs      = [];
    this.musicians  = [];
    this.symphonies = [];

    this.conductorMap = {};
    this.musicianMap  = {};
    this.symphonyMap  = {};

    jst.update("dashboard");
  }

}


let dashboard = new Dashboard();



