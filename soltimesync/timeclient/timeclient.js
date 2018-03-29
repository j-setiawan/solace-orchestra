var factoryProps = new solace.SolclientFactoryProperties();
factoryProps.profile = solace.SolclientFactoryProfiles.version10;
solace.SolclientFactory.init(factoryProps);

hosturl="ws://mr-91b692durd.messaging.solace.cloud:20003";
vpn="msgvpn-91b69337t3";
username="solace-cloud-client";
pass="rklmg2t4vfvdsngh02q6d1fqod";

timerequesttopic="orchestra/timeserver/time"

// create session
session = solace.SolclientFactory.createSession({
    url:      hosturl,
    vpnName:  vpn,
    userName: username,
    password: pass
});

session.on(solace.SessionEventCode.UP_NOTICE, function (sessionEvent) {
    console.log('Connected, starting time sync');
    SyncTime();
});

try {
    session.connect();
} catch (error) {
    console.log(error.toString());
}

var SyncTimeframe = 1000 * 60 * 20; // 20 Mins
var LastSyncKey = 'LastSyncWithTimeServer';
var TimeDiffKey = 'Local-Server-TimeDiff';

var RetryMax = 3;
var RetryCount = 0;
var AcceptedDelay = 500;
var StartTime = 0;

if (window.localStorage.getItem(LastSyncKey) == null) {
    window.localStorage.setItem(LastSyncKey, '' + (new Date(0)));
}

LastSync = new Date(window.localStorage.getItem(LastSyncKey));

function SyncTime() {
    StartTime = new Date();

    console.log('Syncing time...');

    var requestText = 'Sample Request';
    var request = solace.SolclientFactory.createMessage();
    console.log('Sending request "' + requestText + '" to topic "' + timerequesttopic + '"...');
    request.setDestination(solace.SolclientFactory.createTopicDestination(timerequesttopic));
    request.setSdtContainer(solace.SDTField.create(solace.SDTFieldType.STRING, requestText));
    request.setDeliveryMode(solace.MessageDeliveryModeType.DIRECT);
    try {
        session.sendRequest(
            request,
            5000, // 5 seconds timeout for this operation
            function (session, message) {
                replyReceivedCb(session, message);
            },
            function (session, event) {
                requestFailedCb(session, event);
            },
            null // not providing correlation object
        );
    } catch (error) {
        console.log(error.toString());
    }
}

replyReceivedCb = function (session, message) {
    var sdtContainer = message.getSdtContainer();
    var servertime = 0;
    if (sdtContainer.getType() === solace.SDTFieldType.STRING) {
        servertime = Number(message.getSdtContainer().getValue());
        console.log('Received reply: "' + servertime + '"');
        TimeDiff=new Date(servertime) - (new Date()) + ((new Date()) - StartTime) / 2;
    
        if (++RetryCount < 3 && (new Date()) - StartTime > AcceptedDelay) {
           SyncTime();
        }
        else {
            console.log('Sync success!');
            window.localStorage.setItem(LastSyncKey, '' + (new Date()));
            window.localStorage.setItem(TimeDiffKey, TimeDiff);
            ShowTime();
        }
    }
};

// Callback for request failures
requestFailedCb = function (session, event) {
    console.log('Request failure: ' + event.toString());
};

function ShowTime(){
    var AllNodes=document.getElementsByClassName("RealServerTime");
    
    var diff = parseInt(window.localStorage.getItem(TimeDiffKey), 10);
    
    // format Date and Time 
    var TimeToString=(new Date(Date.now() + diff)).toTimeString().split(' ')[0];
    
    for(var ipos=0;ipos<AllNodes.length;ipos++){
        AllNodes[ipos].innerHTML=TimeToString;
    }
    
    window.setTimeout(ShowTime, 1000);

}

