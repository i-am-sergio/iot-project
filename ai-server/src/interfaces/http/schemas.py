from pydantic import BaseModel

class VerificationResponse(BaseModel):
    is_fire: bool
    validation_type: str
    photo_confidence: str
    audio_confidence: str