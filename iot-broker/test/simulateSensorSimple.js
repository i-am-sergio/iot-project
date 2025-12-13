// simulateSensorSimple.js
import mqtt from 'mqtt';

const client = mqtt.connect('mqtt://localhost:1883');
let count = 0;
const totalMessages = 100;
const intervalMs = 5000;

client.on('connect', () => {
  console.log('✅ Conectado al broker MQTT');
  console.log(`📡 Enviando ${totalMessages} mensajes cada ${intervalMs/1000} segundos...\n`);
  
  const interval = setInterval(() => {
    if (count >= totalMessages) {
      clearInterval(interval);
      console.log('\n🎯 Simulación completada!');
      client.end();
      process.exit(0);
    }
    
    count++;
    
    // Datos del sensor
    const payload = {
      id: 'esp32-01',
      ts: Math.floor(Date.now() / 1000),
      temp: 20 + (Math.random() * 15), // 20-35°C
      gas: Math.floor(Math.random() * 200) // 0-200
    };
    
    // Ocasionalmente enviar desde otro sensor
    if (Math.random() > 0.7) {
      payload.id = 'esp32-02';
    }
    
    const message = JSON.stringify(payload);
    client.publish('sensors', message);
    
    console.log(`[${count}/${totalMessages}] ${new Date().toLocaleTimeString()}`);
    console.log(`   📤 Topic: sensors`);
    console.log(`   📊 Payload: ${message}\n`);
    
  }, intervalMs);
});

client.on('error', (err) => {
  console.error('❌ Error:', err);
  process.exit(1);
});