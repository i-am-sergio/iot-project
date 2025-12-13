// services/sensorsService.ts
import mqtt, { MqttClient } from "mqtt"; 
let client: MqttClient | null = null;

export interface SensorPayload {
  temperature: number;
  // gas: number;
  timestamp: string; 
}

export const connectToSensors = (
  onMessage: (data: SensorPayload) => void
) => {
  client = mqtt.connect("ws://localhost:9001", {
     clientId: 'react_client_' + Math.random().toString(16).substring(2, 8),
     keepalive: 60,
  });

  client.on("connect", () => {
    console.log("MQTT conectado por WebSockets!");
    client?.subscribe("sensors");
  });

  client.on("message", (topic, msg) => {
    try {
      const payload = JSON.parse(msg.toString()) as SensorPayload;
      onMessage(payload);
    } catch (e) {
      console.error("Error parsing MQTT payload", e);
    }
  });
  
  client.on("error", (err) => {
      console.error("Connection error: ", err);
      client?.end();
  });
};

export const disconnectSensors = () => {
  client?.end();
};