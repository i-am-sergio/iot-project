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


## Comandos para Topic: alerts

- Este comando permite `suscribirse` al tópico "alerts" 
```sh
mosquitto_sub -h localhost -p 1883 -t "alerts" -v
```

- Este comando permite `publicar` un mensaje en el tópico "alerts"
```sh
mosquitto_pub -h localhost -p 1883 -t "alerts" -m '{"temperature": 38.5, "timestamp": "2024-01-15T10:31:00Z", "message": "High temperature detected"}'
```

## Comandos para Topic: sensors

- Este comando permite `suscribirse` al tópico "sensors" 
```sh
mosquitto_sub -h localhost -p 1883 -t "sensors" -v
``` 
- Este comando permite `publicar` un mensaje en el tópico "sensors"
```sh
mosquitto_pub -h localhost -p 1883 -t "sensors" -m '{"temperature": 39.33, "timestamp": "2024-01-15T10:31:00Z"}'
```

## Comandos para Topic: verifications
- Este comando permite `suscribirse` al tópico "verifications" 
```sh
mosquitto_sub -h localhost -p 1883 -t "verifications" -v
```
- Este comando permite `publicar` un mensaje en el tópico "verifications"
```sh
mosquitto_pub -h localhost -p 1883 -t "verifications" -m '{"device_id": "sensor_01", "status": "online", "timestamp": "2024-01-15T10:31:00Z"}'
```