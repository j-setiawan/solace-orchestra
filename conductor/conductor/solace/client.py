import paho.mqtt.client as mqtt
import random
import copy
import time
import pprint
import json
import re
import os
from pathlib import Path


class SolaceMQTTClient:
    
    def __init__(self, callbacks={}, connection_properties=str(os.path.expanduser('~')) + '/solace.cloud'):

        self.isConnected    = 0
        self.msgId          = 1
        self.myId           = str(random.randint(1, 2**32))
        self.callbacks      = callbacks
        self.pendingReplies = {}

        props = {}
        with open(connection_properties, "r") as f:
            for line in f:
                (key, val) = line.strip().split('=')
                props[key] = val

        self.client = mqtt.Client()

        def onConnect(client, userdata, flags, rc):
            self.onConnect(client, userdata, flags, rc)
        
        def onDisconnect(client, userdata, rc):
            print(rc)
        
        def onMessage(client, userdata, msg):
            self.processRxMessage(client, userdata, msg)

        def onLog(client, userdata, level, buf):
            print(buf)

        self.client.on_connect = onConnect
        self.client.on_disconnect = onDisconnect
        self.client.on_message = onMessage
        # self.client.on_log = onLog
        self.client.username_pw_set(props['username'], password=props['password'])
        self.client.connect(props['url'], int(props['port']), 20)

        self.client.loop_start()
        
    def publish(self, topic, body):
        self.client.publish(topic, body)

    def subscribe(self, topic):
        if type(topic) is list:
            for sub in topic:
                self.client.subscribe(sub)
        if type(topic) is str:
            print("Subscribing to: " + topic)
            self.client.subscribe(topic)
            
    def sendResponse(self, rxMessage, txMessage):
        topic                 = self.makeReplyTopic(rxMessage['client_id'])
        txMessage['msg_type'] = rxMessage['msg_type'] + "_response"
        txMessage['msg_id']   = rxMessage['msg_id']
        self.sendMessage(topic, txMessage)

    def sendMessage(self, topic, message, callback=None, timeout=0, retries=0):
        txMessage                 = copy.deepcopy(message)
        txMessage['client_id']    = self.myId
        txMessage['current_time'] = self.getTime()

        if (not('msg_id' in txMessage)):
            txMessage['msg_id'] = self.msgId
            self.msgId += 1

        if (not self.isConnected):
            raise NameError("Can't send a message before being connected")

        def timerExpiryHandler():
            msgInfo = self.pendingReplies[txMessage['msg_id']]
            if msgInfo.retries:
                self.client.publish(topic, payload=json.dumps(txMessage))
                msgInfo['timer'] = Timer(timeout/1000, timerExpiryHandler)
                msgInfo.timer.start()
                msgInfo.retries -= 1
            else:
                del self.pendingReplies[txMessage.msg_id]
                callback(txMessage, {'status': 'timeout'})
        
        if (callback):
            if (not timeout):
                timeout = 5000
            timer = Timer(timeout/1000, timerExpiryHandler)
            self.pendingReplies[txMessage.msg_id] = {
                'txMessage':   txMessage,
                'callback':    callback,
                'retries':     retries,
                'timer':       timer
            }
            timer.start()

        # print("Sending message to topic: " + topic)
        # pprint.pprint(txMessage)
        self.client.publish(topic, payload=json.dumps(txMessage))

    def getIsConnected(self):
        return self.isConnected

    def getTime(self):
        return int(time.time() * 1000)
    
        
    def onConnect(self, client, userdata, flags, rc):
        if rc != 0:
            raise NameError("Failed to connect: " + str(rc))

        self.isConnected = 1
        self.subscribe('orchestra/p2p/' + self.myId)
        self.subscribe('orchestra/broadcast')
        
        if 'connect' in self.callbacks:
            self.callbacks["connect"]()

    def processRxMessage(self, client, userdata, msg):
        payload = msg.payload.decode()
        # pprint.pprint(payload)
        try:
            rxMessage = json.loads(payload)
        except ValueError:
            print("Failed to parse message: ")
            print(payload)
            return
        
        if 'msg_type' not in rxMessage:
            print('Received message with no msg_type')
            return

        if 'client_id' not in rxMessage:
            print('Received message with no client_id')
            return
        
        if 'current_time' not in rxMessage:
            print('Received message with no current_time')
            return
        
        if 'msg_id' not in rxMessage:
            print('Received message with no msg_id')
            return

        msgType = rxMessage['msg_type']
        msgId   = rxMessage['msg_id']

        if msgType == "ping":
            self.sendResponse(rxMessage, {})
        elif re.search('_response', msgType) and msgId in self.pendingReplies:
            info = self.pendingReplies[msgId]
            info.timer.cancel()
            info.callback(info.txMessage, rxMessage)
        else:
            if msgType in self.callbacks:
                self.callbacks[msgType](msg.topic, rxMessage)
            else:
                print("Unhandled message type:" + msgType)

    def makeReplyTopic(self, clientId):
        return "orchestra/p2p/" + str(clientId)
