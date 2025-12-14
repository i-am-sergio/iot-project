import React, { useEffect, useState, useRef } from "react";
import {
  StyleSheet,
  View,
  Text,
  StatusBar,
  SafeAreaView,
  Platform,
  TouchableOpacity,
  Alert,
} from "react-native";
import * as Notifications from "expo-notifications";
import { Audio } from "expo-av"; // Importamos Audio
import { useKeepAwake } from "expo-keep-awake";
import { MaterialCommunityIcons } from "@expo/vector-icons";

import { CameraView, CameraRef } from "./components/CameraView";
import { ConnectionStatus } from "./components/ConnectionStatus";
import { mqttService } from "./services/mqttService";
import { DEFAULT_CONFIG, RECORDING_DURATION_MS } from "./constants";
import { AppStatus, MqttConnectionState } from "./types";

const WAV_RECORDING_OPTIONS: any = {
  isMeteringEnabled: true,
  android: {
    extension: ".m4a",
    outputFormat: Audio.AndroidOutputFormat.MPEG_4,
    audioEncoder: Audio.AndroidAudioEncoder.AAC,
    sampleRate: 44100,
    numberOfChannels: 1,
    bitRate: 128000,
  },
  ios: {
    extension: ".m4a",
    outputFormat: Audio.IOSOutputFormat.MPEG4AAC,
    audioQuality: Audio.IOSAudioQuality.MAX,
    sampleRate: 44100,
    numberOfChannels: 1,
    bitRate: 128000,
    linearPCMBitDepth: 16,
    linearPCMIsBigEndian: false,
    linearPCMIsFloat: false,
  },
  web: {
    mimeType: "audio/wav",
    bitsPerSecond: 128000,
  },
};

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export default function App() {
  useKeepAwake("SentinelMobile");

  const [status, setStatus] = useState<AppStatus>(AppStatus.IDLE);
  const [mqttState, setMqttState] = useState<MqttConnectionState>(
    MqttConnectionState.DISCONNECTED
  );

  // Referencia a la cámara para tomar fotos manualmente
  const cameraComponentRef = useRef<CameraRef>(null);
  // Referencia para la grabación de audio
  const audioRecordingRef = useRef<Audio.Recording | null>(null);
  const responseListener = useRef<Notifications.Subscription | null>(null);

  useEffect(() => {
    registerForPushNotificationsAsync();
    setupAudioMode();

    responseListener.current =
      Notifications.addNotificationResponseReceivedListener((response) => {
        console.log("Notificación tocada -> Iniciando captura");
        if (status === AppStatus.IDLE) {
          handleCaptureAndSend();
        }
      });

    mqttService.connect(
      DEFAULT_CONFIG.mqttBrokerUrl,
      DEFAULT_CONFIG.mqttTopic,
      (s) => setMqttState(s),
      (topic, msg) => {
        handleAlertReceived();
      }
    );

    return () => {
      mqttService.disconnect();
      if (responseListener.current) responseListener.current.remove();
    };
  }, []);

  const setupAudioMode = async () => {
    try {
      await Audio.requestPermissionsAsync();
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });
    } catch (e) {
      console.error("Error configurando audio:", e);
    }
  };

  const handleAlertReceived = async () => {
    await scheduleNotification();
    if (status === AppStatus.IDLE) {
      handleCaptureAndSend();
    }
  };

  const scheduleNotification = async () => {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: "🚨 ALERTA ACTIVA",
        body: "Toca para capturar evidencia (Foto + Audio).",
        sound: true,
      },
      trigger: null,
    });
  };

  const handleReconnectMqtt = () => {
    Alert.alert("Reconectar", "Intentando reconectar al servidor MQTT...");

    mqttService.disconnect();

    mqttService.connect(
      DEFAULT_CONFIG.mqttBrokerUrl,
      DEFAULT_CONFIG.mqttTopic,
      (s) => setMqttState(s),
      () => {
        handleAlertReceived();
      }
    );
  };

  // --- LÓGICA PRINCIPAL DE CAPTURA (FOTO + AUDIO) ---
  const handleCaptureAndSend = async () => {
    if (status !== AppStatus.IDLE) return;

    console.log("Iniciando secuencia: Foto + Audio");
    setStatus(AppStatus.RECORDING);

    try {
      // 1. Tomar Foto
      let photoUri = undefined;
      if (cameraComponentRef.current) {
        photoUri = await cameraComponentRef.current.takePicture();
        console.log("Foto capturada:", photoUri);
      }

      // 2. Grabar Audio (3 segundos)
      const recording = new Audio.Recording();
      await recording.prepareToRecordAsync(WAV_RECORDING_OPTIONS);

      audioRecordingRef.current = recording;
      await recording.startAsync();
      console.log("Grabando audio...");

      // Esperar 3 segundos
      await new Promise((resolve) =>
        setTimeout(resolve, RECORDING_DURATION_MS)
      );

      // 3. Detener Audio
      await recording.stopAndUnloadAsync();
      const audioUri = recording.getURI();
      console.log("Audio finalizado:", audioUri);

      // 4. Subir ambos
      if (photoUri && audioUri) {
        await uploadEvidence(photoUri, audioUri);
      } else {
        Alert.alert("Error", "No se pudo capturar foto o audio.");
        setStatus(AppStatus.IDLE);
      }
    } catch (error) {
      console.error("Error en secuencia:", error);
      setStatus(AppStatus.ERROR);
      setTimeout(() => setStatus(AppStatus.IDLE), 3000);
    }
  };

  const uploadEvidence = async (photoUri: string, audioUri: string) => {
    setStatus(AppStatus.UPLOADING);

    try {
      // Usamos FormData para enviar múltiples archivos
      const formData = new FormData();

      // Adjuntar Foto
      // @ts-ignore: React Native FormData espera un objeto con uri, name, type
      formData.append("photo", {
        uri: photoUri,
        name: "evidence_photo.png",
        type: "image/png",
      });

      // Adjuntar Audio
      // @ts-ignore
      formData.append("audio", {
        uri: audioUri,
        name: "evidence_audio.m4a",
        type: "audio/mp4",
      });

      // Metadatos extra
      formData.append("topic", DEFAULT_CONFIG.mqttTopic);
      formData.append("timestamp", new Date().toISOString());

      console.log("Enviando FormData a:", DEFAULT_CONFIG.uploadEndpoint);

      const response = await fetch(DEFAULT_CONFIG.uploadEndpoint, {
        method: "POST",
        body: formData,
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });

      console.log("Respuesta subida:", response.status);

      if (response.ok) {
        setStatus(AppStatus.COMPLETED);
      } else {
        throw new Error(`Server status: ${response.status}`);
      }
    } catch (error) {
      console.error("Upload failed:", error);
      setStatus(AppStatus.ERROR);
      Alert.alert("Error de Subida", "Verifica la conexión con el servidor.");
    } finally {
      setTimeout(() => setStatus(AppStatus.IDLE), 4000);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0f172a" />

      <View style={styles.header}>
        <View style={styles.headerTitle}>
          <MaterialCommunityIcons
            name="shield-alert"
            size={24}
            color="#ef4444"
          />
          <Text style={styles.title}>Sentinel Mobile</Text>
        </View>
        <TouchableOpacity style={styles.settingsBtn}>
          <MaterialCommunityIcons name="cog" size={20} color="#94a3b8" />
        </TouchableOpacity>
      </View>

      <View style={styles.content}>
        <ConnectionStatus status={mqttState} />

        <View style={styles.cameraContainer}>
          <CameraView
            ref={cameraComponentRef}
            isRecording={status === AppStatus.RECORDING}
          />
        </View>

        <View style={styles.statusArea}>
          {status === AppStatus.IDLE && (
            <View style={styles.centerInfo}>
              <Text style={styles.infoText}>Sistema Listo</Text>

              {/* BOTÓN GRABAR Y ENVIAR */}
              <TouchableOpacity
                style={styles.recordBtn}
                onPress={handleCaptureAndSend}
                activeOpacity={0.7}
              >
                <View style={styles.recordIconOuter}>
                  <View style={styles.recordIconInner} />
                </View>
                <Text style={styles.recordBtnText}>GRABAR Y ENVIAR</Text>
                <Text style={styles.recordBtnSubtext}>(Foto + 3s Audio)</Text>
              </TouchableOpacity>

              {/* 🔄 BOTÓN REINTENTAR MQTT */}
              {mqttState !== MqttConnectionState.CONNECTED && (
                <TouchableOpacity
                  style={styles.reconnectBtn}
                  onPress={handleReconnectMqtt}
                  activeOpacity={0.7}
                >
                  <MaterialCommunityIcons
                    name="wifi-refresh"
                    size={20}
                    color="#38bdf8"
                  />
                  <Text style={styles.reconnectText}>REINTENTAR CONEXIÓN</Text>
                </TouchableOpacity>
              )}
            </View>
          )}

          {status === AppStatus.RECORDING && (
            <View style={styles.centerInfo}>
              <MaterialCommunityIcons
                name="microphone"
                size={40}
                color="#ef4444"
                style={{ marginBottom: 10 }}
              />
              <Text
                style={[
                  styles.infoText,
                  { color: "#ef4444", fontWeight: "bold" },
                ]}
              >
                CAPTURANDO EVIDENCIA...
              </Text>
              <Text style={styles.subInfoText}>No cierres la aplicación</Text>
            </View>
          )}

          {status === AppStatus.UPLOADING && (
            <View style={styles.centerInfo}>
              <MaterialCommunityIcons
                name="cloud-upload"
                size={30}
                color="#60a5fa"
              />
              <Text style={styles.infoText}>Enviando archivos...</Text>
            </View>
          )}

          {status === AppStatus.COMPLETED && (
            <View style={styles.centerInfo}>
              <MaterialCommunityIcons
                name="check-circle"
                size={40}
                color="#34d399"
              />
              <Text
                style={[
                  styles.infoText,
                  { color: "#34d399", fontWeight: "bold", marginTop: 5 },
                ]}
              >
                ¡Enviado!
              </Text>
            </View>
          )}

          {status === AppStatus.ERROR && (
            <View style={styles.centerInfo}>
              <MaterialCommunityIcons name="alert" size={30} color="#fbbf24" />
              <Text style={[styles.infoText, { color: "#fbbf24" }]}>
                Error al enviar
              </Text>
            </View>
          )}
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0f172a",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: "#1e293b",
  },
  headerTitle: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  title: {
    color: "white",
    fontSize: 20,
    fontWeight: "bold",
  },
  settingsBtn: {
    padding: 5,
    backgroundColor: "#1e293b",
    borderRadius: 20,
  },
  content: {
    flex: 1,
    padding: 20,
    gap: 20,
  },
  cameraContainer: {
    flex: 2,
    borderRadius: 16,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#334155",
  },
  statusArea: {
    flex: 1.2, // Un poco más de espacio para el botón grande
    backgroundColor: "#1e293b",
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#334155",
    padding: 20,
  },
  centerInfo: {
    alignItems: "center",
    width: "100%",
    justifyContent: "center",
  },
  infoText: {
    color: "#cbd5e1",
    fontSize: 16,
    marginBottom: 5,
  },
  subInfoText: {
    color: "#64748b",
    fontSize: 12,
  },

  // Estilos del Botón Grabar y Enviar
  recordBtn: {
    marginTop: 15,
    width: "100%",
    backgroundColor: "#b91c1c", // Rojo oscuro
    borderRadius: 12,
    paddingVertical: 15,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#ef4444",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 5,
    borderWidth: 1,
    borderColor: "#ef4444",
  },
  recordBtnText: {
    color: "white",
    fontWeight: "900",
    fontSize: 18,
    letterSpacing: 1,
  },
  recordBtnSubtext: {
    color: "#fca5a5",
    fontSize: 12,
    marginTop: 2,
  },
  recordIconOuter: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: "white",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 5,
  },
  recordIconInner: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: "white",
  },
  reconnectBtn: {
    marginTop: 15,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 10,
    width: "100%",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#38bdf8",
    backgroundColor: "#020617",
  },

  reconnectText: {
    color: "#38bdf8",
    fontWeight: "bold",
    fontSize: 14,
  },
});

async function registerForPushNotificationsAsync() {
  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("default", {
      name: "default",
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: "#FF231F7C",
    });
  }
  const { status } = await Notifications.requestPermissionsAsync();
}
