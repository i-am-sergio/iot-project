import React, { useState, useEffect, useCallback, useRef } from 'react';
import { 
  SystemStatus, 
  SensorData, 
  Thresholds, 
  SystemLog 
} from './types';
import { 
  DEFAULT_THRESHOLDS, 
  MAX_HISTORY_POINTS 
} from './constants';
import { analyzeFireRisk } from './services/geminiService';
import { SensorChart } from './components/SensorChart';
import { MediaPanel } from './components/MediaPanel';
import { SystemLogs } from './components/SystemLogs';
import { 
  AlertTriangle, 
  ShieldCheck, 
  Thermometer, 
  Activity, 
  Settings,
  Flame,
  CloudFog
} from 'lucide-react';

export default function App() {
  // --- State ---
  const [status, setStatus] = useState<SystemStatus>(SystemStatus.NORMAL);
  const [thresholds, setThresholds] = useState<Thresholds>(DEFAULT_THRESHOLDS);
  const [sensorHistory, setSensorHistory] = useState<SensorData[]>([]);
  const [logs, setLogs] = useState<SystemLog[]>([]);
  const [isSimulatingCapture, setIsSimulatingCapture] = useState(false);
  const [aiAnalysis, setAiAnalysis] = useState<string | null>(null);
  const [simulateFireMode, setSimulateFireMode] = useState(false);

  // Refs for logic that shouldn't trigger re-renders or dependencies issues
  const statusRef = useRef(status);
  statusRef.current = status;

  // --- Helpers ---
  const addLog = useCallback((message: string, type: SystemLog['type'] = 'info') => {
    setLogs(prev => [
      ...prev, 
      { id: Math.random().toString(36), timestamp: new Date(), message, type }
    ]);
  }, []);

  // --- Sensor Simulation Loop ---
  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now();
      
      // Generate Data
      // If simulateFireMode is true, ramp up Temp and Smoke
      let temp, smoke;

      if (simulateFireMode) {
         temp = 60 + Math.random() * 30; // 60-90 C
         smoke = 60 + Math.random() * 40; // 60-100 (High Smoke)
      } else {
         temp = 20 + Math.random() * 5; // 20-25 C
         smoke = Math.random() * 15; // 0-15 (Low Smoke)
      }

      const newData: SensorData = {
        timestamp: now,
        temperature: temp,
        smokeLevel: smoke
      };

      setSensorHistory(prev => {
        const updated = [...prev, newData];
        if (updated.length > MAX_HISTORY_POINTS) return updated.slice(updated.length - MAX_HISTORY_POINTS);
        return updated;
      });

      // Threshold Logic (Only if not already confirmed or analyzing)
      if (statusRef.current === SystemStatus.NORMAL) {
        // Trigger if Temp exceeds Max OR Smoke exceeds Max
        if (newData.temperature > thresholds.temperature || newData.smokeLevel > thresholds.smokeLevel) {
          triggerRiskProtocol(newData);
        }
      }

    }, 1000);

    return () => clearInterval(interval);
  }, [simulateFireMode, thresholds]);

  // --- Core Logic Flows ---

  const triggerRiskProtocol = (data: SensorData) => {
    setStatus(SystemStatus.RISK);
    const reason = data.temperature > thresholds.temperature 
      ? `Temp High (${data.temperature.toFixed(1)}°C)` 
      : `Smoke Detected (${data.smokeLevel.toFixed(0)})`;

    addLog(`RISK DETECTED: ${reason}`, 'warning');
    
    // Simulate Server requesting Mobile App
    setTimeout(() => {
      requestMobileCapture(data);
    }, 1000);
  };

  const requestMobileCapture = async (data: SensorData) => {
    addLog("Requesting Smartphone Capture (Photo + Audio)...", 'info');
    setIsSimulatingCapture(true);
    
    // Simulate network delay and capture time
    setTimeout(async () => {
      setIsSimulatingCapture(false);
      addLog("Media Received. Initiating Deep Learning Analysis...", 'info');
      setStatus(SystemStatus.ANALYZING);
      
      // Call Gemini Service
      const result = await analyzeFireRisk(data, true, true);
      
      setAiAnalysis(result.reasoning);
      
      if (result.isFire) {
        setStatus(SystemStatus.CONFIRMED);
        addLog(`FIRE CONFIRMED: ${result.reasoning}`, 'alert');
        addLog("Alerts sent to WhatsApp, Telegram, Email.", 'success');
      } else {
        setStatus(SystemStatus.NORMAL); // Or keep at risk? Resetting for demo flow.
        addLog(`Analysis Negative: ${result.reasoning}`, 'success');
      }
      
    }, 3000);
  };

  const handleReset = () => {
    setSimulateFireMode(false);
    setStatus(SystemStatus.NORMAL);
    setAiAnalysis(null);
    addLog("System manually reset.", 'info');
  };

  // --- UI Components ---

  const latestData = sensorHistory[sensorHistory.length - 1] || { temperature: 0, smokeLevel: 0 };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 p-4 md:p-6 font-sans">
      
      {/* Header */}
      <header className="max-w-7xl mx-auto mb-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white flex items-center gap-3">
            <Flame className="text-orange-500 fill-orange-500" />
            PyroGuard <span className="text-slate-500 font-light">IoT Dashboard</span>
          </h1>
          <p className="text-slate-400 text-sm mt-1">Hybrid Fire Detection System • Explorer Kit + Smartphone AI</p>
        </div>
        
        <div className="flex items-center gap-4">
          <button 
            onClick={() => setSimulateFireMode(!simulateFireMode)}
            className={`px-4 py-2 rounded-lg font-medium text-sm transition-all ${
              simulateFireMode 
                ? 'bg-red-500/20 text-red-400 border border-red-500/50' 
                : 'bg-slate-800 text-slate-300 hover:bg-slate-700 border border-slate-700'
            }`}
          >
            {simulateFireMode ? 'Stop Simulation' : 'Simulate Fire Event'}
          </button>
          
          <div className={`px-4 py-2 rounded-lg font-bold flex items-center gap-2 border shadow-lg ${
            status === SystemStatus.NORMAL ? 'bg-emerald-500/10 border-emerald-500/50 text-emerald-400' :
            status === SystemStatus.RISK ? 'bg-amber-500/10 border-amber-500/50 text-amber-400 animate-pulse' :
            status === SystemStatus.ANALYZING ? 'bg-blue-500/10 border-blue-500/50 text-blue-400' :
            'bg-red-600 text-white animate-bounce border-red-500'
          }`}>
            {status === SystemStatus.NORMAL && <ShieldCheck className="w-5 h-5" />}
            {status === SystemStatus.RISK && <AlertTriangle className="w-5 h-5" />}
            {status === SystemStatus.ANALYZING && <Activity className="w-5 h-5 animate-spin" />}
            {status === SystemStatus.CONFIRMED && <Flame className="w-5 h-5 fill-white" />}
            {status}
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* LEFT COLUMN: SENSORS (7 cols) */}
        <div className="lg:col-span-7 space-y-6">
          
          {/* Metrics Cards */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-slate-900/50 p-4 rounded-xl border border-slate-800">
              <div className="flex items-center gap-2 text-slate-400 mb-2">
                <Thermometer className="w-4 h-4" />
                <span className="text-xs uppercase font-bold">Temperature</span>
              </div>
              <div className={`text-3xl font-mono font-bold ${latestData.temperature > thresholds.temperature ? 'text-red-400' : 'text-white'}`}>
                {latestData.temperature.toFixed(1)}°C
              </div>
              <div className="text-xs text-slate-500 mt-1">Threshold: &gt;{thresholds.temperature}°C</div>
            </div>
            
             <div className="bg-slate-900/50 p-4 rounded-xl border border-slate-800">
              <div className="flex items-center gap-2 text-slate-400 mb-2">
                <CloudFog className="w-4 h-4" />
                <span className="text-xs uppercase font-bold">Smoke Density</span>
              </div>
              <div className={`text-3xl font-mono font-bold ${latestData.smokeLevel > thresholds.smokeLevel ? 'text-orange-400' : 'text-white'}`}>
                {latestData.smokeLevel.toFixed(0)}
              </div>
              <div className="text-xs text-slate-500 mt-1">Threshold: &gt;{thresholds.smokeLevel} (0-100)</div>
            </div>
          </div>

          {/* Charts */}
          <div className="space-y-4">
            <SensorChart 
              data={sensorHistory} 
              dataKey="temperature" 
              color="#f43f5e" 
              threshold={thresholds.temperature} 
              label="Temperature History"
              unit="°C"
            />
            <SensorChart 
              data={sensorHistory} 
              dataKey="smokeLevel" 
              color="#fb923c" 
              threshold={thresholds.smokeLevel} 
              label="Smoke Density History"
              unit=""
            />
          </div>

          {/* Configuration Panel */}
          <div className="bg-slate-800 rounded-xl p-5 border border-slate-700">
            <div className="flex items-center gap-2 mb-4 text-white">
              <Settings className="w-5 h-5 text-slate-400" />
              <h3 className="font-semibold">IoT Triggers Configuration</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-xs text-slate-400 mb-1">Max Temperature Trigger (°C)</label>
                <input 
                  type="range" 
                  min="30" max="100" 
                  value={thresholds.temperature}
                  onChange={(e) => setThresholds({...thresholds, temperature: Number(e.target.value)})}
                  className="w-full accent-rose-500 h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer"
                />
                <div className="flex justify-between text-xs text-slate-500 mt-1">
                  <span>30°C</span>
                  <span className="text-white font-mono">{thresholds.temperature}°C</span>
                  <span>100°C</span>
                </div>
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1">Smoke Threshold (0-100)</label>
                <input 
                  type="range" 
                  min="0" max="100" step="5"
                  value={thresholds.smokeLevel}
                  onChange={(e) => setThresholds({...thresholds, smokeLevel: Number(e.target.value)})}
                  className="w-full accent-orange-500 h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer"
                />
                <div className="flex justify-between text-xs text-slate-500 mt-1">
                  <span>0</span>
                  <span className="text-white font-mono">{thresholds.smokeLevel}</span>
                  <span>100</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: STATUS & MEDIA (5 cols) */}
        <div className="lg:col-span-5 flex flex-col gap-6">
          
          {/* Media Feed */}
          <div className="h-80">
            <MediaPanel status={status} isSimulatingCapture={isSimulatingCapture} />
          </div>

          {/* AI Analysis Result */}
          {aiAnalysis && (
            <div className={`p-4 rounded-xl border ${status === SystemStatus.CONFIRMED ? 'bg-red-900/20 border-red-500/50' : 'bg-emerald-900/20 border-emerald-500/50'}`}>
              <h3 className="text-sm font-bold uppercase tracking-wider mb-2 flex items-center justify-between">
                <span>AI Analysis Report</span>
                <span className="text-[10px] bg-slate-800 px-2 py-0.5 rounded text-slate-300">Gemini 2.5</span>
              </h3>
              <p className="text-sm leading-relaxed text-slate-300">
                {aiAnalysis}
              </p>
            </div>
          )}

          {/* System Logs */}
          <div className="flex-1 min-h-[200px]">
            <SystemLogs logs={logs} />
          </div>

          {/* Reset Button (Only visible if not normal) */}
          {status !== SystemStatus.NORMAL && (
            <button 
              onClick={handleReset}
              className="w-full py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-600 rounded-xl transition-colors font-medium"
            >
              Reset System State
            </button>
          )}

        </div>
      </main>
    </div>
  );
}