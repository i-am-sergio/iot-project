"""
Servidor de cámara que captura frames y los envía via MQTT
"""
import cv2
import paho.mqtt.client as mqtt
import numpy as np
import time
import json
import base64
import logging
import sys
from datetime import datetime
import os
from config import *

# Configurar logging
logging.basicConfig(
    level=getattr(logging, LOG_LEVEL),
    format=LOG_FORMAT,
    handlers=[
        logging.FileHandler(LOG_FILE),
        logging.StreamHandler(sys.stdout)
    ]
)
logger = logging.getLogger(__name__)

class CameraServer:
    def __init__(self):
        self.camera = None
        self.mqtt_client = None
        self.is_running = False
        self.last_capture_time = 0
        self.frame_count = 0
        
    def connect_camera(self):
        """Conectar a la cámara IP"""
        logger.info(f"Intentando conectar a la cámara en: {CAMERA_IP}")
        
        # Intentar diferentes métodos de conexión
        try:
            # Método 1: VideoCapture directo para streams RTSP o HTTP
            self.camera = cv2.VideoCapture(CAMERA_IP)
            
            # Configurar tiempo de espera
            self.camera.set(cv2.CAP_PROP_BUFFERSIZE, 1)
            
            # Verificar conexión
            if not self.camera.isOpened():
                logger.error(f"No se pudo abrir la cámara en {CAMERA_IP}")
                return False
            
            # Intentar leer un frame para verificar
            ret, frame = self.camera.read()
            if not ret:
                logger.error("No se pudo leer frame de la cámara")
                self.camera.release()
                return False
            
            logger.info(f"Conexión exitosa a la cámara. Resolución: {frame.shape[1]}x{frame.shape[0]}")
            return True
            
        except Exception as e:
            logger.error(f"Error al conectar con la cámara: {e}")
            return False
    
    def connect_mqtt(self):
        """Conectar al broker MQTT"""
        try:
            logger.info(f"Conectando al broker MQTT: {MQTT_BROKER}:{MQTT_PORT}")
            
            self.mqtt_client = mqtt.Client(client_id=MQTT_CLIENT_ID)
            
            # Configurar callbacks
            self.mqtt_client.on_connect = self.on_mqtt_connect
            self.mqtt_client.on_disconnect = self.on_mqtt_disconnect
            
            # Conectar
            self.mqtt_client.connect(MQTT_BROKER, MQTT_PORT, 60)
            self.mqtt_client.loop_start()
            
            logger.info("Cliente MQTT inicializado correctamente")
            return True
            
        except Exception as e:
            logger.error(f"Error al conectar con MQTT: {e}")
            return False
    
    def on_mqtt_connect(self, client, userdata, flags, rc):
        """Callback cuando se conecta a MQTT"""
        if rc == 0:
            logger.info("Conectado exitosamente al broker MQTT")
        else:
            logger.error(f"Error al conectar a MQTT. Código: {rc}")
    
    def on_mqtt_disconnect(self, client, userdata, rc):
        """Callback cuando se desconecta de MQTT"""
        if rc != 0:
            logger.warning(f"Desconexión inesperada de MQTT. Código: {rc}")
    
    def capture_and_send_frame(self):
        """Capturar y enviar frame"""
        try:
            current_time = time.time()
            
            # Verificar si es tiempo de capturar
            if current_time - self.last_capture_time < CAPTURE_INTERVAL:
                return
            
            self.last_capture_time = current_time
            
            # Leer frame de la cámara
            ret, frame = self.camera.read()
            if not ret:
                logger.error("Error al capturar frame")
                return
            
            self.frame_count += 1
            logger.debug(f"Frame #{self.frame_count} capturado")
            
            # Redimensionar si es necesario
            if frame.shape[1] > MAX_FRAME_SIZE:
                ratio = MAX_FRAME_SIZE / frame.shape[1]
                new_height = int(frame.shape[0] * ratio)
                frame = cv2.resize(frame, (MAX_FRAME_SIZE, new_height))
            
            # Codificar a JPEG
            encode_params = [int(cv2.IMWRITE_JPEG_QUALITY), FRAME_QUALITY]
            ret, buffer = cv2.imencode('.jpg', frame, encode_params)
            
            if not ret:
                logger.error("Error al codificar frame")
                return
            
            # Convertir a base64
            frame_base64 = base64.b64encode(buffer).decode('utf-8')
            
            # Crear mensaje
            message = {
                'timestamp': datetime.now().isoformat(),
                'frame_count': self.frame_count,
                'frame': frame_base64,
                'width': frame.shape[1],
                'height': frame.shape[0]
            }
            
            # Publicar en MQTT
            if self.mqtt_client and self.mqtt_client.is_connected():
                payload = json.dumps(message)
                result = self.mqtt_client.publish(MQTT_TOPIC, payload, qos=1)
                
                if result.rc == mqtt.MQTT_ERR_SUCCESS:
                    logger.info(f"Frame #{self.frame_count} enviado a topic '{MQTT_TOPIC}' ({len(payload)} bytes)")
                else:
                    logger.error(f"Error al publicar frame. Código: {result.rc}")
            
            # Mostrar frame en ventana
            cv2.imshow('Camera Server - IP: ' + CAMERA_IP, frame)
            
        except Exception as e:
            logger.error(f"Error en captura/envió: {e}")
    
    def run(self):
        """Ejecutar el servidor principal"""
        logger.info("Iniciando Camera Server...")
        
        # Conectar a la cámara
        for attempt in range(MAX_RETRIES):
            if self.connect_camera():
                break
            if attempt < MAX_RETRIES - 1:
                logger.warning(f"Reintentando conexión en {RETRY_DELAY} segundos...")
                time.sleep(RETRY_DELAY)
            else:
                logger.error("No se pudo conectar a la cámara después de varios intentos")
                return
        
        # Conectar a MQTT
        if not self.connect_mqtt():
            logger.warning("Servidor MQTT no disponible, continuando sin enviar frames")
        
        self.is_running = True
        logger.info("Camera Server iniciado correctamente")
        
        try:
            while self.is_running:
                self.capture_and_send_frame()
                
                # Salir con 'q' o ESC
                key = cv2.waitKey(1) & 0xFF
                if key == ord('q') or key == 27:  # 'q' o ESC
                    logger.info("Solicitud de salida recibida")
                    break
                
                time.sleep(0.1)  # Pequeña pausa para no saturar CPU
                
        except KeyboardInterrupt:
            logger.info("Interrupción por teclado recibida")
        except Exception as e:
            logger.error(f"Error en el bucle principal: {e}")
        finally:
            self.cleanup()
    
    def cleanup(self):
        """Limpiar recursos"""
        logger.info("Limpiando recursos...")
        self.is_running = False
        
        if self.camera and self.camera.isOpened():
            self.camera.release()
            logger.info("Cámara liberada")
        
        cv2.destroyAllWindows()
        
        if self.mqtt_client:
            self.mqtt_client.loop_stop()
            self.mqtt_client.disconnect()
            logger.info("Conexión MQTT cerrada")
        
        logger.info("Camera Server detenido")

if __name__ == "__main__":
    server = CameraServer()
    server.run()