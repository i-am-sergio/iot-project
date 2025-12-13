import os
import shutil
import zipfile
import glob
import pandas as pd
import sys

sys.path.append(os.path.join(os.path.dirname(__file__), 'src'))

from src.config import DATASET_DIR, VISION_DIR, AUDIO_DIR
from src.infrastructure.downloader import FileDownloader

FIRE_DATASET_URL = "https://www.kaggle.com/api/v1/datasets/download/phylake1337/fire-dataset"
ESC50_URL = "https://github.com/karolpiczak/ESC-50/archive/master.zip"

DIRS = {
    'vision_0': os.path.join(VISION_DIR, '0'),
    'vision_1': os.path.join(VISION_DIR, '1'),
    'audio_0': os.path.join(AUDIO_DIR, '0'),
    'audio_1': os.path.join(AUDIO_DIR, '1')
}
def preparar_directorios():
    if os.path.exists(DATASET_DIR):
        shutil.rmtree(DATASET_DIR)
    for d in DIRS.values():
        os.makedirs(d, exist_ok=True)

def procesar_audio():
    print("Procesando Audio (ESC-50)...")
    zip_name = "esc50.zip"
    
    if not os.path.exists(zip_name):
        FileDownloader.download_from_url(ESC50_URL, zip_name)
    
    if os.path.exists(zip_name):
        with zipfile.ZipFile(zip_name, 'r') as z: z.extractall(".")
        
        base = "./ESC-50-master"
        df = pd.read_csv(os.path.join(base, "meta/esc50.csv"))
        
        fuego = df[df['category'] == 'crackling_fire']['filename'].tolist()
        normal = df[df['category'].isin(['rain', 'wind', 'crickets', 'chirping_birds'])]['filename'].tolist()

        for f in fuego:
            shutil.copy(os.path.join(base, "audio", f), os.path.join(DIRS['audio_1'], f))
        for f in normal:
            shutil.copy(os.path.join(base, "audio", f), os.path.join(DIRS['audio_0'], f))
            
        shutil.rmtree(base)
        os.remove(zip_name)
        print("Audio listo.")

def procesar_vision():
    print("Procesando Vision (Fire Dataset)...")
    zip_name = "fire-dataset.zip"
    
    if not os.path.exists(zip_name) and FIRE_DATASET_URL:
        FileDownloader.download_from_url(FIRE_DATASET_URL, zip_name)

    if os.path.exists(zip_name):
        with zipfile.ZipFile(zip_name, 'r') as z: z.extractall("temp_vis")
        
        fire_imgs = glob.glob("temp_vis/**/fire_images/*.png", recursive=True)
        norm_imgs = glob.glob("temp_vis/**/non_fire_images/*.png", recursive=True)
        
        for f in fire_imgs:
            shutil.move(f, os.path.join(DIRS['vision_1'], os.path.basename(f)))
        for f in norm_imgs:
            shutil.move(f, os.path.join(DIRS['vision_0'], os.path.basename(f)))

        shutil.rmtree("temp_vis")
        os.remove(zip_name)
        print("Vision lista.")
    else:
        print("No se encontro fire-dataset.zip.")
        print("Descarga el zip manualmente y colocalo aqui.")

if __name__ == "__main__":
    preparar_directorios()
    procesar_audio()
    procesar_vision()
    print("Setup Finalizado.")