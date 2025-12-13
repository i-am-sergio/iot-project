export const DEFAULT_THRESHOLDS = {
  temperature: 50, // Celsius
  smokeLevel: 40, // 0-100 arbitrary unit
};

export const MAX_HISTORY_POINTS = 30; // Seconds of data to keep on chart

// Placeholders for simulated media
export const IMG_PLACEHOLDER_NORMAL = "https://picsum.photos/id/10/800/600"; // Nature/Forest
export const IMG_PLACEHOLDER_FIRE = "https://picsum.photos/id/56/800/600"; // Fire/Light related (approx)

// Using a newer model for reasoning
export const GEMINI_MODEL = "gemini-2.5-flash";

export const SECURITY_CAM_STREAM_URL = import.meta.env.VITE_STREAM_URL || "http://<your-ip-address>:8080/video";
export const AI_SERVER_URL = import.meta.env.VITE_AI_SERVER || "http://localhost:5002";
export const BROKER_URL = import.meta.env.VITE_BROKER_URL || "ws://localhost:9001";