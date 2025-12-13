import paho.mqtt.client as mqtt
import json
import time

# Configuración
BROKER = "test.mosquitto.org"
TOPIC = "verifications"

def on_connect(client, userdata, flags, rc):
    if rc == 0:
        print("✅ Sensor conectado al Broker MQTT")
    else:
        print(f"❌ Falló la conexión, código: {rc}")

# Crear cliente
client = mqtt.Client()
client.on_connect = on_connect

print("Intentando conectar al broker...")
client.connect(BROKER, 1883, 60)

# Iniciamos el bucle en segundo plano para mantener la conexión
client.loop_start()
time.sleep(1) # Esperamos un segundo para asegurar la conexión

# --- SIMULACIÓN DE DETECCIÓN ---
print("\n🔍 Simulando análisis de imagen...")
time.sleep(2)

# Datos que enviaría el sensor
payload = {
    "prediction": "yes",
    "confidence": 0.98,
    "location": "Sector Norte"
}

# Convertir a JSON (texto)
mensaje = json.dumps(payload)

# Publicar el mensaje
print(f"🔥 ¡Fuego detectado! Enviando alerta al topic '{TOPIC}'...")
client.publish(TOPIC, mensaje)

print("📤 Mensaje enviado.")

# Esperar un poco y cerrar
time.sleep(2)
client.loop_stop()
client.disconnect()