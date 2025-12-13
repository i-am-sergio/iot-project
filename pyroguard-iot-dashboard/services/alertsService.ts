// services/alertsService.ts
import mqtt, { MqttClient } from "mqtt"; 

let client: MqttClient | null = null;

export interface AlertPayload {
  id: string;
  ts: number;
  level: number;
  temp: number;
  gas: number;
  msg: string;
}

export interface AlertCallbackData {
  deviceId: string;
  timestamp: string;
  alertLevel: number;
  temperature: number;
  gasLevel: number;
  message: string;
  type: 'gas' | 'temperature' | 'fire' | 'other';
}

const mapMessageToType = (msg: string): AlertCallbackData['type'] => {
  if (msg.includes('gas')) return 'gas';
  if (msg.includes('temp') || msg.includes('temperature')) return 'temperature';
  if (msg.includes('fire')) return 'fire';
  return 'other';
};

const mapAlertPayload = (raw: AlertPayload): AlertCallbackData => {
  return {
    deviceId: raw.id,
    timestamp: new Date(raw.ts * 1000).toISOString(),
    alertLevel: raw.level,
    temperature: raw.temp,
    gasLevel: raw.gas,
    message: raw.msg,
    type: mapMessageToType(raw.msg)
  };
};

export const connectToAlerts = (
  onAlert: (data: AlertCallbackData) => void
) => {
  client = mqtt.connect("ws://localhost:9001", {
    clientId: 'react_alerts_' + Math.random().toString(16).substring(2, 8),
    keepalive: 60,
  });

  client.on("connect", () => {
    console.log("MQTT Alerts conectado por WebSockets!");
    client?.subscribe("alerts");
  });

  client.on("message", (topic, msg) => {
    try {
      const rawAlert = JSON.parse(msg.toString()) as AlertPayload;
      const alertData = mapAlertPayload(rawAlert);
      
      console.log(`🚨 Alerta recibida: ${alertData.message} (Nivel ${alertData.alertLevel})`);
      
      onAlert(alertData);
      
    } catch (e) {
      console.error("Error parsing or mapping MQTT alert payload", e);
    }
  });
  
  client.on("error", (err) => {
    console.error("Alerts connection error: ", err);
    client?.end();
  });
  
  client.on("close", () => {
    console.log("Conexión de alertas cerrada");
  });
};

export const disconnectAlerts = () => {
  if (client) {
    client.end();
    client = null;
  }
};