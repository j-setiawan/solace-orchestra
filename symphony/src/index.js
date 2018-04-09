import env from '../../common/env'
import mqtt from'mqtt';

const Instruments = require('webaudio-instruments');
const player = new Instruments();

const client  = mqtt.connect(env.broker.url, {
    username: env.broker.username,
    password: env.broker.password
});

const noteTranslator = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

client.on('message', function (topic, message) {
    let contents = JSON.parse(message.toString()).note_list[0];

    player.play(
        contents.program,        // instrument: 24 is "Acoustic Guitar (nylon)"
        contents.note,        // note: midi number or frequency in Hz (if > 127)
        0.5,       // velocity: 0..1
        0,         // delay in seconds
        0.5,       // duration in seconds
    )
});

client.on('connect', function () {
    console.log('Connected');
    client.subscribe("orchestra/default/+");
});

console.log("Supported instruments:");
console.log(player.names);