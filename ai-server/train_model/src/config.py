import os
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent

DATASET_DIR = BASE_DIR / "../dataset"
VISION_DIR = DATASET_DIR / "vision"
AUDIO_DIR = DATASET_DIR / "audio"

OUTPUT_DIR = BASE_DIR / "../data"
CHECKPOINT_DIR = OUTPUT_DIR / "checkpoints"
LOG_DIR = OUTPUT_DIR / "logs"

IMG_SIZE = (224, 224)
BATCH_SIZE = 32
EPOCHS_VISION = 100
EPOCHS_AUDIO = 150
PATIENCE = 15
SEED = 42

os.makedirs(CHECKPOINT_DIR, exist_ok=True)
os.makedirs(LOG_DIR, exist_ok=True)