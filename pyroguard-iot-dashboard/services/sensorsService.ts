// services/sensorsService.ts
import mqtt, { MqttClient } from "mqtt"; 
let client: MqttClient | null = null;

interface RawSensorPayload {
  id: string; // ID del dispositivo
  ts: number; // timestamp en formato Unix
  temp: number; // temperatura
  gas: number; // nivel de gas
}

export interface SensorPayload {
  temperature: number;
  gas: number;
  timestamp: string;
  deviceId: string; 
}

// Function to map RawSensorPayload to SensorPayload
const mapRawToSensorPayload = (raw: RawSensorPayload): SensorPayload => {
  return {
    temperature: raw.temp,
    gas: raw.gas,
    timestamp: new Date(raw.ts * 1000).toISOString(), // Convertir Unix a ISO string
    deviceId: raw.id,
  };
};

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
      // 1. Parsear como RawSensorPayload (lo que llega del broker)
      const rawPayload = JSON.parse(msg.toString()) as RawSensorPayload;
      
      // 2. Mapear a SensorPayload
      const mappedPayload = mapRawToSensorPayload(rawPayload);
      
      // 3. Pasar el payload mapeado a la callback
      onMessage(mappedPayload);
    } catch (e) {
      console.error("Error parsing or mapping MQTT payload", e);
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