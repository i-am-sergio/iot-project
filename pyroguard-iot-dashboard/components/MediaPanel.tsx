import React from 'react';
import { Camera, Mic, Volume2 } from 'lucide-react';
import { SystemStatus } from '../types';
import { IMG_PLACEHOLDER_NORMAL, IMG_PLACEHOLDER_FIRE } from '../constants';

interface MediaPanelProps {
  status: SystemStatus;
  isSimulatingCapture: boolean;
}

export const MediaPanel: React.FC<MediaPanelProps> = ({ status, isSimulatingCapture }) => {
  const isFireOrRisk = status === SystemStatus.CONFIRMED || status === SystemStatus.ANALYZING;
  
  // Choose image based on state
  const imageSrc = isFireOrRisk ? IMG_PLACEHOLDER_FIRE : IMG_PLACEHOLDER_NORMAL;

  return (
    <div className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden flex flex-col h-full">
      <div className="p-4 border-b border-slate-700 flex items-center justify-between">
        <h2 className="text-lg font-semibold flex items-center gap-2 text-white">
          <Camera className="w-5 h-5 text-sky-400" />
          Smartphone Feed
        </h2>
        <span className="text-xs bg-slate-700 text-slate-300 px-2 py-1 rounded">
          Device: Galaxy S23 (Mock)
        </span>
      </div>

      <div className="relative flex-grow bg-black min-h-[250px] flex items-center justify-center group">
        {isSimulatingCapture ? (
          <div className="text-center animate-pulse">
            <Camera className="w-12 h-12 text-slate-500 mx-auto mb-2" />
            <p className="text-slate-400 text-sm">Requesting Capture...</p>
          </div>
        ) : (
          <>
            <img 
              src={imageSrc} 
              alt="Latest Capture" 
              className={`w-full h-full object-cover transition-opacity duration-500 ${isFireOrRisk ? 'opacity-90' : 'opacity-60 grayscale'}`}
            />
            {/* Overlay Metadata */}
            <div className="absolute top-2 right-2 bg-black/60 backdrop-blur px-2 py-1 rounded text-xs text-white">
              {new Date().toLocaleTimeString()}
            </div>
          </>
        )}
      </div>

      <div className="p-4 bg-slate-900 border-t border-slate-700">
        <div className="flex items-center gap-3">
          <div className="bg-slate-800 p-2 rounded-full">
            <Mic className={`w-5 h-5 ${isFireOrRisk ? 'text-red-400 animate-pulse' : 'text-slate-500'}`} />
          </div>
          <div className="flex-1">
            <p className="text-sm font-medium text-slate-300">Ambient Audio</p>
            <p className="text-xs text-slate-500">
              {isSimulatingCapture ? "Recording..." : (isFireOrRisk ? "3.2s clip recorded (Crackling detected)" : "Monitoring... No trigger")}
            </p>
          </div>
          {isFireOrRisk && !isSimulatingCapture && (
            <button className="text-sky-400 hover:text-sky-300 transition-colors">
              <Volume2 className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};