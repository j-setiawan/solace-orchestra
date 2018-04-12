import env from '../../common/env'
import mqtt from'mqtt';
import './index.css';

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

function addTimedSlider(message) {
    let timeoutSeconds = message.play_time - message.current_time - sliderTimeSecs;
    if (timeoutSeconds < 1.5) {
        timeoutSeconds = 1.5;
    }

    setTimeout(function() {
        addSlider(message.id, message.track);
    }, timeoutSeconds * 1000);
}

function addDemoSlider(id, track, timeout) {
    setTimeout(function() {
        addSlider(id, track);
    }, timeout);
}

function buildSlider(id, track) {
    let slider = {};
    slider.element = document.createElement("div");
    slider.track = track;
    slider.id = id;
    slider.element.className +=
        "slider slider-anim-" + track + " track" + track + " shape color" + track;

    slider.addTime = Date.now();
    return slider;
}

function addSlider(id, track) {
    let sliders = document.getElementById("sliders");
    let slider = buildSlider(id, track);
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

addDemoSliders();