from abc import ABC, abstractmethod
from typing import BinaryIO
from .models import DetectionResult

class IDetector(ABC):
    @abstractmethod
    def detect(self, image_file: BinaryIO, audio_file: BinaryIO) -> DetectionResult:
        pass

class IMessageBroker(ABC):
    @abstractmethod
    def publish_verification(self, result: DetectionResult):
        pass