import { GoogleGenAI, Type } from "@google/genai";
import { SensorData, AnalysisResult } from "../types";
import { GEMINI_MODEL } from "../constants";

// Initialize Gemini
// Note: In a real production app, you might proxy this through a backend.
// For this demo, we use the key directly from env.
const apiKey = process.env.API_KEY || '';
const ai = new GoogleGenAI({ apiKey });

export const analyzeFireRisk = async (
  data: SensorData, 
  hasAudio: boolean, 
  hasImage: boolean
): Promise<AnalysisResult> => {
  
  if (!apiKey) {
    console.warn("No API Key provided. Returning mock analysis.");
    return {
      isFire: true,
      confidence: 0.85,
      reasoning: "Simulated analysis (No API Key): High temperature and significant smoke levels detected consistent with fire signature."
    };
  }

  try {
    const prompt = `
      You are an AI Fire Detection System. Analyze the following IoT sensor telemetry and available media metadata.
      
      Telemetry:
      - Temperature: ${data.temperature.toFixed(1)}°C
      - Smoke Sensor Level: ${data.smokeLevel.toFixed(0)} (Scale 0-100)
      
      Media Available:
      - Image Capture: ${hasImage ? "Received" : "None"}
      - Audio Recording: ${hasAudio ? "Received (Crackling sounds detected)" : "None"}

      Determine if there is a high probability of fire. 
      Note: High temperatures coupled with high smoke density often indicate fire.
      
      Return JSON.
    `;

    const response = await ai.models.generateContent({
      model: GEMINI_MODEL,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            isFire: { type: Type.BOOLEAN },
            confidence: { type: Type.NUMBER, description: "Number between 0 and 1" },
            reasoning: { type: Type.STRING },
          },
          required: ["isFire", "confidence", "reasoning"]
        }
      }
    });

    const result = JSON.parse(response.text || '{}');
    
    return {
      isFire: result.isFire ?? false,
      confidence: result.confidence ?? 0,
      reasoning: result.reasoning ?? "Analysis failed to produce reasoning."
    };

  } catch (error) {
    console.error("Gemini Analysis Error:", error);
    return {
      isFire: false,
      confidence: 0,
      reasoning: "Error connecting to AI analysis service."
    };
  }
};