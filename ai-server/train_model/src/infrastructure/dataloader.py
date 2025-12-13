import os
import glob
import numpy as np
import librosa
import tensorflow as tf
from tensorflow.keras.preprocessing.image import ImageDataGenerator
from sklearn.model_selection import train_test_split
import concurrent.futures
from src.config import VISION_DIR, AUDIO_DIR, IMG_SIZE, BATCH_SIZE, SEED

class VisionDataLoader:
    def get_generators(self):
        if not os.path.exists(VISION_DIR):
            raise FileNotFoundError(f"No se encontró: {VISION_DIR}")

        datagen = ImageDataGenerator(
            rescale=1./255, 
            rotation_range=20, 
            horizontal_flip=True, 
            validation_split=0.2
        )
        
        train_gen = datagen.flow_from_directory(
            VISION_DIR, target_size=IMG_SIZE, batch_size=BATCH_SIZE, 
            class_mode='binary', subset='training', seed=SEED
        )
        val_gen = datagen.flow_from_directory(
            VISION_DIR, target_size=IMG_SIZE, batch_size=BATCH_SIZE, 
            class_mode='binary', subset='validation', seed=SEED
        )
        return train_gen, val_gen

class AudioDataLoader:
    def _extract_mfcc(self, file_path):
        try:
            audio, sr = librosa.load(file_path, duration=3.0, sr=22050)
            target_len = int(sr * 3)
            if len(audio) < target_len:
                audio = np.pad(audio, (0, target_len - len(audio)), 'constant')
            elif len(audio) > target_len:
                audio = audio[:target_len]
            
            mfccs = librosa.feature.mfcc(y=audio, sr=sr, n_mfcc=40)
            return np.mean(mfccs.T, axis=0)
        except Exception as e:
            return None

    def _process_files(self, files, label):
        data, labels = [], []
        with concurrent.futures.ThreadPoolExecutor() as executor:
            results = list(executor.map(self._extract_mfcc, files))
            
        for res in results:
            if res is not None:
                data.append(res)
                labels.append(label)
        return data, labels

    def get_data_split(self):
        path_fire = os.path.join(AUDIO_DIR, '1')
        path_normal = os.path.join(AUDIO_DIR, '0')
        
        files_fire = glob.glob(os.path.join(path_fire, '*.wav'))
        files_normal = glob.glob(os.path.join(path_normal, '*.wav'))

        if not files_fire:
            raise FileNotFoundError(f"No hay audios en {AUDIO_DIR}")

        print(f"Procesando audios: {len(files_fire)} Fuego | {len(files_normal)} Normal")
        
        feat_fire, lab_fire = self._process_files(files_fire, 1)
        feat_norm, lab_norm = self._process_files(files_normal, 0)
        
        X = np.array(feat_fire + feat_norm)
        y = np.array(lab_fire + lab_norm)
        
        return train_test_split(X, y, test_size=0.2, random_state=SEED)