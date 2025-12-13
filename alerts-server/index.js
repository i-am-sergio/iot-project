require('dotenv').config();
const mqtt = require('mqtt');
const nodemailer = require('nodemailer');
const express = require('express');
const twilio = require('twilio'); // Importamos Twilio

// --- CONFIGURACIÓN ---
const app = express();
const PORT = process.env.PORT || 5004; // Cambiado a 5004 según tu diagrama

// Cliente Twilio
const twilioClient = twilio(process.env.TWILIO_SID, process.env.TWILIO_TOKEN);

// Cliente Correo (Nodemailer)
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    }
});

// --- FUNCIONES DE ALERTA ---

// 1. Enviar Correo
const enviarCorreo = async () => {
    try {
        await transporter.sendMail({
            from: process.env.EMAIL_USER,
            to: process.env.EMAIL_DESTINO,
            subject: '⚠️ ALERTA: FUEGO DETECTADO',
            text: 'El sistema ha detectado un incendio con alta probabilidad. Revise la cámara.'
        });
        console.log('📧 Correo enviado.');
    } catch (error) {
        console.error('❌ Error enviando correo:', error);
    }
};

// 2. Enviar WhatsApp
const enviarWhatsApp = async () => {
    try {
        await twilioClient.messages.create({
            body: '🔥 ¡ALERTA CRÍTICA! Se ha detectado un incendio en el hato. Por favor verifique inmediatamente.',
            from: process.env.TWILIO_WHATSAPP_NUMBER, // El número del Sandbox de Twilio
            to: process.env.MY_WHATSAPP_NUMBER       // Tu número personal (con código de país)
        });
        console.log('📱 WhatsApp enviado.');
    } catch (error) {
        console.error('❌ Error enviando WhatsApp:', error);
    }
};

// --- SERVIDOR Y MQTT ---

app.get('/', (req, res) => res.send('Alert-Server Activo (Email + WhatsApp)'));

app.listen(PORT, () => console.log(`✅ Alert-Server corriendo en puerto ${PORT}`));

const client = mqtt.connect(process.env.MQTT_BROKER || 'mqtt://test.mosquitto.org');

client.on('connect', () => {
    console.log('🔌 Conectado a MQTT');
    client.subscribe('verifications');
});

client.on('message', (topic, message) => {
    if (topic === 'verifications') {
        try {
            const data = JSON.parse(message.toString());
            console.log('📥 Dato recibido:', data);

            // Si la predicción es "yes"
            if (data.prediction && data.prediction.toLowerCase() === 'yes') {
                console.log('🚨 ¡PROTOCOLOS DE ALERTA INICIADOS!');

                // Ejecutamos ambas alertas en paralelo
                enviarCorreo();
                enviarWhatsApp();
            }
        } catch (e) {
            console.error('Data no válida');
        }
    }
});