import os
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    MQTT_BROKER_HOST: str = "34.71.123.19"
    MQTT_BROKER_PORT: int = 1883
    MQTT_TOPIC: str = "verifications"
    
    MQTT_TRANSPORT: str = "tcp" 

    MODEL_VISION_PATH: str = "data/checkpoints/vision/best_model.h5"
    MODEL_AUDIO_PATH: str = "data/checkpoints/audio/best_model.h5"

settings = Settings()