#include <WiFi.h>
#include <PubSubClient.h>
#include <DHT.h>
#include <time.h>

// WiFi configuration
const char* WIFI_SSID = "wifi-CsComputacion";
const char* WIFI_PASS = "EPCC2022$";

// MQTT broker configuration
const char* MQTT_HOST = "34.71.123.19";
const int   MQTT_PORT = 1883;

const char* TOPIC_SENSORS = "sensors";  // Telemetry topic (1 Hz)
const char* TOPIC_ALERTS  = "alerts";   // Event topic (threshold/clear)

const char* DEVICE_ID = "esp32-01";


// NTP time configuration (America/Lima, UTC-5)
const char* NTP1 = "pool.ntp.org";
const char* NTP2 = "time.nist.gov";
const long  GMT_OFFSET_SEC = -5 * 3600;
const int   DST_OFFSET_SEC = 0;

// Sensors configuration
#define DHTPIN  4
#define DHTTYPE DHT11
DHT dht(DHTPIN, DHTTYPE);

#define MQ2_PIN 32

// Thresholds (requested)
const int   GAS_THRESHOLD  = 100;  // MQ-2 ADC raw threshold
const float TEMP_THRESHOLD = 50.0; // Temperature threshold (°C)

// MQTT client objects
WiFiClient espClient;
PubSubClient mqtt(espClient);

// Scheduling
unsigned long lastSensorsMs = 0;
const unsigned long SENSORS_PERIOD_MS = 1000; // Publish sensors once per second

// Tracks whether an alert is currently active (prevents message spam)
bool alertActive = false;

// Utility: averaged MQ-2 analog read (basic noise reduction)
int readGasAvg(int samples = 10, int delayMs = 2) {
  long sum = 0;
  for (int i = 0; i < samples; i++) {
    sum += analogRead(MQ2_PIN);
    delay(delayMs);
  }
  return (int)(sum / samples);
}

// Time helper: returns an ISO-like local timestamp string as "ts"
bool getTsString(String &tsOut) {
  time_t now;
  time(&now);

  // Guard: if not synchronized, epoch will be near 1970
  if (now < 1700000000) { // ~2023-11-14
    tsOut = "NO_TIME";
    return false;
  }

  struct tm timeinfo;
  localtime_r(&now, &timeinfo);

  char buf[25];
  // Format: YYYY-MM-DDTHH:MM:SS
  strftime(buf, sizeof(buf), "%Y-%m-%dT%H:%M:%S", &timeinfo);
  tsOut = String(buf);
  return true;
}

// NTP initialization: best-effort sync at startup (continues trying later)
void initNTP() {
  Serial.println("NTP: syncing time...");
  configTime(GMT_OFFSET_SEC, DST_OFFSET_SEC, NTP1, NTP2);

  for (int i = 0; i < 20; i++) { // ~10s total
    String ts;
    if (getTsString(ts)) {
      Serial.print("NTP: time OK -> ");
      Serial.println(ts);
      return;
    }
    delay(500);
    Serial.print(".");
  }
  Serial.println();
  Serial.println("ERROR time not synced (will keep trying in loop)");
}

// MQTT connect helper
bool mqttConnect() {
  Serial.print("MQTT: connecting to ");
  Serial.print(MQTT_HOST);
  Serial.print(":");
  Serial.println(MQTT_PORT);

  // Client ID includes MAC-derived value to reduce collisions
  String clientId = String(DEVICE_ID) + "-" + String((uint32_t)ESP.getEfuseMac(), HEX);

  if (mqtt.connect(clientId.c_str())) {
    Serial.println("MQTT: connected");
    return true;
  } else {
    Serial.print("ERROR connection (MQTT), rc=");
    Serial.println(mqtt.state());
    return false;
  }
}

// MQTT publish helper (prints outgoing payload to Serial)
bool mqttPublish(const char* topic, const String& payload) {
  Serial.print("PUB ");
  Serial.print(topic);
  Serial.print(" -> ");
  Serial.println(payload);

  bool ok = mqtt.publish(topic, payload.c_str());
  if (!ok) {
    Serial.print("ERROR publish to ");
    Serial.println(topic);
  }
  return ok;
}

// WiFi connect helper (blocking with timeout reporting)
void wifiConnect() {
  Serial.print("WiFi: connecting to ");
  Serial.println(WIFI_SSID);

  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASS);

  unsigned long start = millis();
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
    if (millis() - start > 20000) {
      Serial.println();
      Serial.println("ERROR connection (WiFi) timeout");
      start = millis();
    }
  }

  Serial.println();
  Serial.print("WiFi: connected, IP=");
  Serial.println(WiFi.localIP());
}

void setup() {
  Serial.begin(115200);
  delay(300);

  // Initialize sensors
  dht.begin();

  // Configure ESP32 ADC for MQ-2 input
  analogReadResolution(12);
  analogSetPinAttenuation(MQ2_PIN, ADC_11db);

  // Network + time + MQTT setup
  wifiConnect();
  initNTP();

  mqtt.setServer(MQTT_HOST, MQTT_PORT);
  mqttConnect();
}

void loop() {
  // WiFi keep-alive: reconnect if disconnected
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("ERROR connection (WiFi) lost, reconnecting...");
    wifiConnect();
    initNTP();
  }

  // MQTT keep-alive: reconnect if disconnected
  if (!mqtt.connected()) {
    Serial.println("ERROR connection (MQTT) lost, reconnecting...");
    static unsigned long lastTry = 0;
    if (millis() - lastTry > 5000) {
      lastTry = millis();
      mqttConnect();
    }
  } else {
    mqtt.loop();
  }

  // Publish telemetry every 1 second
  unsigned long nowMs = millis();
  if (nowMs - lastSensorsMs >= SENSORS_PERIOD_MS) {
    lastSensorsMs = nowMs;

    // Timestamp string
    String ts;
    bool timeOk = getTsString(ts);
    if (!timeOk) {
      Serial.println("ERROR time not synced");
    }

    // Temperature read
    float temp = dht.readTemperature();
    if (isnan(temp)) {
      Serial.println("ERROR DHT11 read (temp)");
      temp = -127.0; // Sentinel value
    }

    // Gas read (averaged)
    int gas = readGasAvg(10, 2);

    // --- sensors payload (1 Hz) ---
    String sensorsPayload = "{";
    sensorsPayload += "\"id\":\"" + String(DEVICE_ID) + "\",";
    sensorsPayload += "\"ts\":\"" + ts + "\",";
    sensorsPayload += "\"temp\":" + String(temp, 1) + ",";
    sensorsPayload += "\"gas\":" + String(gas);
    sensorsPayload += "}";

    if (mqtt.connected()) {
      mqttPublish(TOPIC_SENSORS, sensorsPayload);
    } else {
      Serial.println("ERROR connection (MQTT) not connected, sensors not sent");
    }

    // --- alerts logic (edge-triggered) ---
    bool shouldAlert = (gas >= GAS_THRESHOLD) || (temp >= TEMP_THRESHOLD);

    // Send threshold alert once when entering alert state
    if (shouldAlert && !alertActive) {
      alertActive = true;

      String reason = (gas >= GAS_THRESHOLD && temp >= TEMP_THRESHOLD) ? "gas_temp"
                     : (gas >= GAS_THRESHOLD) ? "gas"
                     : "temp";

      String alertPayload = "{";
      alertPayload += "\"id\":\"" + String(DEVICE_ID) + "\",";
      alertPayload += "\"ts\":\"" + ts + "\",";
      alertPayload += "\"level\":1,";
      alertPayload += "\"temp\":" + String(temp, 1) + ",";
      alertPayload += "\"gas\":" + String(gas) + ",";
      alertPayload += "\"msg\":\"threshold\",";
      alertPayload += "\"reason\":\"" + reason + "\"";
      alertPayload += "}";

      if (mqtt.connected()) {
        mqttPublish(TOPIC_ALERTS, alertPayload);
      } else {
        Serial.println("ERROR connection (MQTT) not connected, alert not sent");
      }
    }

    // Send clear once when exiting alert state
    if (!shouldAlert && alertActive) {
      alertActive = false;

      String clearPayload = "{";
      clearPayload += "\"id\":\"" + String(DEVICE_ID) + "\",";
      clearPayload += "\"ts\":\"" + ts + "\",";
      clearPayload += "\"level\":0,";
      clearPayload += "\"temp\":" + String(temp, 1) + ",";
      clearPayload += "\"gas\":" + String(gas) + ",";
      clearPayload += "\"msg\":\"clear\"";
      clearPayload += "}";

      if (mqtt.connected()) {
        mqttPublish(TOPIC_ALERTS, clearPayload);
      } else {
        Serial.println("ERROR connection (MQTT) not connected, clear not sent");
      }
    }
  }
}
