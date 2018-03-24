var fs = require('fs');
var Midi = require('jsmidgen');

var file = new Midi.File();
var track = new Midi.Track();
file.addTrack(track);

var quarterNote = 120;
var dottedQuarterNote = 180;
var halfNote = 240;
var eighthNote = 60;

// Ode To Joy
track.tempo(80);
track.addNote(0, 'e4', quarterNote);
track.addNote(0, 'e4', quarterNote);
track.addNote(0, 'f4', quarterNote);
track.addNote(0, 'g4', quarterNote);
track.addNote(0, 'g4', quarterNote);
track.addNote(0, 'f4', quarterNote);
track.addNote(0, 'e4', quarterNote);
track.addNote(0, 'd4', quarterNote);
track.addNote(0, 'c4', quarterNote);
track.addNote(0, 'c4', quarterNote);
track.addNote(0, 'd4', quarterNote);
track.addNote(0, 'e4', quarterNote);
track.addNote(0, 'e4', dottedQuarterNote);
track.addNote(0, 'd4', eighthNote);
track.addNote(0, 'd4', halfNote);
track.addNote(0, 'e4', quarterNote);
track.addNote(0, 'e4', quarterNote);
track.addNote(0, 'f4', quarterNote);
track.addNote(0, 'g4', quarterNote);
track.addNote(0, 'g4', quarterNote);
track.addNote(0, 'f4', quarterNote);
track.addNote(0, 'e4', quarterNote);
track.addNote(0, 'd4', quarterNote);
track.addNote(0, 'c4', quarterNote);
track.addNote(0, 'c4', quarterNote);
track.addNote(0, 'd4', quarterNote);
track.addNote(0, 'e4', quarterNote);
track.addNote(0, 'd4', dottedQuarterNote);
track.addNote(0, 'c4', eighthNote);
track.addNote(0, 'c4', halfNote);

fs.writeFileSync('odeToJoy.mid', file.toBytes(), 'binary');

