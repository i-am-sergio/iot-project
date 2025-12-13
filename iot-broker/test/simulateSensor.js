// simulateSensor.js
import mqtt from 'mqtt';
import { setInterval } from 'timers/promises';

const client = mqtt.connect('mqtt://localhost:1883');

client.on('connect', () => {
  console.log('Conectado al broker MQTT');
  startSimulation();
});

client.on('error', (err) => {
  console.error('Error de conexión:', err);
  process.exit(1);
});

async function startSimulation() {
  let count = 0;
  
  // Función para generar valores realistas de temperatura y gas
  function generateSensorData(id) {
    const baseTemp = 20 + Math.random() * 10; // 20-30°C base
    const temp = baseTemp + (Math.random() * 5); // Variación adicional
    
    // Aumentar gas ocasionalmente para simular eventos
    const baseGas = Math.random() * 50; // 0-50 base
    const gas = baseGas + (Math.random() > 0.8 ? Math.random() * 100 : 0); // Picos ocasionales
    
    return {
      id: id,
      ts: Math.floor(Date.now() / 1000), // Timestamp en segundos
      temp: parseFloat(temp.toFixed(1)),
      gas: Math.floor(gas)
    };
  }

  console.log('Iniciando simulación de sensores...');
  console.log('Enviando 1 mensaje cada 5 segundos (100 mensajes total)...');
  console.log('Presiona Ctrl+C para detener\n');

  try {
    for await (const _ of setInterval(5000)) { // Cada 5 segundos
      if (count >= 100) {
        console.log('\n✅ Simulación completada: 100 mensajes enviados');
        client.end();
        process.exit(0);
      }
      
      count++;
      
      // Generar datos para 3 sensores diferentes
      const sensors = ['esp32-01', 'esp32-02', 'esp32-03'];
      const sensorId = sensors[Math.floor(Math.random() * sensors.length)];
      
      const payload = generateSensorData(sensorId);
      const message = JSON.stringify(payload);
      
      client.publish('sensors', message);
      
      console.log(`[${new Date().toLocaleTimeString()}] Enviado #${count}/${100}:`);
      console.log(`   Sensor: ${payload.id}`);
      console.log(`   Temp: ${payload.temp}°C, Gas: ${payload.gas}`);
      console.log(`   Timestamp: ${payload.ts}\n`);
    }
  } catch (err) {
    console.error('Error en la simulación:', err);
    client.end();
    process.exit(1);
  }
}