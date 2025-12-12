/**
 * Servidor MQTT para recibir frames de cámara
 */
const aedes = require('aedes');
const net = require('net');
const fs = require('fs');
const path = require('path');
const winston = require('winston');
const dotenv = require('dotenv');

// Cargar variables de entorno
dotenv.config();

// Configurar logging
const logger = winston.createLogger({
    level: process.env.LOG_LEVEL || 'info',
    format: winston.format.combine(
        winston.format.timestamp({
            format: 'YYYY-MM-DD HH:mm:ss'
        }),
        winston.format.errors({ stack: true }),
        winston.format.splat(),
        winston.format.json()
    ),
    defaultMeta: { service: 'iot-mqtt-server' },
    transports: [
        new winston.transports.File({ 
            filename: 'error.log', 
            level: 'error' 
        }),
        new winston.transports.File({ 
            filename: 'combined.log' 
        }),
        new winston.transports.Console({
            format: winston.format.combine(
                winston.format.colorize(),
                winston.format.simple()
            )
        })
    ]
});

// Configuración del servidor
const PORT = process.env.PORT || 1883;
const WS_PORT = process.env.WS_PORT || 1884;
const SAVE_FRAMES = process.env.SAVE_FRAMES === 'true' || false;
const FRAME_SAVE_DIR = process.env.FRAME_SAVE_DIR || './frames';
const TOPIC = 'camera/frame';

// Crear servidor Aedes MQTT
const aedesInstance = aedes();
const server = net.createServer(aedesInstance.handle);

// Estadísticas
const stats = {
    clientsConnected: 0,
    totalMessages: 0,
    framesReceived: 0,
    startTime: new Date()
};

// Crear directorio para frames si no existe
if (SAVE_FRAMES && !fs.existsSync(FRAME_SAVE_DIR)) {
    fs.mkdirSync(FRAME_SAVE_DIR, { recursive: true });
    logger.info(`Directorio de frames creado: ${FRAME_SAVE_DIR}`);
}

// Evento cuando un cliente se conecta
aedesInstance.on('client', (client) => {
    stats.clientsConnected++;
    logger.info(`Cliente conectado: ${client.id} - Total clientes: ${stats.clientsConnected}`);
    
    // Enviar mensaje de bienvenida
    const welcomeMsg = {
        message: 'Conectado al servidor MQTT de cámara',
        serverTime: new Date().toISOString(),
        topics: [TOPIC]
    };
    
    aedesInstance.publish({
        topic: `status/${client.id}`,
        payload: JSON.stringify(welcomeMsg),
        qos: 0,
        retain: false
    });
});

// Evento cuando un cliente se desconecta
aedesInstance.on('clientDisconnect', (client) => {
    stats.clientsConnected--;
    logger.info(`Cliente desconectado: ${client.id} - Clientes restantes: ${stats.clientsConnected}`);
});

// Evento cuando se publica un mensaje
aedesInstance.on('publish', (packet, client) => {
    stats.totalMessages++;
    
    if (packet.topic === TOPIC) {
        stats.framesReceived++;
        
        try {
            const message = JSON.parse(packet.payload.toString());
            const timestamp = message.timestamp || new Date().toISOString();
            
            logger.info(`Frame recibido #${stats.framesReceived} - Cliente: ${client?.id || 'desconocido'} - Tamaño: ${packet.payload.length} bytes`);
            
            // Guardar frame si está configurado
            if (SAVE_FRAMES) {
                saveFrameToFile(message, stats.framesReceived);
            }
            
            // Publicar estadísticas actualizadas
            publishStats();
            
        } catch (error) {
            logger.error(`Error procesando frame: ${error.message}`);
        }
    } else if (packet.topic.startsWith('$SYS/')) {
        // Ignorar mensajes del sistema
    } else {
        logger.debug(`Mensaje recibido en topic: ${packet.topic} - Cliente: ${client?.id || 'desconocido'}`);
    }
});

// Evento de suscripción
aedesInstance.on('subscribe', (subscriptions, client) => {
    subscriptions.forEach(sub => {
        logger.info(`Cliente ${client.id} suscrito a: ${sub.topic}`);
        
        if (sub.topic === TOPIC) {
            // Enviar mensaje de confirmación
            const confirmMsg = {
                message: 'Suscrito correctamente al topic de cámara',
                topic: TOPIC,
                timestamp: new Date().toISOString()
            };
            
            aedesInstance.publish({
                topic: `confirmation/${client.id}`,
                payload: JSON.stringify(confirmMsg),
                qos: 0,
                retain: false
            });
        }
    });
});

// Función para guardar frame en archivo
function saveFrameToFile(frameData, frameNumber) {
    try {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const filename = `frame_${frameNumber}_${timestamp}.jpg`;
        const filepath = path.join(FRAME_SAVE_DIR, filename);
        
        // Decodificar base64 y guardar
        const buffer = Buffer.from(frameData.frame, 'base64');
        fs.writeFileSync(filepath, buffer);
        
        // Guardar metadata
        const metadata = {
            frameNumber,
            timestamp: frameData.timestamp,
            originalTimestamp: frameData.timestamp,
            width: frameData.width,
            height: frameData.height,
            filename
        };
        
        const metadataFile = path.join(FRAME_SAVE_DIR, `frame_${frameNumber}_metadata.json`);
        fs.writeFileSync(metadataFile, JSON.stringify(metadata, null, 2));
        
        logger.debug(`Frame guardado: ${filename}`);
        
    } catch (error) {
        logger.error(`Error guardando frame: ${error.message}`);
    }
}

// Función para publicar estadísticas
function publishStats() {
    const uptime = Math.floor((new Date() - stats.startTime) / 1000);
    
    const statsMessage = {
        uptime: `${uptime} segundos`,
        clientsConnected: stats.clientsConnected,
        totalMessages: stats.totalMessages,
        framesReceived: stats.framesReceived,
        timestamp: new Date().toISOString()
    };
    
    aedesInstance.publish({
        topic: '$SYS/stats',
        payload: JSON.stringify(statsMessage),
        qos: 0,
        retain: true
    });
}

// Publicar estadísticas periódicamente
setInterval(() => {
    publishStats();
}, 30000); // Cada 30 segundos

// Iniciar servidor
server.listen(PORT, () => {
    logger.info(`✅ Servidor MQTT iniciado en puerto ${PORT}`);
    logger.info(`📡 Escuchando en: mqtt://localhost:${PORT}`);
    logger.info(`🎯 Topic de cámara: ${TOPIC}`);
    logger.info(`💾 Guardar frames: ${SAVE_FRAMES ? 'SÍ' : 'NO'}`);
    if (SAVE_FRAMES) {
        logger.info(`📁 Directorio frames: ${path.resolve(FRAME_SAVE_DIR)}`);
    }
    
    // Mostrar información de inicio
    console.log('\n' + '='.repeat(50));
    console.log('🚀 IOT MQTT SERVER INICIADO');
    console.log('='.repeat(50));
    console.log(`Puerto MQTT: ${PORT}`);
    console.log(`Topic principal: ${TOPIC}`);
    console.log(`Hora inicio: ${stats.startTime.toLocaleString()}`);
    console.log('='.repeat(50) + '\n');
});

// Manejar errores del servidor
server.on('error', (error) => {
    logger.error(`Error del servidor: ${error.message}`);
    if (error.code === 'EADDRINUSE') {
        logger.error(`El puerto ${PORT} ya está en uso. Intenta con otro puerto.`);
    }
});

// Manejar cierre del servidor
process.on('SIGINT', () => {
    logger.info('Recibida señal SIGINT, cerrando servidor...');
    
    // Publicar mensaje de desconexión
    const shutdownMsg = {
        message: 'Servidor MQTT apagándose',
        timestamp: new Date().toISOString(),
        uptime: Math.floor((new Date() - stats.startTime) / 1000) + ' segundos',
        totalFrames: stats.framesReceived
    };
    
    aedesInstance.publish({
        topic: '$SYS/shutdown',
        payload: JSON.stringify(shutdownMsg),
        qos: 1,
        retain: false
    });
    
    setTimeout(() => {
        server.close(() => {
            logger.info('Servidor MQTT cerrado correctamente');
            process.exit(0);
        });
    }, 1000);
});