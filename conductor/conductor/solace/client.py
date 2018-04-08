import paho.mqtt.client as mqtt
from pathlib import Path


def on_connect(client, userdata, flags, rc):
    print("Connected with result code " + str(rc))


def print_on_message(client, userdata, msg):
    print(msg.topic + " " + str(msg.payload))


class SolaceMQTTClient:
    def __init__(self, username, password, url, port, on_message=print_on_message):
        self.client = mqtt.Client()
        self.client.on_connect = on_connect
        self.client.on_message = on_message
        self.client.username_pw_set(username, password=password)
        self.client.connect(url, int(port), 60)

    def publish(self, topic, body):
        self.client.publish(topic, body)

    def subscribe(self, topic):
        self.client.subscribe(topic)