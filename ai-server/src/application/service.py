from typing import BinaryIO
from src.domain.ports import IDetector, IMessageBroker
from src.domain.models import DetectionResult

class VerificationService:
    def __init__(self, detector: IDetector, broker: IMessageBroker):
        self.detector = detector
        self.broker = broker

    def process_verification(self, image: BinaryIO, audio: BinaryIO) -> DetectionResult:
        result = self.detector.detect(image, audio)
        self.broker.publish_verification(result)
        return result