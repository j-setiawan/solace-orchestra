import mqtt from "mqtt";
import env  from "../environment/env";


export default class Messaging { 

  
  constructor(opts) {
    this.isConnected = false;
    this.msgId       = 1;
    this.myId        = Math.random().toString().substr(2);

    this.callbacks   = opts.callbacks;

    this.client = mqtt.connect(
      env.broker.url, {
        username: env.broker.username,
        password: env.broker.password
      });

    let self = this;
    this.client.on("connect", function() {
      self.connected.apply(self);
    });

    this.client.on('message', function (topic, message) {
      self.rxMessage.apply(self, [topic, message]);
    });

  }

  connected() {
    this.isConnected = true;
    if (this.callbacks.connected) {
      this.callbacks.connected();
    }
  }

  subscribe(...subs) {
    for (let sub of subs) {
      this.client.subscribe(sub);
    }
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
    let topic          = this.makeReplyTopic(rxMessage.client_id);
    txMessage.msg_type = rxMessage.msg_type + "_response";
    txMessage.msg_id   = rxMessage.msg_id;
    this.sendMessage(topic, txMessage);
  }
  
  sendMessage(topic, message) {
    message.client_id    = this.myId;
    message.current_time = (new Date()).getTime();

    if (!message.msg_id) {
      message.msg_id = this.msgId++;
    }
    
    if (!this.isConnected) {
      console.error("Not yet connected");
    }

    // console.log("Publishing:", topic, message);
    this.client.publish(topic,
                        JSON.stringify(message));

  }

  makeReplyTopic(clientId) {
    return `orchestra/p2p/${clientId}`;
  }

  getIsConnected() {
    return this.isConnected;
  }

}

