import paho.mqtt.client as mqtt
import json

BROKER = "34.71.123.19"
PORT = 1883
TOPIC = "verifications"

def on_connect(client, userdata, flags, rc):
    print(f"Conectado al Broker! (Código: {rc})")
    client.subscribe(TOPIC)
    print(f"Escuchando el tema: {TOPIC}")

def on_message(client, userdata, msg):
    print("\nMENSAJE RECIBIDO:")
    print(f"   Topic: {msg.topic}")
    try:
        payload = json.loads(msg.payload.decode())
        print(json.dumps(payload, indent=4))
    except:
        print(f"   Payload: {msg.payload.decode()}")

client = mqtt.Client()
client.on_connect = on_connect
client.on_message = on_message

print(f"Intentando conectar a {BROKER}:{PORT}...")
try:
    client.connect(BROKER, PORT, 60)
    client.loop_forever()
except KeyboardInterrupt:
    print("\nDesconectando...")
except Exception as e:
    print(f"Error: {e}")