from src.infrastructure.messaging.mqtt_adapter import MqttProducer
from src.infrastructure.ai.keras_adapter import KerasDetectorAdapter
from src.infrastructure.config import settings
from src.application.service import VerificationService

print("Inicializando dependencias del sistema...")

_ai_adapter = KerasDetectorAdapter(
    vision_path=settings.MODEL_VISION_PATH,
    audio_path=settings.MODEL_AUDIO_PATH
)

_mqtt_adapter = MqttProducer()

_service = VerificationService(detector=_ai_adapter, broker=_mqtt_adapter)

def get_verification_service() -> VerificationService:
    """Función para inyectar el servicio en los endpoints de FastAPI"""
    return _service