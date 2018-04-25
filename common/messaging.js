import env  from "./env";
//import mqtt from "../node_modules/mqtt";
import solace from './solclient-debug.js';


export default class Messaging { 
  
  constructor(opts) {
    this.isConnected    = false;
    this.WILDCARD       = "*"; // Wildcard for topic subscriptions in SMF
    // this.WILDCARD       = "+"; // Wildcard for topic subscriptions in MQTT
    this.msgId          = 1;
    this.myId           = Math.random().toString().substr(2);

    this.callbacks      = opts.callbacks;
    this.pendingReplies = {};

    this.sessionProps = {
      url:      env.broker.smfurl,
      vpnName:  env.broker.smfvpn,
      userName: env.broker.username,
      password: env.broker.password
    };

    var factoryProps = new solace.SolclientFactoryProperties();
    factoryProps.profile = solace.SolclientFactoryProfiles.version10;
    solace.SolclientFactory.init(factoryProps);

    this.client = solace.SolclientFactory.createSession( this.sessionProps );


    let self = this;
    this.client.on(solace.SessionEventCode.UP_NOTICE, function() {
      self._connected.apply(self);
    });

//    this.client.on(solace.SessionEventCode.SUBSCRIPTION_OK, function(sessionEvent) {
//      self._subscribed.apply(self, sessionEvent.correlationKey);
//    });

    this.client.on(solace.SessionEventCode.MESSAGE, function (message) {
      self._processRxMessage.apply( self, [ message.getDestination().getName(), message.getBinaryAttachment() ] );
    });

    this.client.connect();
  }

  // Inject a list of subscriptions for this client
  subscribe(...topics) {
    for (let topic of topics) {
      this.client.subscribe( solace.SolclientFactory.createTopicDestination(topic),
        //true, // request confirmation
        false,
        topic, // correlation key so we know which subscription suceedes
        1000 // subscribe timeout
      );
    }
  }

  // Remove a list of subscriptions for this client
  unsubscribe(...topic) {
    for (let topic of topics) {
      this.client.unsubscribe( solace.SolclientFactory.createTopicDestination(topic),
        //true, // request confirmation
        false,
        topic, // correlation key so we know which subscription suceedes
        1000 // subscribe timeout
      );
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
  sendMessage(topic, message, callback, timeout, retries) {
    let txMsg = Object.assign({}, message);
    txMsg.client_id    = this.myId;
    txMsg.current_time = this.getTime();

    if (!txMsg.msg_id) {
      txMsg.msg_id = this.msgId++;
    }
    
    if (!this.isConnected) {
      console.error("Not yet connected");
    }

    if (txMsg.msg_type !== "ping") {
      // console.log("Sending:", txMsg);
    }
    
    if (callback) {
      // Request-reply message
      if (!timeout) {
        timeout = 5000;
      }
      this.pendingReplies[txMsg.msg_id] = {
        txMessage: txMsg,
        callback:  callback,
        retries:   retries,
        timer:     setTimeout(() => {
          if (this.pendingReplies[txMsg.msg_id].retries) {
            this._publishText(topic,
                                JSON.stringify(txMsg));
            this.pendingReplies[txMsg.msg_id].retries--;
          }
          else {
            clearTimeout(this.pendingReplies[txMsg.msg_id].timer);
            delete this.pendingReplies[txMsg.msg_id];
            callback(message, {status: "timeout"});
          }
        }, timeout)
      };
    }


    // console.log("Publishing:", topic, message);
    this._publishText(topic, JSON.stringify(txMsg));

  }

  _publishText(topic, text) {
    var message = solace.SolclientFactory.createMessage();
    message.setDestination(solace.SolclientFactory.createTopicDestination(topic));
    message.setBinaryAttachment(text);
    message.setDeliveryMode(solace.MessageDeliveryModeType.DIRECT);
    this.client.send(message);

  }

  // Are we connected right now
  getIsConnected() {
    return this.isConnected;
  }

  getTime() {
    // TODO: Fill in syched time offset here
    return (new Date()).getTime();
  }
  
  /**
   * Returns the offset in milliseconds to be added to local time
   * to get the synchronized reference time
   */
  getTimeOffset() {
    return this.timeoffset;
  }
  
  /**
   * Returns the synchronized reference time
   */
  getSyncedTime() {
    return (new Date()).getTime() + this.timeoffset;
  }

  // Private methods

  _connected() {
    console.log("Yay, connected!");
    this.isConnected = true;
    this.subscribe(`orchestra/p2p/${this.myId}`);
    this.subscribe(`orchestra/broadcast`);
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
    // console.log("Got message: ", message);
    
    // Auto resend pings
    if (msgType === "ping") {
      this.sendResponse(message, {});
    }
    else if (msgType === "start_song") {
      // start time sync first, passing the start-song trigger topic and message
      this.syncRetries = 5;   // sync time sample size
      this.lowestLat = 500; // lowest latency starting point
      this.timeoffset = undefined;
      this._sendTimeRequest(topic, message);
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

  _sendTimeRequest(startSongTopic, startSongMessage) {
    this.sendMessage(startSongMessage.time_server_topic,
      { msg_type: 'ping' },
      (txMessage, rxMessage) => {
          this._handleTimeResponse(txMessage, rxMessage, startSongTopic, startSongMessage);
      });
  }

  _handleTimeResponse(txMessage, rxMessage, startSongTopic, startSongMessage) {
      let latency = ((new Date()).getTime() - txMessage.current_time) / 2;
      console.log('Got ping response! Latency:' + latency + ', Reference time:' + rxMessage.current_time);
      if (latency < this.lowestLat) {
          console.log('Updating time offset');
          this.timeoffset = rxMessage.current_time - ((new Date()).getTime() + txMessage.current_time) / 2;
          this.lowestLat = latency;
      }
      // iterate or call callback when ready
      if (--this.syncRetries > 0) {
          this._sendTimeRequest(startSongTopic, startSongMessage);
      } else {
          if (this.callbacks.start_song) {
            this.callbacks.start_song(startSongTopic, startSongMessage);
          }
        }
  }
}

