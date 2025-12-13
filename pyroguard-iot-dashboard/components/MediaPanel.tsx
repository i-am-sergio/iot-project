// components/MediaPanel.tsx
import React, { useState, useEffect, useRef } from 'react';
import { Camera, Mic, Volume2, WifiOff, Aperture, Loader2 } from 'lucide-react';
import { SystemStatus } from '../types';
import { IMG_PLACEHOLDER_NORMAL, IMG_PLACEHOLDER_FIRE } from '../constants';
import fireSoundTest from '../assets/fire_sound_test.wav';


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
  // Referencia al elemento de video para capturar el frame
  const videoRef = useRef<HTMLVideoElement>(null);
  
  // Estado para manejar errores del stream
  const [streamError, setStreamError] = useState(false);
  // Estado para manejar la carga de la captura manual
  const [isUploading, setIsUploading] = useState(false);
  // Estado para mostrar el resultado del análisis
  const [verificationResult, setVerificationResult] = useState<{
    is_fire: boolean;
    validation_type: string;
    photo_confidence: string;
    audio_confidence: string;
  } | null>(null);

  // Resetear error si cambia la URL
  useEffect(() => {
    setStreamError(false);
  }, [streamUrl]);

  const showStream = streamUrl && !streamError;
  const fallbackImage = isFireOrRisk ? IMG_PLACEHOLDER_FIRE : IMG_PLACEHOLDER_NORMAL;

  // Función para capturar el frame del video o imagen
  const captureFrame = async (): Promise<Blob> => {
    return new Promise((resolve, reject) => {
      try {
        // Si es un stream MJPEG (imagen)
        if (imgRef.current) {
          const img = imgRef.current;
          const canvas = document.createElement('canvas');
          canvas.width = img.naturalWidth || img.width;
          canvas.height = img.naturalHeight || img.height;
          
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            reject(new Error('No se pudo obtener contexto del canvas'));
            return;
          }
          
          // Dibujar la imagen en el canvas
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          
          // Convertir a Blob
          canvas.toBlob((blob) => {
            if (blob) {
              resolve(blob);
            } else {
              reject(new Error('Error al convertir canvas a blob'));
            }
          }, 'image/jpeg', 0.95);
        } else {
          reject(new Error('No hay imagen disponible para capturar'));
        }
      } catch (error) {
        reject(error);
      }
    });
  };

  // Función para crear un audio simulado (en producción usarías el micrófono real)
  const createSimulatedAudio = async (): Promise<Blob> => {
    return new Promise(async (resolve, reject) => {
      try {
        // Hacer fetch al archivo importado
        const response = await fetch(fireSoundTest);
        if (!response.ok) {
          throw new Error(`Error cargando audio: ${response.status}`);
        }
        
        const audioBlob = await response.blob();
        console.log("Audio cargado:", audioBlob.size, "bytes, tipo:", audioBlob.type);
        resolve(audioBlob);
      } catch (error) {
        console.error("Error cargando archivo de audio:", error);
        // Fallback a audio simulado si falla
        const simulatedAudio = new Blob(['simulated-audio'], { 
          type: 'audio/wav' 
        });
        resolve(simulatedAudio);
      }
    });
  };

  // --- Función de Captura y Envío al AI Server ---
  const handleManualCapture = async () => {
    if (!streamUrl || isUploading) return;

    try {
      setIsUploading(true);
      setVerificationResult(null);
      console.log("Iniciando captura y verificación con AI server...");

      // 1. Capturar el frame actual
      console.log("Capturando frame...");
      const imageBlob = await captureFrame();
      console.log("Frame capturado:", imageBlob.size, "bytes");

      // 2. Crear/obtener audio (simulado por ahora)
      console.log("Preparando audio...");
      const audioBlob = await createSimulatedAudio();
      console.log("Audio preparado:", audioBlob.size, "bytes");

      // 3. Crear FormData para enviar al servidor
      const formData = new FormData();
      formData.append('photo', imageBlob, 'capture.jpg');
      formData.append('audio', audioBlob, 'recording.wav');

      // 4. Enviar al endpoint FastAPI
      console.log("Enviando al AI server...");
      const response = await fetch('http://localhost:5002/verify', {
        method: 'POST',
        body: formData,
        // Nota: NO establecer Content-Type manualmente, 
        // fetch lo hará automáticamente con el boundary correcto
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Error del servidor:', response.status, errorText);
        throw new Error(`Error del servidor: ${response.status} ${response.statusText}`);
      }

      const result = await response.json();
      console.log('✅ Respuesta del AI server:', result);
      
      setVerificationResult(result);

      // Mostrar resultado al usuario
      if (result.is_fire) {
        alert(`🚨 FIRE DETECTED!\nPhoto Confidence: ${result.photo_confidence}\nAudio Confidence: ${result.audio_confidence}`);
      } else {
        alert(`✅ No fire detected.\nPhoto Confidence: ${result.photo_confidence}\nAudio Confidence: ${result.audio_confidence}`);
      }

    } catch (error) {
      console.error("Error en captura y verificación:", error);
      alert("Error: No se pudo completar la verificación. Revisa la consola para más detalles.");
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden flex flex-col h-full relative">
       {/* Loading overlay para la subida manual */}
       {isUploading && (
        <div className="absolute inset-0 bg-black/70 z-50 flex flex-col items-center justify-center text-white backdrop-blur-sm">
          <Loader2 className="w-10 h-10 animate-spin text-sky-500 mb-2" />
          <p className="text-sm font-medium">Analizando con AI server...</p>
          <p className="text-xs text-slate-300 mt-1">Procesando imagen y audio</p>
        </div>
      )}

      {/* Resultado del análisis */}
      {verificationResult && !isUploading && (
        <div className={`absolute top-4 left-4 right-4 z-40 p-4 rounded-lg border backdrop-blur-sm ${
          verificationResult.is_fire 
            ? 'bg-red-900/80 border-red-600' 
            : 'bg-emerald-900/80 border-emerald-600'
        }`}>
          <div className="flex justify-between items-start">
            <div>
              <h3 className="font-bold text-white">
                {verificationResult.is_fire ? '🚨 Fire Detected' : '✅ No Fire'}
              </h3>
              <p className="text-sm text-slate-200">
                Type: {verificationResult.validation_type}
              </p>
            </div>
            <button 
              onClick={() => setVerificationResult(null)}
              className="text-white hover:text-slate-300"
            >
              ✕
            </button>
          </div>
          <div className="grid grid-cols-2 gap-2 mt-2 text-xs">
            <div className="bg-black/40 p-2 rounded">
              <span className="text-slate-300">Photo Confidence:</span>
              <div className={`font-bold ${
                parseFloat(verificationResult.photo_confidence) > 50 
                  ? 'text-red-300' 
                  : 'text-emerald-300'
              }`}>
                {verificationResult.photo_confidence}
              </div>
            </div>
            <div className="bg-black/40 p-2 rounded">
              <span className="text-slate-300">Audio Confidence:</span>
              <div className={`font-bold ${
                parseFloat(verificationResult.audio_confidence) > 50 
                  ? 'text-red-300' 
                  : 'text-emerald-300'
              }`}>
                {verificationResult.audio_confidence}
              </div>
            </div>
          </div>
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
              ref={imgRef} // Referencia para capturar el frame
              src={showStream ? streamUrl : fallbackImage} 
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
              // Para evitar problemas CORS en algunos navegadores
              crossOrigin="anonymous"
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
            {/* BOTÓN DE CAPTURA Y VERIFICACIÓN CON AI */}
            <button 
                onClick={handleManualCapture}
                disabled={!showStream || isUploading || isSimulatingCapture}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg font-medium text-sm transition-all ${
                    showStream && !isUploading
                    ? 'bg-purple-600 hover:bg-purple-500 text-white shadow-lg shadow-purple-500/20' 
                    : 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700'
                }`}
                title="Capture frame and verify with AI server"
                >
                {isUploading ? <Loader2 className="w-4 h-4 animate-spin"/> : <Aperture className="w-4 h-4" />}
                <span className="hidden md:inline">AI Verify</span>
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