var factoryProps = new solace.SolclientFactoryProperties();
factoryProps.profile = solace.SolclientFactoryProfiles.version10;
solace.SolclientFactory.init(factoryProps);

hosturl="<Solace Cloud Web Messaging URL and Port";
vpn="<VPN>";
username="<USER>";
pass="<PASS>";

// create session
session = solace.SolclientFactory.createSession({
    url:      hosturl,
    vpnName:  vpn,
    userName: username,
    password: pass
});

let piano = document.getElementById("piano");
piano.style.display = 'flex';

function createKey(name) {
    let pianoKey = document.createElement("div");
    pianoKey.id = name;
    pianoKey.style.width = "50px";
    pianoKey.style.height = "200px";
    pianoKey.style.border = "1px solid black";
    piano.appendChild(pianoKey);
    return pianoKey;
}

function createKeys() {
    createKey('C');
    createKey('C#');
    createKey('D');
    createKey('D#');
    createKey('E');
    createKey('F');
    createKey('F#');
    createKey('G');
    createKey('G#');
    createKey('A');
    createKey('A#');
    createKey('B');
}

function submitChannel() {
    let channelInput = document.getElementById("channelInput");
    piano.removeChild(document.getElementById("channelForm"));
    piano.removeChild(document.getElementById("channelButton"));

    createKeys()

    session.subscribe(
        solace.SolclientFactory.createTopicDestination("orchestra/" + channelInput.value),
        true, // generate confirmation when subscription is added successfully
        "orchestra/" + channelInput.value, // use topic name as correlation key
        10000 // 10 seconds timeout for this operation
    );
}

session.on(solace.SessionEventCode.MESSAGE, function (message) {
    let contents = message.getBinaryAttachment();
    let pianoKey = document.getElementById(contents);
    pianoKey.style.background = "red";
    setTimeout(function(){
        pianoKey.style.background = "white";
    }, 100);
});

session.on(solace.SessionEventCode.UP_NOTICE, function (sessionEvent) {
    console.log('Connected');
});

session.on(solace.SessionEventCode.SUBSCRIPTION_OK, function (sessionEvent) {
   console.log('Subscribed');
});

try {
    session.connect();
} catch (error) {
    console.log(error.toString());
}