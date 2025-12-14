# Alerts Server

Este es el servidor de alertas del sistema IoT de detección de incendios. Su función principal es recibir datos de sensores o eventos de validación y distribuir notificaciones de emergencia a través de múltiples canales cuando se detecta un peligro.

## ¿Qué hace este servidor?

El `alerts-server` opera monitoreando dos fuentes de información:

1.  **Monitorización MQTT**:
    - Se conecta al broker MQTT (`34.71.123.19`).
    - Se suscribe al tópico `verifications`.
    - Cuando recibe un mensaje JSON con el flag `"is_fire": true` (proveniente del servidor de IA o sensores), procesa los datos de confianza (visual y auditiva) y dispara las alertas.

2.  **Endpoint HTTP (API REST)**:
    - Expone la ruta `POST /sensor-data` en el puerto **5003**.
    - Recibe datos de temperatura y humo en formato JSON.
    - Si la temperatura supera los **40°C** o el humo supera el **50%**, dispara las alertas automáticamente.

### Canales de Notificación
Cuando se confirma una alarma, el servidor envía notificaciones simultáneas por:
- **WhatsApp**: A través de la API de *TextMeBot*.
- **Telegram**: Mensaje directo a un chat configurado mediante un Bot de Telegram.
- **Correo Electrónico**: Alerta urgente enviada vía Gmail usando *Nodemailer*.

## Librerías necesarias

El proyecto está construido en **Node.js** y utiliza las siguientes librerías principales (definidas en `package.json`):

- **express**: Framework para el servidor web y manejo de rutas API.
- **mqtt**: Cliente para la conexión con el broker MQTT.
- **axios**: Cliente HTTP para comunicarse con las APIs externas (TextMeBot y Telegram).
- **nodemailer**: Para el envío de correos electrónicos desde el servidor.
- **cors**: Middleware para habilitar CORS (Cross-Origin Resource Sharing).
- **dotenv**: Para manejo de variables de entorno (aunque actualmente algunas configuraciones están directas en el código para facilitar pruebas).

## Instalación

Para preparar el entorno, asegúrate de tener Node.js instalado y ejecuta el siguiente comando en la carpeta `alerts-server` para descargar todas las dependencias:

```bash
npm install
```

## Comandos para iniciar la escucha

Para levantar el servidor y comenzar a escuchar eventos (tanto por MQTT como por el puerto HTTP), ejecuta:

```bash
node index.js
```

Verás en la consola mensajes indicando que el servidor está corriendo en el puerto 5003 y que se ha conectado exitosamente al broker MQTT.
