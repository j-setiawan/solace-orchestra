import env       from '../../common/env';
import jst       from '../../common/jayesstee';
import Messaging from '../../common/messaging';
import TimeRef   from '../../common/timeref';
import templates from './templates';
import $         from 'jquery';
import './style.scss';

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
  }

  connected() {
    this.messaging.subscribe(
      'orchestra/orchestrabroadcast',
      'orchestra/p2p/' + this.myId,
    );
    this.timeref = new TimeRef(this.messaging, () => this.time_synced());
  }

  time_synced() {
    console.log('Calling getSyncedTime(), got:' + this.timeref.getSyncedTime() );
  }
}

let testclient = new TestClient();

