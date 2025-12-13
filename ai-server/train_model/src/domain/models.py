from tensorflow.keras.applications import MobileNetV2
from tensorflow.keras.layers import Dense, GlobalAveragePooling2D, Dropout, Input
from tensorflow.keras.models import Model, Sequential
from src.config import IMG_SIZE

class ModelFactory:
    @staticmethod
    def build_vision_model():
        base = MobileNetV2(weights='imagenet', include_top=False, input_shape=(IMG_SIZE[0], IMG_SIZE[1], 3))
        base.trainable = False

        x = base.output
        x = GlobalAveragePooling2D()(x)
        x = Dense(128, activation='relu')(x)
        x = Dropout(0.5)(x)
        preds = Dense(1, activation='sigmoid', dtype='float32')(x)
        
        model = Model(inputs=base.input, outputs=preds, name="Vision_MobileNetV2")
        model.compile(optimizer='adam', loss='binary_crossentropy', metrics=['accuracy'])
        return model

    @staticmethod
    def build_audio_model(input_shape=(40,)):
        model = Sequential([
            Input(shape=input_shape),
            Dense(256, activation='relu'),
            Dropout(0.3),
            Dense(128, activation='relu'),
            Dense(1, activation='sigmoid', dtype='float32')
        ], name="Audio_MLP")
        model.compile(optimizer='adam', loss='binary_crossentropy', metrics=['accuracy'])
        return model