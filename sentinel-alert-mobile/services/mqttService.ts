import mqtt, { MqttClient } from 'mqtt';
import { MqttConnectionState } from '../types';
import { Alert } from 'react-native';

type MessageCallback = (topic: string, message: any) => void;
type StatusCallback = (status: MqttConnectionState) => void;

class MqttService {
  private client: MqttClient | null = null;
  private onMessage: MessageCallback | null = null;
  private onStatus: StatusCallback | null = null;

  connect(brokerUrl: string, topic: string, onStatus: StatusCallback, onMessage: MessageCallback) {
    this.onStatus = onStatus;
    this.onMessage = onMessage;

    this.onStatus(MqttConnectionState.CONNECTING);

    try {
      this.client = mqtt.connect(brokerUrl, {
        keepalive: 60,
        clientId: 'react_sentinel_' + Math.random().toString(16).substr(2, 8),
        protocolId: 'MQTT',
        protocolVersion: 4,
        clean: true,
        reconnectPeriod: 1000,
        connectTimeout: 30 * 1000,
      });

      this.client.on('connect', () => {
        console.log('MQTT Connected');
        this.onStatus?.(MqttConnectionState.CONNECTED);
        this.client?.subscribe(topic, (err) => {
          if (err) {
            console.error('Subscription error:', err);
          } else {
            console.log(`Subscribed to ${topic}`);
          }
        });
      });

      this.client.on('reconnect', () => {
        console.log('MQTT Reconnecting...');
        this.onStatus?.(MqttConnectionState.CONNECTING);
      });

      this.client.on('error', (err) => {
        console.error('MQTT Error:', err);
        Alert.alert("MQTT Error", JSON.stringify(err));
        this.onStatus?.(MqttConnectionState.ERROR);
      });
      
      this.client.on('offline', () => {
        console.log('MQTT Offline -> Cliente sin conexión');
        Alert.alert("MQTT Offline", "Cliente no pudo conectarse al broker.");
        this.onStatus?.(MqttConnectionState.DISCONNECTED);
      });
      

      this.client.on('message', (receivedTopic, message) => {
        if (receivedTopic === topic) {
          try {
            const parsedMessage = JSON.parse(message.toString());
            this.onMessage?.(receivedTopic, parsedMessage);
          } catch (err) {
            console.error('Error parsing MQTT message:', err);
          }
        }
      });

    } catch (error) {
      console.error("MQTT Connection Exception:", error);
      this.onStatus(MqttConnectionState.ERROR);
    }
  }

  disconnect() {
    if (this.client) {
      this.client.removeAllListeners();
      this.client.end();
      this.client = null;
      this.onStatus?.(MqttConnectionState.DISCONNECTED);
    }
  }
}

export const mqttService = new MqttService();