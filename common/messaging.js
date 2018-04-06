import env  from "./env";


export default class Messaging { 
  
  constructor(mqtt, opts) {
    this.isConnected    = false;
    this.msgId          = 1;
    this.myId           = Math.random().toString().substr(2);

    this.callbacks      = opts.callbacks;
    this.pendingReplies = {};

    this.client = mqtt.connect(
      env.broker.url, {
        username: env.broker.username,
        password: env.broker.password
      });

    let self = this;
    this.client.on("connect", function() {
      self._connected.apply(self);
    });

    this.client.on('message', function (topic, message) {
      self._processRxMessage.apply(self, [topic, message]);
    });
  }

  // Inject a list of subscriptions for this client
  subscribe(...subs) {
    for (let sub of subs) {
      this.client.subscribe(sub);
    }
  }

  // Send a response to a previously received message
  sendResponse(rxMessage, txMessage) {
    let topic          = this._makeReplyTopic(rxMessage.client_id);
    txMessage.msg_type = rxMessage.msg_type + "_response";
    txMessage.msg_id   = rxMessage.msg_id;
    this.sendMessage(topic, txMessage);
  }

  // Send a message to the specified topic
  //
  // This function will:
  //   * fill in the client_id
  //   * fill in the current_time
  //   * fill in the msg_id
  //
  // If a callback is specified, the message will be considered to be
  // a request reply. In this case it will:
  //   * Set the specified timeout for the message (default 5s)
  //   * Store the sent message and callback against the msg_id of the sent message
  //   * On reception of the response, it will call the callback with the
  //     sent message and received response.
  //   * On timeout, it will call the timeout with the received response set
  //     to {status: 'timeout'}
  //
  sendMessage(topic, message, callback, timeout) {
    message.client_id    = this.myId;
    message.current_time = (new Date()).getTime();

    if (!message.msg_id) {
      message.msg_id = this.msgId++;
    }
    
    if (!this.isConnected) {
      console.error("Not yet connected");
    }

    if (callback) {
      // Request-reply message
      if (!timeout) {
        timeout = 5000;
      }
      this.pendingReplies[message.msg_id] = {
        txMessage: message,
        callback:  callback,
        timer:     setTimeout(() => {
          delete this.pendingReplies[message.msg_id];
          callback(message, {status: "timeout"});
        }, timeout)
      };
    }

    // console.log("Publishing:", topic, message);
    this.client.publish(topic,
                        JSON.stringify(message));

  }

  // Are we connected right now
  getIsConnected() {
    return this.isConnected;
  }

  
  // Private methods

  _connected() {
    this.isConnected = true;
    this.subscribe(`orchestra/p2p/${this.myId}`);
    if (this.callbacks.connected) {
      this.callbacks.connected();
    }
  }

  _processRxMessage(topic, messageText) {
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
      this.sendResponse(message, {});
    }
    else if (msgType.match(/_response/) &&
             this.pendingReplies[msgId]) {
      let info = this.pendingReplies[msgId];
      clearTimeout(info.timer);
      info.callback(info.txMessage, message);
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

  _makeReplyTopic(clientId) {
    return `orchestra/p2p/${clientId}`;
  }

}

