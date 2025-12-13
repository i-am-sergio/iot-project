from fastapi import APIRouter, UploadFile, File, HTTPException, Depends
from src.application.service import VerificationService
from src.interfaces.http.schemas import VerificationResponse
from src.infrastructure.dependencies import get_verification_service

router = APIRouter()

@router.post("/verify", response_model=VerificationResponse)
async def verify_incident(
    photo: UploadFile = File(...), 
    audio: UploadFile = File(...),
    service: VerificationService = Depends(get_verification_service)
):
    try:
        result = service.process_verification(
            image=photo.file, 
            audio=audio.file
        )
        
        return VerificationResponse(
            is_fire=result.is_fire,
            validation_type=result.validation_type.value,
            photo_confidence=f"{result.photo_confidence:.1%}",
            audio_confidence=f"{result.audio_confidence:.1%}"
        )
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Error procesando solicitud: {str(e)}")