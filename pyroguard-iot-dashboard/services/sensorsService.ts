// services/sensorsService.ts
import { connect, MqttClient } from "mqtt";

let client: MqttClient | null = null;

export interface SensorPayload {
  temperature: number;
  gas: number;
  timestamp: number;
}

export const connectToSensors = (
  onMessage: (data: SensorPayload) => void
) => {
  client = connect("ws://localhost:1883/mqtt");

  client.on("connect", () => {
    console.log("MQTT conectado");
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
};

export const disconnectSensors = () => {
  client?.end();
};
