import env       from '../../common/env';
import jst       from '../../common/jayesstee';
import Messaging from '../../common/messaging';
import templates from './templates';
import mqtt      from "mqtt";
import $         from 'jquery';

import './style.scss';


class Dashboard {

  constructor() {
    this.conductors = [];
    this.songs      = [];
    this.musicians  = [];
    this.symphonies = [];

    this.conductorMap = {};
    this.musicianMap  = {};
    this.symphonyMap  = {};

    this.theatreId       = 1;
    this.startTimeOffset = 10000;

    this.pingTime        = 200;
    
    this.testSeqNum   = 0;
    
    this.messaging = new Messaging(
      mqtt,
      {
        callbacks: {
          connected:     (...args) => this.connected(...args),
          register:      (...args) => this.register(...args),
          start_song:    (...args) => this.startSong(...args),
          stop_song:     (...args) => this.stopSong(...args),
          complete_song: (...args) => this.completeSong(...args),
          score_update:  (...args) => this.scoreUpdate(...args)
        }
      }
    );

    // Temporary buttons...
    this.buttons = [
      {title: "Add Conductor", listener: e => {this.addConductor(e);}},
      {title: "Add Musician",  listener: e => {this.addMusician(e);}},
      {title: "Add Symphony",  listener: e => {this.addSymphony(e);}},
      {title: "Clear",         listener: e => {this.clearButton(e);}}
    ];

    // Fill in all the HTML from the templates
    jst("body").appendChild(jst.stamp("dashboard", templates.page, this));
    
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

    let componentAdded;
    
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
        let newSong = Object.assign(
          {
            conductor_name: message.name,
            numChannels:    song.song_channels.length
          },
          song);
        
        newSong.action = () => templates.songAction(this, newSong);
        newSong.events = {click: e => this.songActionClicked(newSong)};
        
        newSongs.push(newSong);
      }

      this.songs = newSongs;

      this.conductorMap[message.name] = {
        name:     message.name,
        numSongs: message.song_list.length
      };
      this.conductors = Object.values(this.conductorMap);

      componentAdded = this.conductorMap[message.name];
        
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

      componentAdded = this.musicianMap[message.name];

      this.musicians = Object.values(this.musicianMap);
      jst.update("musician");
      
    }
    else if (message.component_type === "symphony") {

      this.symphonyMap[message.name] = {
        name: message.name,
        latency: 0
      };

      componentAdded = this.symphonyMap[message.name];

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
      return;
      
    }

    componentAdded.component_type = message.component_type;
    componentAdded.client_id      = message.client_id;
    componentAdded.state          = "idle";
    
    this.addPinger(message, componentAdded);
    
    this.messaging.sendResponse(message, {status: 'ok'});

  }

  addPinger(message, component) {
    component.pingTimer = setInterval(() => {
      this.messaging.sendMessage(`orchestra/p2p/${component.client_id}`,
                                 {msg_type: "ping"},
                                 (txMessage, rxMessage) => {
                                   this.handlePingResponse(component, txMessage, rxMessage);
                                 }, 1900);
    }, this.pingTime); 
    
  }

  handlePingResponse(component, txMessage, rxMessage) {
    let latency;
    if (rxMessage.status === "timeout") {
      component.pingsMissed++;
      latency = "?";
    }
    else {
      component.pingsMissed = 0;
      latency = rxMessage.current_time - txMessage.current_time;
    }
    
    component.latency = latency;
    jst.update(component.component_type);
  }
  
  handleStartSongResponse(component, txMessage, rxMessage) {
    component.state = "ready";
    jst.update(component.component_type);
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
    console.log("Click");
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

  songActionClicked(song) {
    if (song.isPlaying) {
      song.isPlaying = false;
      this.sendStopSongMessage();
      this.setAllComponentState("idle");
      delete this.currentSong;
    }
    else if (this.currentSong) {
      // Do nothing - must stop current song first
    }
    else {
      this.currentSong   = song;
      song.isPlaying     = true;
      this.sendStartSongMessage(song);
    }
    jst.update("song");
  }

  setAllComponentState(state) {
    this.conductors.map(component => component.state = "idle");
    this.musicians.map(component => component.state = "idle");
    this.symphonies.map(component => component.state = "idle");

    jst.update("conductor");
    jst.update("musician");
    jst.update("symphony");
  }

  sendStartSongMessage(song) {
    // Send the message out to all registered components
    let msg = {
      msg_type:       "start_song",
      song_id:        this.currentSong.song_id,
      song_name:      this.currentSong.song_name,
      song_length:    this.currentSong.song_name,
      theatre_id:     this.theatreId,
      start_time:     this.messaging.getTime() + this.startTimeOffset
    };

    // Send to the specific conductor
    let conductor   = this.conductorMap[song.conductor_name];
    conductor.state = "waiting";
    this.messaging.sendMessage(`orchestra/p2p/${conductor.client_id}`,
                               msg,
                               (txMessage, rxMessage) => {
                                 this.handleStartSongResponse(conductor, txMessage, rxMessage);
                               }, 2000, 4);
    
    for (let component of this.symphonies) {
      component.state = "waiting";
      this.messaging.sendMessage(`orchestra/p2p/${component.client_id}`,
                                 msg,
                                 (txMessage, rxMessage) => {
                                   this.handleStartSongResponse(component, component, rxMessage);
                                 }, 2000, 4);
    }

    let channelId = 0;
    for (let component of this.musicians) {
      component.state = "waiting";
      msg.channel_id = channelId++;
      this.messaging.sendMessage(`orchestra/p2p/${component.client_id}`,
                                 msg,
                                 (txMessage, rxMessage) => {
                                   this.handleStartSongResponse(component, component, rxMessage);
                                 }, 2000, 4);
      if (channelId > song.numChannels) {
        channelId = 0;
      }
    }
    
  }

  sendStopSongMessage() {
    let msg = {
      msg_type:       "stop_song",
      song_id:        this.currentSong.song_id,
      song_name:      this.currentSong.song_name
    };
    this.messaging.sendMessage("orchestra/theatre/${this.theatreId}", msg);
  }

}


let dashboard = new Dashboard();



