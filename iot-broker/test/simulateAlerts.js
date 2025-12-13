// simulateAlerts.js
import mqtt from 'mqtt';

const client = mqtt.connect('mqtt://localhost:1883');

client.on('connect', () => {
  console.log('Conectado para enviar alertas');
  
  // Enviar alertas de prueba
  const alerts = [
    { id: 'esp32-01', ts: Math.floor(Date.now()/1000), level: 1, temp: 35.2, gas: 85, msg: 'temp_high' },
    { id: 'esp32-02', ts: Math.floor(Date.now()/1000), level: 2, temp: 28.5, gas: 150, msg: 'gas_high' },
    { id: 'esp32-01', ts: Math.floor(Date.now()/1000), level: 3, temp: 65.8, gas: 220, msg: 'fire_detected' },
  ];
  
  let count = 0;
  const interval = setInterval(() => {
    if (count >= alerts.length) {
      clearInterval(interval);
      client.end();
      console.log('Simulación de alertas completada');
      return;
    }
    
    const alert = alerts[count];
    client.publish('alerts', JSON.stringify(alert));
    console.log(`📢 Alerta enviada: ${alert.msg} (Nivel ${alert.level})`);
    count++;
  }, 5000);
});

client.on('error', (err) => {
  console.error('Error:', err);
});