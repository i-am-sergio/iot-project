import requests
from tqdm import tqdm
import os

class FileDownloader:
    @staticmethod
    def download_from_url(url: str, dest_path: str):
        if not url:
            raise ValueError("La URL proporcionada está vacía.")
        print(f"Iniciando descarga desde: {url}...")
        try:
            response = requests.get(url, stream=True)
            response.raise_for_status()
            total_size = int(response.headers.get('content-length', 0))
            block_size = 1024
            with open(dest_path, 'wb') as file, tqdm(
                desc=dest_path,
                total=total_size,
                unit='iB',
                unit_scale=True,
                unit_divisor=1024,
            ) as bar:
                for data in response.iter_content(block_size):
                    size = file.write(data)
                    bar.update(size)
            print("Descarga completada.")
            return True
        except Exception as e:
            print(f"Error descargando archivo: {e}")
            if os.path.exists(dest_path):
                os.remove(dest_path)
            return False