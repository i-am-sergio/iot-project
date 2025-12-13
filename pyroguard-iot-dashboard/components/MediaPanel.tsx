import React, { useState, useEffect, useRef } from 'react';
import { Camera, Mic, Volume2, WifiOff, Aperture, Loader2 } from 'lucide-react';
import { SystemStatus } from '../types';
import { IMG_PLACEHOLDER_NORMAL, IMG_PLACEHOLDER_FIRE } from '../constants';

interface MediaPanelProps {
  status: SystemStatus;
  isSimulatingCapture: boolean;
  streamUrl?: string;
}

export const MediaPanel: React.FC<MediaPanelProps> = ({ 
  status, 
  isSimulatingCapture, 
  streamUrl 
}) => {
  const isFireOrRisk = status === SystemStatus.CONFIRMED || status === SystemStatus.ANALYZING;
  
  // Referencia al elemento de imagen del DOM para poder capturarlo
  const imgRef = useRef<HTMLImageElement>(null);
  
  // Estado para manejar errores del stream
  const [streamError, setStreamError] = useState(false);
  // Estado para manejar la carga de la captura manual
  const [isUploading, setIsUploading] = useState(false);

  // Resetear error si cambia la URL
  useEffect(() => {
    setStreamError(false);
  }, [streamUrl]);

  const showStream = streamUrl && !streamError;
  const fallbackImage = isFireOrRisk ? IMG_PLACEHOLDER_FIRE : IMG_PLACEHOLDER_NORMAL;

  // --- Función de Captura y Envío ---
  const handleManualCapture = async () => {
    if (!streamUrl || isUploading) return;

    try {
      setIsUploading(true);
      console.log("Iniciando orden de captura remota...");

      // TRUCO: Las apps como IP Webcam sirven el video en /video
      // y la foto instantánea en /shot.jpg o /photo.jpg
      // Vamos a intentar convertir la URL del stream a la URL de foto.
      
      let snapshotUrl = streamUrl;
      if (streamUrl.includes('/video')) {
        snapshotUrl = streamUrl.replace('/video', '/shot.jpg');
      } else {
        // Si no sabemos la ruta, intentamos adivinar o usamos la misma
        // Nota: Si tu cámara usa otra ruta para fotos, ajústalo aquí.
        snapshotUrl = streamUrl.endsWith('/') ? streamUrl + 'shot.jpg' : streamUrl + '/shot.jpg';
      }

      console.log("Objetivo:", snapshotUrl);

      // Enviar la ORDEN al servidor Node.js (no la imagen, solo la URL)
      const response = await fetch('http://localhost:5002/capture-remote', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ cameraUrl: snapshotUrl }),
      });

      if (!response.ok) throw new Error(`Error server: ${response.statusText}`);
      
      const result = await response.json();
      console.log('✅ Server confirmó captura:', result);
      alert("¡Captura remota exitosa! Guardada en el servidor.");

    } catch (error) {
      console.error("Error solicitando captura:", error);
      alert("Error: El servidor no pudo conectar con la cámara.");
    } finally {
       setTimeout(() => setIsUploading(false), 500);
    }
  };

  return (
    <div className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden flex flex-col h-full relative">
       {/* Loading overlay para la subida manual */}
       {isUploading && (
        <div className="absolute inset-0 bg-black/70 z-50 flex flex-col items-center justify-center text-white backdrop-blur-sm">
          <Loader2 className="w-10 h-10 animate-spin text-sky-500 mb-2" />
          <p className="text-sm font-medium">Enviando captura para verificación...</p>
        </div>
      )}

      <div className="p-4 border-b border-slate-700 flex items-center justify-between">
        <h2 className="text-lg font-semibold flex items-center gap-2 text-white">
          <Camera className={`w-5 h-5 ${showStream ? 'text-green-400' : 'text-sky-400'}`} />
          {showStream ? 'Live Feed' : 'Smartphone Feed'}
        </h2>
        <span className="text-xs bg-slate-700 text-slate-300 px-2 py-1 rounded flex items-center gap-1">
           {showStream ? (
             <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"/> 
           ) : (
             <WifiOff className="w-3 h-3 text-slate-400"/>
           )}
          {/* Device: Galaxy S23 (Mock) */}
           Device: TP-Link Security Cam
        </span>
      </div>

      <div className="relative flex-grow bg-black min-h-[250px] flex items-center justify-center group overflow-hidden">
        {isSimulatingCapture ? (
          <div className="text-center animate-pulse">
            <Camera className="w-12 h-12 text-slate-500 mx-auto mb-2" />
            <p className="text-slate-400 text-sm">Requesting Capture...</p>
          </div>
        ) : (
          <>
            <img 
              ref={imgRef} // IMPORTANTE: Asignar la referencia aquí
              src={showStream ? streamUrl : fallbackImage} 
              // Para streams MJPEG locales a veces es necesario esto para que el canvas no se bloquee por CORS.
              // Si la imagen no se envía y da error de seguridad en consola, descomenta la siguiente línea:
              // crossOrigin="anonymous" 
              alt="Latest Capture" 
              className={`w-full h-full object-cover transition-opacity duration-500 
                ${!showStream && isFireOrRisk ? 'opacity-90' : ''} 
                ${!showStream && !isFireOrRisk ? 'opacity-60 grayscale' : ''}
                ${showStream ? 'opacity-100' : ''}
              `}
              onError={() => {
                console.warn("Fallo al conectar con la cámara IP, volviendo a placeholder.");
                setStreamError(true);
              }}
            />
            
            <div className="absolute top-2 right-2 bg-black/60 backdrop-blur px-2 py-1 rounded text-xs text-white">
              {showStream ? "LIVE" : new Date().toLocaleTimeString()}
            </div>
          </>
        )}
      </div>

      <div className="p-3 bg-slate-900 border-t border-slate-700 flex items-center justify-between gap-3">
        
        {/* Sección izquierda: Micrófono y estado */}
        <div className="flex items-center gap-3 flex-1">
            <div className="bg-slate-800 p-2 rounded-full">
                <Mic className={`w-5 h-5 ${isFireOrRisk ? 'text-red-400 animate-pulse' : 'text-slate-500'}`} />
            </div>
            <div className="flex-1 hidden sm:block">
                <p className="text-sm font-medium text-slate-300">Ambient Audio</p>
                <p className="text-xs text-slate-500 truncate">
                {isSimulatingCapture ? "Recording..." : (isFireOrRisk ? "Clip recorded (Crackling detected)" : "Monitoring...")}
                </p>
            </div>
        </div>

        {/* Sección derecha: Botones de acción */}
        <div className="flex items-center gap-2">
            {/* NUEVO BOTÓN DE CAPTURA MANUAL */}
             <button 
                onClick={handleManualCapture}
                disabled={!showStream || isUploading || isSimulatingCapture}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg font-medium text-sm transition-all ${
                    showStream && !isUploading
                    ? 'bg-sky-600 hover:bg-sky-500 text-white shadow-lg shadow-sky-500/20' 
                    : 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700'
                }`}
                title="Verify current frame with AI server"
                >
                {isUploading ? <Loader2 className="w-4 h-4 animate-spin"/> : <Aperture className="w-4 h-4" />}
                <span className="hidden md:inline">Verify Frame</span>
            </button>

            {isFireOrRisk && !isSimulatingCapture && (
                <button className="p-2 text-sky-400 hover:text-sky-300 transition-colors bg-slate-800 hover:bg-slate-700 rounded-lg border border-slate-700">
                <Volume2 className="w-5 h-5" />
                </button>
            )}
        </div>
      </div>
    </div>
  );
};