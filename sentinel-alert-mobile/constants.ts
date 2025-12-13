import Constants from 'expo-constants';

// Intentar obtener la IP del host si estamos en desarrollo, sino usar una fija
// En un dispositivo físico, debes poner la IP manual de tu PC (ej. 192.168.1.50)
const HOST_IP = '192.168.100.18'; // <--- CAMBIA ESTO POR TU IP LOCAL REAL

const HOST_IP_SHINJI = '192.168.3.20'; // <--- CAMBIA ESTO POR TU IP LOCAL REAL
const HOST_SERVER = '34.71.123.19'; // <--- CAMBIA ESTO POR TU IP LOCAL REAL

export const DEFAULT_CONFIG = {
  // Broker MQTT público (WSS es necesario para web, pero TCP/WSS funcionan en nativo)
  mqttBrokerUrl: `ws://${HOST_SERVER}:9001`,
  mqttTopic: 'alerts',
  
  // Endpoint de subida
  // IMPORTANTE: En Android Emulator usa '10.0.2.2', en iOS Simulator 'localhost', 
  // en dispositivo físico usa la IP de tu PC.
  uploadEndpoint: `http://${HOST_IP}:5002/verify`
};

export const RECORDING_DURATION_MS = 3000; // 3 Segundos
