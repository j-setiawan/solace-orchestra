import jst       from '../../common/jayesstee';
import Messaging from '../../common/messaging';
import templates from './templates';
import $         from 'jquery';
import './style.css';

class TestClient {

  constructor() {
    this.myId = 'test';
    this.testSeqNum   = 0;
    
    this.messaging = new Messaging(
      {
        callbacks: {
          connected:     (...args) => this.connected(...args),
          start_song:    (...args) => this.rxStartSong(...args),
        }
      }
    );

    // Fill in all the HTML from the templates
    jst("body").appendChild(templates.page());

  }

  connected() {
    this.messaging.subscribe(
      'orchestra/orchestrabroadcast',
      'orchestra/p2p/' + this.myId,
    );
    console.log("Connected, triggering start_song");
    var publisherTopic = `orchestra/p2p/${this.myId}`;
    var messageJson = {
       'msg_type': 'start_song',
       'client_id': 'ABC',
       'component_type': 'musician',
       'name': 'CDE',
       'time_server_topic': 'orchestra/p2p/dashboard'
    };
    this.messaging.sendMessage(publisherTopic, messageJson, (txMessage, rxMessage) => this.response_received(txMessage, rxMessage));
  }

  rxStartSong(topic, message) {
    console.log("Received start_song message: ", message);
    this.displayTime();
    this.messaging.sendResponse(message, {status: 'ok'});
  }

  displayTime() {
    var AllNodes=document.getElementsByClassName("RealServerTime");
    // format Date and Time 
    var TimeToString=(new Date(this.messaging.getSyncedTime()).toTimeString().split(' ')[0] + '\n' +
        'Diff:' + this.messaging.getTimeOffset()) + '  Latency:' + this.messaging.getLatency();
    for(var ipos=0;ipos<AllNodes.length;ipos++){
        AllNodes[ipos].innerHTML=TimeToString;
    }

    window.setTimeout(() => {this.displayTime();}, 10);
  }

  response_received(txMessage, rxMessage) {
    console.log("Response received! Status:" + rxMessage.status);
  }
}

let testclient = new TestClient();

