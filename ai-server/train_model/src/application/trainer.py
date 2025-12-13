import os
import tensorflow as tf
from tensorflow.keras.callbacks import ModelCheckpoint, EarlyStopping, CSVLogger
from src.config import CHECKPOINT_DIR, LOG_DIR, PATIENCE

class TrainerEngine:
    def __init__(self, model_name):
        self.model_name = model_name
        self.ckpt_dir = os.path.join(CHECKPOINT_DIR, model_name)
        os.makedirs(self.ckpt_dir, exist_ok=True)
        self.log_file = os.path.join(LOG_DIR, f"{model_name}_log.csv")

    def _get_callbacks(self):
        best_path = os.path.join(self.ckpt_dir, 'best_model.h5')
        
        cbs = [
            ModelCheckpoint(best_path, save_best_only=True, monitor='val_loss', mode='min', verbose=1),
            EarlyStopping(monitor='val_loss', patience=PATIENCE, restore_best_weights=False, verbose=1),
            CSVLogger(self.log_file, separator=',', append=False)
        ]
        return cbs

    def train(self, model, train_data, val_data, epochs):
        print(f"\n🚀 Iniciando entrenamiento: {self.model_name}")
        callbacks = self._get_callbacks()
        
        if isinstance(val_data, tuple):
            history = model.fit(
                train_data[0], train_data[1],
                validation_data=val_data,
                epochs=epochs,
                batch_size=32,
                callbacks=callbacks,
                verbose=1
            )
        else:
            history = model.fit(
                train_data,
                validation_data=val_data,
                epochs=epochs,
                callbacks=callbacks,
                verbose=1
            )
            
        final_path = os.path.join(self.ckpt_dir, 'final_model.h5')
        model.save(final_path)
        print(f"Entrenamiento finalizado. Modelo guardado en: {final_path}")
        return history