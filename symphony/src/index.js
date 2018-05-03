import './index.scss';
import '../assets/solaceSymphonyInverted.png';
import Messaging      from "../../common/messaging";


const sliderTimeMs = 1500;
const colours = ['#0074d9', '#d83439', '#38b439', '#e9cd54', '#811ed1', '#e66224', '#e041ab'];

// Extracted from all current songs
// TODO: need to learn this from all conductors at start time rather than
// hardcoded
//const instruments = [0, 4, 16, 22, 24, 25, 26, 27, 28, 29, 30, 33, 35, 47, 48, 52, 56, 60, 68, 70, 71, 73, 74, 95, 120]
const instruments = [0, 4, 22, 24, 25, 28, 29, 30, 33, 40, 41, 42, 47, 48, 52, 55, 56, 57, 58, 60, 62, 65, 68, 69, 70, 71, 73, 74, 120];
const line_spacing = 20;
const allSliders = [];
const timeouts = [];

let hitNotes = {};
let playerNames = {};
let trackPositions = {};

function addPlayer(name, channel) {
    let playerDiv = document.getElementById("players");
    let channelIndex = 0;

    if (playerNames.hasOwnProperty(channel)) {
        channelIndex += Object.keys(playerNames[channel]).length;
    } else {
        playerNames[channel] = {};
    }

    let playerNameDiv = document.createElement("div");
    playerNameDiv.id = "player_name_" + name;
    playerNameDiv.className = "player-name";
    playerNameDiv.innerText = name + ": 0";
    playerNameDiv.style.position = "absolute";
    playerNameDiv.style.left = "440px";
    playerNameDiv.style.top = (270 - parseInt(trackPositions[channel][channelIndex].replace(/px/,"")))+"px";
    playerDiv.appendChild(playerNameDiv);

    playerNames[channel][name] =  playerNameDiv;
}

function updateScore(name, channel, score) {
    if (!playerNames[channel] || !playerNames[channel][name] || !score) {
        return;
    }
    playerNames[channel][name].innerText = name + ": " + score.percent + "%";
}

function addTimedSlider(message, delay) {
    let sliderDelay = delay - sliderTimeMs;

    timeouts.push(setTimeout(function () {
        addSlider(message.id, message.channel, message.track);
    }, sliderDelay));
}

function buildTracks(channel_list) {
    trackPositions = {};

    let playerDiv = document.getElementById("players");
    let lines = document.getElementById("lines");

    while (lines.firstChild) {
        lines.removeChild(lines.firstChild);
    }

    let trackPos = 274;
    let linePos = 280;

    for (let channel of channel_list) {
        trackPositions[channel.toString()] = [];

        for (let index of colours.keys()) {
            trackPos -= line_spacing;
            linePos -= line_spacing;

            trackPositions[channel.toString()].push(trackPos + "px");

            let line = document.createElement("div");
            line.id = "line-" + channel + "-" + index;
            line.className += "line";
            line.style.top = linePos + "px";

            lines.appendChild(line);
        }

        trackPos -= line_spacing;
        linePos -= line_spacing;
    }
}

function buildSlider(id, channel, track) {
    let slider = {};
    slider.element = document.createElement("div");
    slider.track = track;
    slider.id = id;
    slider.element.style.position = "absolute";
    slider.element.style.top = trackPositions[channel][Number(track) - 1];
    slider.element.className +=
        "slider slider-anim-" + track + " shape colour" + track;

    slider.addTime = Date.now();
    return slider;
}

function addSlider(id, channel, track) {
    let sliders = document.getElementById("sliders");
    let slider = buildSlider(id, channel, track);
    sliders.appendChild(slider.element);

    allSliders.push(slider);

    // Remove the slider after it hits the end
    timeouts.push(setTimeout(function () {
        slider.element.remove();
        slider.removeTime = Date.now();
        slider = {};
    }, sliderTimeMs));

    // Remove the event
    timeouts.push(setTimeout(function () {
        let index = allSliders.map(function (s) {
            return s.id;
        }).indexOf(id);
        allSliders.splice(index, 1);
    }, sliderTimeMs + 200));
}

class Symphony {
    constructor() {
        this.id = uuid();
        this.messaging = new Messaging(
            {
                callbacks: {
                    connected: (...args) => this.connected(...args),
                    start_song: (...args) => this.rxStartSong(...args),
                    stop_song: (...args) => this.rxStopSong(...args),
                    complete_song: (...args) => this.rxCompleteSong(...args),
                    score_update: (...args) => this.rxScoreUpdate(...args),
                    note: (...args) => this.rxNote(...args),
                    play_note: (...args) => this.rxPlayNote(...args),
                    note_list: (...args) => this.rxNoteList(...args),
                    reregister: (...args) => this.rxRegister(...args),
                    register_response: (...args) => this.rxRegisterResponse(...args),
                    player_start: (...args) => this.rxStartPlayer(...args),
                }
            }
        );

        // How much we penalize notes that weren't hit
        this.velocityDerateFactor = 8;

        // Map of channels that should be played full volume because there are no musicians
        this.activeChannels = {};

        console.log("Loading " + instruments.length + " instruments...");
        let lastProgress = 0;
        MIDI.loadPlugin({
            soundfontUrl: "midi/soundfont/MusyngKite/",
            instruments: instruments,
            onprogress: function(state, progress) {
                let percent = (progress*100.0).toFixed(0);
                if (percent - lastProgress > 9) {
                    console.log("Instrument loading progress: " + percent + "%");
                    lastProgress = percent;
                }
            },
            onsuccess: function() {
                console.log("Instruments Loaded!");
            }
        });
    }

    connected() {
        console.log("Connected to Solace Messaging");

        this.messaging.subscribe(
            "orchestra/theatre/default",
            "orchestra/theatre/default/" + this.messaging.WILDCARD,
            "orchestra/theatre/default/" + this.messaging.WILDCARD + "/play_note",
            "orchestra/theatre/default/score_update"
        );

        this.rxRegister();
    }

    rxRegister(topic, message) {
        this.messaging.sendMessage("orchestra/registration", {
            'msg_type':       'register',
            'component_type': 'symphony',
            'name':           'symphony_' + this.id
        });
    }

    rxRegisterResponse(topic, message) {

    }

    rxNoMusicianNotification(topic, message) {
      this.noMusicianChannels[message.channel_id] = true;
      console.log("NO MUSICIANS:", this.noMusicianChannels);
    }

    rxStartSong(topic, message) {
        let channelList = [];
        this.activeChannels = {};
        for (let key of Object.keys(message.song_channels)) {
            channelList.push(message.song_channels[key]["channel_id"]);
        }

        buildTracks(channelList);

        this.messaging.sendResponse(message, {});
    }

    rxStartPlayer(topic, message) {
        // Remove players for now until they are fixed
        //addPlayer(message.name, message.channel_id);
        this.activeChannels[message.channel_id] = true;
    }

    rxScoreUpdate(topic, message) {
        //updateScore(message.name, message.channel_id, message);
    }

    rxCompleteSong(topic, message) {
        this.rxStopSong(topic, message);
    }
  
    rxStopSong(topic, message) {
        let playerDiv = document.getElementById("players");
        while (playerDiv.firstChild) playerDiv.removeChild(playerDiv.firstChild);

        buildTracks([0]);
        hitNotes = {};
        playerNames = {};

        while(timeouts.length > 0) {
            clearTimeout(timeouts.pop());
        }

        while(allSliders.length > 0) {
            let slider = allSliders.pop();
            slider.element.remove();
            slider.removeTime = Date.now();
            slider = {};
        }
    }

    rxNote(topic, message) {
        for (let note of message.note_list) {
            note.current_time = new Date().getMilliseconds();
            note.play_time = note.current_time;
            addTimedSlider(note);
            if (note.program) {
                MIDI.programChange(note.channel, note.program);
            }
            MIDI.setVolume(note.channel, 127);
	    MIDI.noteOn(note.channel, note.note, 127, 0);
	    MIDI.noteOff(note.channel, note.note, 0 + 0.5);
        }
    }

    rxPlayNote(topic, message) {
        hitNotes[message.note] = 0;
    }

    rxNoteList(topic, message) {
        // console.log(message);
        let self = this;
        for (let note of message.note_list) {
            (function(note) {
                let safeNote = Object.assign({}, note);
                let delay = safeNote.play_time - self.messaging.getTime();

                addTimedSlider(safeNote, delay);

                timeouts.push(setTimeout(function () {
                    if (safeNote.program) {
                        MIDI.programChange(safeNote.channel, safeNote.program);
                    }
                    MIDI.setVolume(safeNote.channel, 127);
                    MIDI.noteOn(safeNote.channel, safeNote.note, !self.activeChannels[safeNote.channel] || hitNotes.hasOwnProperty(note.note_id) ? safeNote.velocity : safeNote.velocity/self.velocityDerateFactor, 0);
                    MIDI.noteOff(safeNote.channel, safeNote.note, safeNote.duration/1000);
                }, delay));
            })(note);
        }
    }
}

function uuid() {
    return 'xxxxxxxx'.replace(/[x]/g, function(c) {
        let r = Math.random() * 16 | 0, v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}

let symphony = new Symphony();
buildTracks([0]);
