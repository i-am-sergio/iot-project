import sys
import os

sys.path.append(os.path.join(os.path.dirname(__file__), 'src'))

from src.config import EPOCHS_VISION, EPOCHS_AUDIO
from src.infrastructure.dataloader import VisionDataLoader, AudioDataLoader
from src.domain.models import ModelFactory
from src.application.trainer import TrainerEngine

def main():
    print("=== SISTEMA DE ENTRENAMIENTO MODULAR (SOLID) ===")
    try:
        print("\n--- Iniciando Módulo de Visión ---")
        vis_loader = VisionDataLoader()
        train_gen, val_gen = vis_loader.get_generators()
        
        vis_model = ModelFactory.build_vision_model()
        
        vis_trainer = TrainerEngine("vision")
        vis_trainer.train(vis_model, train_gen, val_gen, epochs=EPOCHS_VISION)
    except Exception as e:
        print(f"Salto Visión por error: {e}")
    try:
        print("\n--- Iniciando Módulo de Audio ---")
        aud_loader = AudioDataLoader()
        X_train, X_test, y_train, y_test = aud_loader.get_data_split()
        aud_model = ModelFactory.build_audio_model()
        aud_trainer = TrainerEngine("audio")
        aud_trainer.train(aud_model, (X_train, y_train), (X_test, y_test), epochs=EPOCHS_AUDIO)
    except Exception as e:
        print(f"Salto Audio por error: {e}")
if __name__ == "__main__":
    main()