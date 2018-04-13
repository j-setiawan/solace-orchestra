import env from '../../common/env'
import mqtt from'mqtt';
import './index.scss';

const sliderTimeSecs = 1.5;
const Instruments = require('webaudio-instruments');
const player = new Instruments();

const client  = mqtt.connect(env.broker.url, {
    username: env.broker.username,
    password: env.broker.password
});

client.on('message', function (topic, message) {
    let contents = JSON.parse(message.toString()).note_list[0];
    let delay = (contents.play_time - contents.current_time) * 1000 + (sliderTimeSecs * 1000);

    addTimedSlider(contents);

    setTimeout(function() { return player.play(
        contents.program,        // instrument: 24 is "Acoustic Guitar (nylon)"
        contents.note,        // note: midi number or frequency in Hz (if > 127)
        0.5,       // velocity: 0..1
        0,         // delay in seconds
        0.5,       // duration in seconds
    )}, delay);
});

client.on('connect', function () {
    console.log('Connected');
    client.subscribe("orchestra/theatre/default");
});

const allSliders = [];

function addTimedSlider(message) {
    let timeoutSeconds = message.play_time - message.current_time - sliderTimeSecs;
    if (timeoutSeconds < 1.5) {
        timeoutSeconds = 1.5;
    }

    setTimeout(function() {
        addSlider(message.id, message.channel, message.track);
    }, timeoutSeconds * 1000);
}

const colours = ['#0074d9', '#d83439', '#38b439', '#e9cd54', '#811ed1', '#e66224', '#e041ab'];
const trackPositions = {};

buildTracks([0, 1, 2, 3]);

function buildTracks(channel_list) {
    let lines = document.getElementById("lines");

    let trackPos = 273;
    let linePos = 280;

    for (let channel of channel_list) {
        trackPositions[channel.toString()] = [];

        for (let index of colours.keys()) {
            trackPos -= 40;
            linePos -= 40;

            trackPositions[channel.toString()].push(trackPos + "px");

            let line = document.createElement("div");
            line.id = "line-" + channel + "-" + (index + 1);
            line.className += "line line" + (index + 1);
            line.style.top = linePos + "px";

            lines.appendChild(line);
        }

        trackPos -= 40;
        linePos -= 40;
    }
}

function buildSlider(id, channel, track) {
    let slider = {};
    slider.element = document.createElement("div");
    slider.track = track;
    slider.id = id;
    slider.element.style.position = "absolute";
    console.log("Channel: " + channel + "  Track: " + track);
    slider.element.style.top = trackPositions[channel][Number(track)];
    slider.element.className +=
        "slider slider-anim-" + track + " track" + track + " shape color" + track;

    slider.addTime = Date.now();
    return slider;
}

function addSlider(id, channel, track) {
    let sliders = document.getElementById("sliders");
    let slider = buildSlider(id, channel, track);
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
        let index = allSliders.map(function(s) { return s.id; }).indexOf(id);
        allSliders.splice(index, 1);
    }, sliderTimeSecs * 1000 + 200);
}