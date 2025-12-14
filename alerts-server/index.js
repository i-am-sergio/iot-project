const express = require('express');
const axios = require('axios');
const nodemailer = require('nodemailer');
const cors = require('cors');
const mqtt = require('mqtt');

const app = express();
app.use(express.json());
app.use(cors());

// ==========================================
// 1. CONFIGURACIÓN DE CREDENCIALES
// ==========================================

// --- WHATSAPP (TextMeBot) ---
const WSP_NUMBER = process.env.WSP_NUMBER;
const WSP_APIKEY = process.env.WSP_APIKEY;

// --- TELEGRAM ---
const TELEGRAM_TOKEN = process.env.TELEGRAM_TOKEN;
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID;

// --- GMAIL (Nodemailer) ---
const CORREO_USER = process.env.CORREO_USER;
const CORREO_PASS = process.env.CORREO_PASS;

// Configuración del transporte de correo
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: CORREO_USER,
        pass: CORREO_PASS
    }
});

// ==========================================
// 2. FUNCIONES DE ENVÍO
// ==========================================

async function enviarAlerta(mensaje) {
    console.log("\n🚨 --- INICIANDO PROTOCOLO DE ALERTA ---");

    // --- A. ENVIAR WHATSAPP ---
    try {
        const msgEncoded = encodeURIComponent(mensaje);
        const urlWsp = `http://api.textmebot.com/send.php?recipient=${WSP_NUMBER}&apikey=${WSP_APIKEY}&text=${msgEncoded}&json=yes`;

        await axios.get(urlWsp);
        console.log("✅ WhatsApp enviado correctamente");
    } catch (error) {
        console.log("❌ Error enviando WhatsApp:", error.message);
    }

    // --- B. ENVIAR TELEGRAM ( Usando GET ) ---
    try {
        const msgEncoded = encodeURIComponent(mensaje);
        const urlTg = `https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage?chat_id=${TELEGRAM_CHAT_ID}&text=${msgEncoded}`;

        await axios.get(urlTg);
        console.log("✅ Telegram enviado correctamente");
    } catch (error) {
        // Muestra detalles si falla
        console.log("❌ Error enviando Telegram:", error.response ? error.response.data : error.message);
    }

    // --- C. ENVIAR CORREO ---
    try {
        await transporter.sendMail({
            from: `"Alerta Sensor" <${CORREO_USER}>`,
            to: CORREO_USER, // Se envía a ti mismo
            subject: '🔥 PELIGRO: ALERTA DEL SENSOR',
            text: mensaje
        });
        console.log("✅ Correo enviado correctamente");
    } catch (error) {
        console.log("❌ Error enviando Correo:", error.message);
    }
    console.log("------------------------------------------\n");
}

// ==========================================
// 3. RUTAS DEL SERVIDOR
// ==========================================

app.post('/sensor-data', (req, res) => {
    // Recibimos los datos (Simulados o del Sensor Real)
    const { temperatura, humo } = req.body;

    console.log(`📡 Dato recibido -> Temp: ${temperatura}°C | Humo: ${humo}%`);

    // LÓGICA DE ALERTA: Si supera 40°C o 50% de humo
    if (temperatura > 40 || humo > 50) {
        const mensajeAlerta = `PELIGRO DETECTADO:\nTemperatura: ${temperatura}°C\nNivel de Humo: ${humo}%`;

        // Disparamos las alertas
        enviarAlerta(mensajeAlerta);
    }

    res.send({ status: 'ok', message: 'Datos procesados' });
});

// ==========================================
// 4. CLIENTE MQTT
// ==========================================

const MQTT_BROKER = "mqtt://34.71.123.19:1883";
const MQTT_TOPIC = "verifications";

console.log("conectando al MQTT...");
const client = mqtt.connect(MQTT_BROKER);

client.on("connect", () => {
    console.log("✅ Conectado al Broker MQTT");
    client.subscribe(MQTT_TOPIC, (err) => {
        if (!err) {
            console.log(`📡 Suscrito al topic '${MQTT_TOPIC}'`);
        } else {
            console.error("❌ Error al suscribirse:", err);
        }
    });
});

client.on("message", (topic, message) => {
    if (topic === MQTT_TOPIC) {
        try {
            const data = JSON.parse(message.toString());
            console.log("📩 Mensaje recibido MQTT:", data);

            // Verificar si es una alerta de incendio
            if (data.is_fire === true) {
                const tipoValidacion = data.validation_type || "Desconocido";
                const confFoto = data.photo_confidence ? (data.photo_confidence * 100).toFixed(1) : "N/A";
                const confAudio = data.audio_confidence ? (data.audio_confidence * 100).toFixed(1) : "N/A";

                const mensajeAlerta = `🔥 ALERTA DE INCENDIO CONFIRMADA 🔥\n\n` +
                    `Tipo: ${tipoValidacion}\n` +
                    `Confianza Visual: ${confFoto}%\n` +
                    `Confianza Audio: ${confAudio}%\n` +
                    `Mensaje: Se ha detectado un posible incendio.`;

                enviarAlerta(mensajeAlerta);
            }
        } catch (error) {
            console.error("❌ Error procesando mensaje MQTT:", error.message);
        }
    }
});

// Arrancar el servidor
app.listen(5003, () => {
    console.log('🚀 Servidor de alertas corriendo en el puerto 5003');
    console.log('Esperando datos...');
});