export enum SystemStatus {
  NORMAL = 'NORMAL',
  RISK = 'RISK',
  ANALYZING = 'ANALYZING',
  CONFIRMED = 'CONFIRMED'
}

export interface SensorData {
  timestamp: number;
  temperature: number; // in Celsius
  smokeLevel: number; // 0-100 arbitrary unit
}

export interface Thresholds {
  temperature: number;
  smokeLevel: number; // 0-100 arbitrary unit
}

export interface SystemLog {
  id: string;
  timestamp: Date;
  message: string;
  type: 'info' | 'warning' | 'alert' | 'success';
}

export interface AnalysisResult {
  isFire: boolean;
  confidence: number;
  reasoning: string;
}