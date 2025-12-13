import React, { useEffect, useRef } from 'react';
import { SystemLog } from '../types';
import { Terminal } from 'lucide-react';

interface SystemLogsProps {
  logs: SystemLog[];
}

export const SystemLogs: React.FC<SystemLogsProps> = ({ logs }) => {
  const bottomRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Solo hacer scroll automático si ya está cerca del final
    if (bottomRef.current && containerRef.current) {
      const container = containerRef.current;
      const isNearBottom = 
        container.scrollHeight - container.scrollTop - container.clientHeight < 100;
      
      if (isNearBottom) {
        bottomRef.current.scrollIntoView({ behavior: 'smooth' });
      }
    }
  }, [logs]);

  return (
    <div className="bg-slate-800 rounded-xl border border-slate-700 flex flex-col h-64 lg:h-[280px]"> {/* Altura fija */}
      <div className="p-3 border-b border-slate-700 flex items-center gap-2 shrink-0">
        <Terminal className="w-4 h-4 text-slate-400" />
        <h3 className="text-sm font-semibold text-slate-300">System Logs</h3>
      </div>
      
      {/* Contenedor principal con scroll */}
      <div 
        ref={containerRef}
        className="flex-1 overflow-y-auto p-2 font-mono text-xs scrollbar-thin scrollbar-thumb-slate-600 scrollbar-track-slate-800"
      >
        <div className="space-y-1">
          {logs.map((log) => (
            <div key={log.id} className="flex gap-2">
              <span className="text-slate-500 shrink-0">
                [{log.timestamp.toLocaleTimeString([], { 
                  hour: '2-digit', 
                  minute: '2-digit', 
                  second: '2-digit' 
                })}]
              </span>
              <span className={`${
                log.type === 'alert' ? 'text-red-400 font-bold' :
                log.type === 'warning' ? 'text-amber-400' :
                log.type === 'success' ? 'text-emerald-400' :
                'text-slate-300'
              }`}>
                {log.message}
              </span>
            </div>
          ))}
        </div>
        <div ref={bottomRef} />
      </div>
    </div>
  );
};