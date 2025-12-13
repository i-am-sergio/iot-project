import json
import paho.mqtt.client as mqtt
from src.domain.ports import IMessageBroker
from src.domain.models import DetectionResult
from src.infrastructure.config import settings

class MqttProducer(IMessageBroker):
    def __init__(self):
        self.client = mqtt.Client(transport=settings.MQTT_TRANSPORT)
        self.client.on_connect = self._on_connect
        self.client.on_disconnect = self._on_disconnect
        print(f"Intentando conectar a MQTT: {settings.MQTT_BROKER_HOST}:{settings.MQTT_BROKER_PORT}...")
        try:
            self.client.connect(settings.MQTT_BROKER_HOST, settings.MQTT_BROKER_PORT, 60)
            self.client.loop_start()
        except Exception as e:
            print(f"Error crítico conectando a MQTT: {e}")
    def _on_connect(self, client, userdata, flags, rc):
        if rc == 0:
            print(f"Conectado exitosamente al broker MQTT ({settings.MQTT_BROKER_HOST})")
        else:
            print(f"Falló conexión MQTT. Código de retorno: {rc}")

    def _on_disconnect(self, client, userdata, rc):
        print("Desconectado del broker MQTT.")

    def publish_verification(self, result: DetectionResult):
        if not self.client.is_connected():
            print("No se puede publicar: Cliente MQTT desconectado.")
            return
        try:
            payload_dict = result.to_dict()
            payload_str = json.dumps(payload_dict)
            info = self.client.publish(settings.MQTT_TOPIC, payload_str)
            info.wait_for_publish() 
            print(f"Enviado a topic '{settings.MQTT_TOPIC}': {payload_str}")
        except Exception as e:
            print(f"Error publicando mensaje: {e}")