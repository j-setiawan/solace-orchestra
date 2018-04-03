import mqtt from "mqtt";
import env  from "../environment/env";


export default class Messaging { 

  
  constructor(opts) {
    this.isConnected = false;
    this.myId        = Math.random().toString().substr(2);

    this.callbacks   = opts.callbacks;

    this.client = mqtt.connect(
      env.broker.url, {
        username: env.broker.username,
        password: env.broker.password
      });

    this.client.on("connect", function() {
      this.connected.apply(this);
    });

    this.client.on('message', function (topic, message) {
      this.rxMessage.apply(this, [topic, message]);
    });

  }

  connected() {
    this.isConnected = true;

    // Subscribe to all required topics
    for (let topic of [
      "orchestra/broadcast",
      "orchestra/p2p/" + this.myId,
      "orchestra/registration"
    ]);    
  }

  rxMessage(topic, messageText) {
    let message;
    try {
      message = JSON.parse(messageText);
    }
    catch(e) {
      console.warn("Failed to parse message:", message, e);
      return;
    }

    let msgType = message.msg_type;

    if (!msgType) {
      console.warn("Received message is missing msg_type");
      return;
    }

    let rxClientId = message.client_id;
    if (!rxClientId) {
      console.warn("Received message is missing client_id");
    }
    
    let currTime = message.current_time;
    if (!currTime) {
      console.warn("Received message is missing current_time");
    }
    
    let msgId = message.msg_id;
    if (!msgId) {
      console.warn("Received message is missing msg_id");
    }
    
    // Auto resend pings
    if (msgType === "ping") {
      this.sendMessage(message, {});
    }
    else {
      if (this.callbacks[msgType]) {
        this.callbacks[msgType](topic, message);
      }
      else {
        console.log("Unhandled message. Message type: ", msgType, "Full message:", message);
      }
    }
   
  }

  sendResponse(rxMessage, txMessage) {
    let topic          = this.replyTopic(rxMessage.client_id);
    txMessage.msg_type = rxMessage.msg_type + "_response";
    txMessage.msg_id   = rxMessage.msg_id;
    this.sendMessage(topic, txMessage);
  }
  
  sendMessage(topic, message) {
    message.client_id    = this.myId;
    message.current_time = (new Date()).getTime(); 
    
    if (!this.isConnected) {
      console.error("Not yet connected");
    }

    this.client.publish(topic,
                        JSON.stringify(message));

  }

  getIsConnected() {
    return this.isConnected;
  }

}

