export enum AppStatus {
  IDLE = 'IDLE',
  ALERT_RECEIVED = 'ALERT_RECEIVED',
  RECORDING = 'RECORDING',
  UPLOADING = 'UPLOADING',
  COMPLETED = 'COMPLETED',
  ERROR = 'ERROR'
}

export enum MqttConnectionState {
  DISCONNECTED = 'DISCONNECTED',
  CONNECTING = 'CONNECTING',
  CONNECTED = 'CONNECTED',
  ERROR = 'ERROR'
}

export interface AlertMessage {
  id: string;
  timestamp: number;
  location?: string;
  severity: 'low' | 'medium' | 'high';
}

export interface AppConfig {
  mqttBrokerUrl: string;
  mqttTopic: string;
  uploadEndpoint: string;
}