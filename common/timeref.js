import messaging from './messaging';

const TimeServer = 'dashboard';

export default class TimeRef {

    constructor(messaging, syncready_callback) {
        this.messaging = messaging;
        this.callback = syncready_callback;

        this.syncRetries = 5;   // sync time sample size
        this.lowestLat = 500; // lowest latency starting point
        this._sendTimeRequest();
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

    _sendTimeRequest() {
        this.messaging.sendMessage(`orchestra/p2p/` + TimeServer,
            { msg_type: 'ping' },
            (txMessage, rxMessage) => {
                this._handleTimeResponse(txMessage, rxMessage);
            });
    }

    _handleTimeResponse(txMessage, rxMessage) {
        let latency = ((new Date()).getTime() - txMessage.current_time) / 2;
        console.log('Got ping response! Latency:' + latency + ', Reference time:' + rxMessage.current_time);
        if (latency < this.lowestLat) {
            console.log('Updating time offset');
            this.timeoffset = rxMessage.current_time - ((new Date()).getTime() + txMessage.current_time) / 2;
            this.lowestLat = latency;
        }
        // iterate or call callback when ready
        if (--this.syncRetries > 0) {
            this._sendTimeRequest();
        } else {
            if (this.callback) {
                this.callback();
            }
        }
    }

}