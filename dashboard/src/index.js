import env       from '../environment/env';
import jst       from './jayesstee';
import templates from './templates';
import Messaging from './messaging';

import './style.css';

let data =   {
  conductors: [
    {name: "conductor-1", numSongs: 5},
    {name: "conductor-2", numSongs: 7},
  ],
  songs: [
    {name: "Ode to Joy", length: 234, numChannels: 10},
    {name: "Row, Row, Row Your Boat", length: 123, numChannels: 7},
    {name: "Test song 1", length: 112, numChannels: 16},
    {name: "Test song 2", length: 153, numChannels: 11},
  ],
  players: [
    {name: "PlayerOne", hits: 234, misses: 15, percent: 91.3, rtt: 100},
    {name: "Sam", hits: 214, misses: 78, percent: 60.3, rtt: 180},
    {name: "Charlie", hits: 204, misses: 36, percent: 82.1, rtt: 3200},
    {name: "Killerz", hits: 124, misses: 45, percent: 66.2, rtt: 90},
    {name: "Debbers", hits: 54, misses: 13, percent: 63.9, rtt: 210},
    {name: "Magic Fingers", hits: 94, misses: 34, percent: 75.3, rtt: 220},
  ],
  status: {

  }
  
};

// Fill in all the HTML from the templates
jst("body").appendChild(jst.stamp("dashboard", templates.page, data));

setInterval(function() {

  data.conductors[0].numSongs++;
  //jst.reStamp("conductor");

  data.players[2].hits++;
  //jst.reStamp("player");

  data.songs[3].length++;
  jst.reStamp("dashboard");
  
}, 100000000000);



class Dashboard {
  constructor() {
    
    this.messaging = new Messaging({
      callbacks: {
        register: () => {
          this.register.apply(this, arguments);
        },
        start_song: () => {
          this.startSong.apply(this, arguments);
        },
        stop_song: () => {
          this.stopSong.apply(this, arguments);
        },
        complete_song: () => {
          this.completeSong.apply(this, arguments);
        },
        score_update: () => {
          this.scoreUpdate.apply(this, arguments);
        }
      }
    });

  }

  register(topic, message) {
    console.log("Received register message: ", message);

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

      if (this.conductorMap[message.name]) {
        
        let newSongs = [];

        if (this.conductorMap[message.name]) {
          // Already have a conductor with this name
          
          let conductor = this.conductorMap[message.name];
          if (conductor.client_id !== message.client_id) {
            // Duplicate name...
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
          let newSong = Object.assign({conductor_name: message.name}, song);
          newSongs.push(newSong);
        }

        this.songs = newSongs;

        this.conductorMap[message.name] = {
          name:     message.name,
          numSongs: message.song_list.length
        };
        this.conductors = Object.values(this.conductorMap);
        
      }
      
    }
    else if (message.component_type === "musician") {
      this.musicianMap[message.name] = {
        name: message.name,
        hits: 0,
        misses: 0,
        percent: 0,
        latency: 0
      };
      this.musicians = Object.values(this.musicianMap);
    }
    else if (message.component_type === "symphony") {
      this.symphonyMap[message.name] = {
        name: message.name,
        latency: 0
      };
      this.symphonies = Object.values(this.symphonyMap);
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
  

}


let dashboard = new Dashboard();



