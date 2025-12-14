import os
import numpy as np
import librosa
import tempfile
import subprocess
from typing import BinaryIO
from PIL import Image
from tensorflow.keras.models import load_model
from tensorflow.keras.preprocessing.image import img_to_array

from src.domain.ports import IDetector
from src.domain.models import DetectionResult, VerificationType

class KerasDetectorAdapter(IDetector):
    def __init__(self, vision_path='data/checkpoints/vision/best_model.h5', audio_path='data/checkpoints/audio/best_model.h5'):
        print("\n--- Inicializando Adaptador Keras ---")
        
        self.model_vision = load_model(vision_path, compile=False) if os.path.exists(vision_path) else None
        self.model_audio = load_model(audio_path, compile=False) if os.path.exists(audio_path) else None

        if not self.model_vision: print(f"Alerta: No se encontró modelo visión en {vision_path}")
        if not self.model_audio: print(f"Alerta: No se encontró modelo audio en {audio_path}")

        self._warmup_gpu()

    def _warmup_gpu(self):
        try:
            if self.model_vision:
                dummy_img = np.zeros((1, 224, 224, 3), dtype=np.float32)
                self.model_vision.predict(dummy_img, verbose=0)
            
            if self.model_audio:
                dummy_aud = np.zeros((1, 40), dtype=np.float32)
                self.model_audio.predict(dummy_aud, verbose=0)
            print("GPU/CPU Warmup completo.")
        except Exception as e:
            print(f"Error en warmup: {e}")

    def _procesar_imagen_bytes(self, image_file: BinaryIO):
        try:
            img = Image.open(image_file).convert('RGB')
            img = img.resize((224, 224))
            img_array = img_to_array(img)
            img_array = np.expand_dims(img_array, axis=0)
            img_array = img_array / 255.0
            return img_array
        except Exception as e:
            print(f"Error procesando imagen: {e}")
            return None

    def _procesar_audio_bytes(self, audio_file: BinaryIO):
        path_input = None
        path_wav = None
        try:
            if hasattr(audio_file, 'seek'):
                audio_file.seek(0)
            with tempfile.NamedTemporaryFile(delete=False, suffix=".m4a") as tmp:
                tmp.write(audio_file.read())
                tmp.flush()
                os.fsync(tmp.fileno())
                path_input = tmp.name
            path_wav = path_input.replace(".m4a", ".wav")
            command = [
                "ffmpeg", 
                "-y",              
                "-i", path_input,   
                "-vn",             
                "-ac", "1",        
                "-ar", "22050",     
                "-c:a", "pcm_s16le", 
                path_wav           
            ]
            subprocess.run(command, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, check=True)
            audio, sr = librosa.load(path_wav, sr=22050)
            if os.path.exists(path_input): os.unlink(path_input)
            if os.path.exists(path_wav): os.unlink(path_wav)
            max_val = np.max(np.abs(audio))
            if max_val == 0:
                print("Advertencia: Audio vacío o silencio absoluto después de conversión.")
                return None
            else:
                audio = audio / (max_val + 1e-6)
            target_len = int(22050 * 3)
            if len(audio) < target_len:
                audio = np.pad(audio, (0, target_len - len(audio)), 'constant')
            elif len(audio) > target_len:
                audio = audio[:target_len]
            mfccs = librosa.feature.mfcc(y=audio, sr=22050, n_mfcc=40)
            mfccs_processed = np.mean(mfccs.T, axis=0)
            return np.expand_dims(mfccs_processed, axis=0)
        except Exception as e:
            print(f"Error procesando audio: {e}")
            if path_input and os.path.exists(path_input): os.unlink(path_input)
            if path_wav and os.path.exists(path_wav): os.unlink(path_wav)
            return None

    def detect(self, image_file: BinaryIO, audio_file: BinaryIO) -> DetectionResult:
        vision_score = 0.0
        audio_score = 0.0

        if self.model_vision:
            processed_img = self._procesar_imagen_bytes(image_file)
            if processed_img is not None:
                vision_score = float(self.model_vision.predict(processed_img, verbose=0)[0][0])

        if self.model_audio:
            processed_audio = self._procesar_audio_bytes(audio_file)
            if processed_audio is not None:
                audio_score = float(self.model_audio.predict(processed_audio, verbose=0)[0][0])
        
        is_fire = False
        val_type = VerificationType.SAFE

        if vision_score > 0.98:
            val_type = VerificationType.FIRE_VISUAL
            is_fire = True
        elif audio_score > 0.9:
            val_type = VerificationType.ALERT_AUDIO
            is_fire = True
        elif vision_score > 0.5 and audio_score > 0.5:
            val_type = VerificationType.RISK_MIXED
            is_fire = True
        
        return DetectionResult(
            is_fire=is_fire,
            validation_type=val_type,
            photo_confidence=vision_score,
            audio_confidence=audio_score
        )