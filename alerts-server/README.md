# Backend Incendios 🔥

Este proyecto es un sistema de backend diseñado para procesar alertas de detección de incendios. Funciona recibiendo mensajes a través de MQTT (simulando sensores IoT) y enviando notificaciones críticas vía Email y WhatsApp cuando se detecta un incendio.

## 🚀 Funcionalidades

- **Servidor Web**: Expone un endpoint básico para verificar el estado del servicio.
- **Cliente MQTT**: Se conecta a un broker público (`test.mosquitto.org`) y escucha el topic `verifications`.
- **Alertas**:
  - **Email**: Utiliza Nodemailer para enviar avisos a correos electrónicos.
  - **WhatsApp**: Utiliza Twilio para enviar mensajes de alerta instantáneos.
- **Simulación de Sensor**: Script en Python para simular el envío de datos de un sensor de detección de fuego.

## 📋 Requisitos Previos

Asegúrate de tener instalado:
- [Node.js](https://nodejs.org/) (v14 o superior)
- [Python](https://www.python.org/) 3.x

## 🛠️ Instalación

1.  **Clonar el repositorio** (si aplica) o navegar a la carpeta del proyecto.

2.  **Instalar dependencias de Node.js**:
    ```bash
    npm install
    ```

3.  **Instalar dependencias de Python** (para el sensor simulado):
    ```bash
    pip install paho-mqtt
    ```

## ⚙️ Configuración (.env)

Crea un archivo `.env` en la raíz del proyecto y configura las siguientes variables de entorno con tus credenciales:

```env
# Configuración del Servidor
PORT=5004

# Configuración MQTT (Opcional, por defecto usa test.mosquitto.org)
MQTT_BROKER=mqtt://test.mosquitto.org

# Credenciales de Twilio (WhatsApp)
TWILIO_SID=tu_sid_de_twilio
TWILIO_TOKEN=tu_token_de_twilio
TWILIO_WHATSAPP_NUMBER=whatsapp:+14155238886
MY_WHATSAPP_NUMBER=whatsapp:+51999999999

# Credenciales de Correo (Nodemailer per Gmail)
EMAIL_USER=tu_correo@gmail.com
EMAIL_PASS=tu_contraseña_de_aplicación
EMAIL_DESTINO=correo_destino@ejemplo.com
```

> **Nota**: Para Gmail, asegúrate de usar una "Contraseña de Aplicación" si tienes la autenticación en dos pasos activada.

## ▶️ Ejecución

### 1. Iniciar el Servidor (Backend)
Este servicio debe estar corriendo para escuchar los mensajes MQTT y enviar las alertas.

```bash
node index.js
```
El servidor indicará que está conectado a MQTT y esperando mensajes.

### 2. Simular un Sensor (Prueba)
En otra terminal, ejecuta el script de Python para simular una detección de incendio ("yes").

```bash
python sensor.py
```
Esto enviará un mensaje MQTT al topic `verifications`. El servidor (si está corriendo) recibirá el mensaje y disparará las alertas de correo y WhatsApp.

## 📂 Estructura del Proyecto

- `index.js`: Código principal del servidor (Express + MQTT + Twilio + Nodemailer).
- `sensor.py`: Script de prueba para enviar datos simulados al broker MQTT.
- `package.json`: Lista de dependencias del proyecto Node.js.
