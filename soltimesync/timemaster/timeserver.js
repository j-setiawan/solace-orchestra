var factoryProps = new solace.SolclientFactoryProperties();
factoryProps.profile = solace.SolclientFactoryProfiles.version10;
solace.SolclientFactory.init(factoryProps);

hosturl="ws://mr-91b692durd.messaging.solace.cloud:20003";
vpn="msgvpn-91b69337t3";
username="solace-cloud-client";
pass="rklmg2t4vfvdsngh02q6d1fqod";

timeservertopic="orchestra/timeserver/time"

// create session
session = solace.SolclientFactory.createSession({
    url:      hosturl,
    vpnName:  vpn,
    userName: username,
    password: pass
});

session.on(solace.SessionEventCode.UP_NOTICE, function (sessionEvent) {
    console.log('Connected');
    session.subscribe(
                        solace.SolclientFactory.createTopicDestination(timeservertopic),
                        true, // generate confirmation when subscription is added successfully
                        timeservertopic, // use topic name as correlation key
                        10000 // 10 seconds timeout for this operation
                    );
});

session.on(solace.SessionEventCode.MESSAGE, function (message) {
    var reply = solace.SolclientFactory.createMessage();
    let time = Date.now().toString();
    reply.setSdtContainer(solace.SDTField.create(solace.SDTFieldType.STRING, time));
    session.sendReply(message, reply);
    console.log('Replied. ' + reply.dump());
});

session.on(solace.SessionEventCode.SUBSCRIPTION_OK, function (sessionEvent) {
   console.log('Subscribed');
});

function ShowTime(){
    var AllNodes=document.getElementsByClassName("RealServerTime");
    // format Date and Time
    var referencetime = Date.now(); 
    var TimeToString=(new Date(referencetime)).toTimeString().split(' ')[0] + '.' + (referencetime % 1000);
    
    for(var ipos=0;ipos<AllNodes.length;ipos++){
        AllNodes[ipos].innerHTML=TimeToString;
    }
    
    window.setTimeout(ShowTime, 10);

}

try {
    session.connect();
} catch (error) {
    console.log(error.toString());
}

ShowTime();

