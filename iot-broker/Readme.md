# MQTT Broker

- Iniciar broker MQTT usando Docker Compose:
```sh
docker-compose up
```
- Abrir otra terminal
- Para instalar clientes MQTT de prueba (Debian/Ubuntu):
```sh
sudo apt install -y mosquitto-clients
```

- Este comando permite `suscribirse` al tópico "alerts" 
```sh
mosquitto_sub -h localhost -p 1883 -t "alerts" -v
```

- Este comando permite `publicar` un mensaje en el tópico "alerts"
```sh
mosquitto_pub -h localhost -p 1883 -t "alerts" -m '{"temperature": 38.5, "timestamp": "2024-01-15T10:31:00Z", "message": "High temperature detected"}'
```
