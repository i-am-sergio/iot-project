from dataclasses import dataclass
from enum import Enum

class VerificationType(str, Enum):
    FIRE_VISUAL = "INCENDIO (Visual)"
    ALERT_AUDIO = "ALERTA SONORA"
    RISK_MIXED = "RIESGO MIXTO"
    SAFE = "Seguro"

@dataclass
class DetectionResult:
    is_fire: bool
    validation_type: VerificationType
    photo_confidence: float
    audio_confidence: float

    def to_dict(self):
        return {
            "is_fire": self.is_fire,
            "validation_type": self.validation_type.value,
            "photo_confidence": self.photo_confidence,
            "audio_confidence": self.audio_confidence
        }