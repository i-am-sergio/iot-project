from typing import BinaryIO
import random
from src.domain.ports import IDetector
from src.domain.models import DetectionResult, VerificationType

class MockNeuralNetworkAdapter(IDetector):
    """
    Aquí iría la carga de tu modelo PyTorch/TensorFlow.
    Por ahora simulamos el procesamiento.
    """
    def detect(self, image_file: BinaryIO, audio_file: BinaryIO) -> DetectionResult:
        p_conf = round(random.uniform(0.7, 0.99), 2)
        a_conf = round(random.uniform(0.6, 0.95), 2)
        is_fire = p_conf > 0.80
        
        return DetectionResult(
            is_fire=is_fire,
            validation_type=VerificationType.AI_AUTOMATIC,
            photo_confidence=p_conf,
            audio_confidence=a_conf
        )