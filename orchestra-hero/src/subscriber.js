import solace from '../lib/solclient-debug.js';
import {hosturl, vpn, username, pass} from '../lib/credentials.js';

var TopicSubscriber = function initializeMessaging(msgHandler, topic) {

    var factoryProps = new solace.SolclientFactoryProperties();
    factoryProps.profile = solace.SolclientFactoryProfiles.version10;
    solace.SolclientFactory.init(factoryProps);
  
    // create session
    var session = solace.SolclientFactory.createSession({
      url: hosturl,
      vpnName: vpn,
      userName: username,
      password: pass
    });
  
    session.on(solace.SessionEventCode.MESSAGE, function (message) {
      let contents = message.getBinaryAttachment();
      console.log("Got a message", contents);
      message = JSON.parse(contents);
      msgHandler(message, 0);
    });
  
    session.on(solace.SessionEventCode.UP_NOTICE, function (sessionEvent) {
      console.log('Connected');
      session.subscribe(
        solace.SolclientFactory.createTopicDestination(topic),
        true, // generate confirmation when subscription is added successfully
        "orchestra/default/0", // use topic name as correlation key
        10000 // 10 seconds timeout for this operation
    );
  
    });
  
    session.on(solace.SessionEventCode.SUBSCRIPTION_OK, function (sessionEvent) {
      console.log('Subscribed');
    });
  
    try {
      session.connect();
    } catch (error) {
      console.log(error.toString());
    }
  
    return session;
  }
  
  export { TopicSubscriber };