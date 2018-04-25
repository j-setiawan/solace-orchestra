import './index.scss';
import Messaging from "../../common/messaging"

const sliderTimeSecs = 1.5;
const Instruments = require('webaudio-instruments');
const player = new Instruments();
const colours = ['#0074d9', '#d83439', '#38b439', '#e9cd54', '#811ed1', '#e66224', '#e041ab'];

let hitNotes = {};

let trackPositions = {};
const line_spacing = 20;
const allSliders = [];

function addTimedSlider(message) {
    let timeoutSeconds = message.play_time - message.current_time - (sliderTimeSecs * 1000);

    setTimeout(function () {
        addSlider(message.id, message.channel, message.track);
    }, timeoutSeconds * 1000);
}

function buildTracks(channel_list) {
    trackPositions = {};

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
    setTimeout(function () {
        slider.element.remove();
        slider.removeTime = Date.now();
        slider = {};
    }, sliderTimeSecs * 1000);

    // Remove the event
    setTimeout(function () {
        let index = allSliders.map(function (s) {
            return s.id;
        }).indexOf(id);
        allSliders.splice(index, 1);
    }, sliderTimeSecs * 1000 + 200);
}

class Symphony {
    constructor() {
        this.noteHits = {};
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
                }
            }
        );
    }

    connected() {
        console.log("Connected")

        this.messaging.subscribe(
            "orchestra/theatre/default/+"
        );

        this.rxRegister()
    }

    rxRegister(topic, message) {
        this.messaging.sendMessage("orchestra/registration", {
            'msg_type':       'register',
            'component_type': 'symphony',
            'name':           'symphony_0'
        })
    }

    rxRegisterResponse(topic, message) {

    }

    rxStartSong(topic, message) {
        let channelList = Object.keys(message.song_channels).map(function (key) {
            return message.song_channels[key]["channel_id"];
        });

        buildTracks(channelList);

        this.messaging.sendResponse(message, {});
    }

    rxStopSong(topic, message) {
        buildTracks([0]);
        hitNotes = {};
    }

    rxNote(topic, message) {
        for (let note of message.note_list) {
            note.current_time = new Date().getMilliseconds();
            note.play_time = note.current_time;
            addTimedSlider(note);
            return player.play(
                note.program,   // instrument: 24 is "Acoustic Guitar (nylon)"
                note.note,      // note: midi number or frequency in Hz (if > 127)
                0.5,            // velocity: 0..1
                0,              // delay in seconds
                0.5,            // duration in seconds
            );
        }
    }

    rxPlayNote(topic, message) {
        hitNotes[message.note] = 0;
    }

    rxNoteList(topic, message) {
        for (let note of message.note_list) {
            let delay = (note.play_time - note.current_time) + (sliderTimeSecs * 1000);

            addTimedSlider(note);

            setTimeout(function () {
                return player.play(
                    note.program,   // instrument: 24 is "Acoustic Guitar (nylon)"
                    note.note,      // note: midi number or frequency in Hz (if > 127)
                    hitNotes.hasOwnProperty(note.note_id) ? 0.5 : 0.2,            // velocity: 0..1
                    0,              // delay in seconds
                    0.5,            // duration in seconds
                )
            }, delay);
        }
    }
}

let symphony = new Symphony();
buildTracks([0]);