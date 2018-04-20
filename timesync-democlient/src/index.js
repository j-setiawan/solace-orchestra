import jst       from '../../common/jayesstee';
import Messaging from '../../common/messaging';
import TimeRef   from '../../common/timeref';
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
    this.timeref = new TimeRef(this.messaging, () => this.time_synced());
  }

  time_synced() {
    var AllNodes=document.getElementsByClassName("RealServerTime");
    // format Date and Time 
    var TimeToString=(new Date(this.timeref.getSyncedTime()).toTimeString().split(' ')[0] + '\n' +
        'Diff:' + this.timeref.getTimeOffset());
    for(var ipos=0;ipos<AllNodes.length;ipos++){
        AllNodes[ipos].innerHTML=TimeToString;
    }

    window.setTimeout(() => {this.time_synced();}, 10);

  }
}

let testclient = new TestClient();

