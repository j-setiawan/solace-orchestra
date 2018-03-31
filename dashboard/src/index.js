import env       from '../environment/env';
import jst       from './jayesstee';
import templates from './templates';

import './style.css';


// Fill in all the HTML from the templates
jst("body").appendChild(templates.page(
  {
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
    
  }
));



