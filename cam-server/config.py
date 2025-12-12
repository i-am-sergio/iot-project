"""
Configuración del servidor de cámara
"""
import os
from datetime import datetime

# Configuración de la cámara
# CAMERA_IP = os.getenv('CAMERA_IP', 'http://192.168.1.100:8080/video')  
CAMERA_IP = os.getenv('CAMERA_IP', 0)

# Configuración del servidor MQTT
MQTT_BROKER = os.getenv('MQTT_BROKER', 'localhost')
MQTT_PORT = int(os.getenv('MQTT_PORT', 1883))
MQTT_TOPIC = os.getenv('MQTT_TOPIC', 'camera/frame')
MQTT_CLIENT_ID = f'camera_server_{datetime.now().strftime("%Y%m%d_%H%M%S")}'

# Configuración de la aplicación
CAPTURE_INTERVAL = 2  # Segundos entre capturas
FRAME_QUALITY = 70  # Calidad JPEG (0-100)
MAX_FRAME_SIZE = 1024  # Ancho máximo del frame (mantiene proporción)

# Configuración de logs
LOG_LEVEL = os.getenv('LOG_LEVEL', 'INFO')
LOG_FORMAT = '%(asctime)s - %(name)s - %(levelname)s - %(message)s'
LOG_FILE = 'camera_server.log'

# Configuración de reintentos
MAX_RETRIES = 3
RETRY_DELAY = 5  # Segundos entre reintentos