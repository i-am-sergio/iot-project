import React, { useState, useEffect, forwardRef, useImperativeHandle, useRef } from 'react';
import { StyleSheet, View, Text, TouchableOpacity } from 'react-native';
import { CameraView as ExpoCameraView, useCameraPermissions, useMicrophonePermissions } from 'expo-camera';
import { MaterialCommunityIcons } from '@expo/vector-icons';

interface CameraViewProps {
  isRecording: boolean; // Visual indicator only now
}

export interface CameraRef {
  takePicture: () => Promise<string | undefined>;
}

// Usamos forwardRef para que el componente padre (App) pueda llamar a funciones de la cámara
export const CameraView = forwardRef<CameraRef, CameraViewProps>(({ isRecording }, ref) => {
  const [permission, requestPermission] = useCameraPermissions();
  const [micPermission, requestMicPermission] = useMicrophonePermissions();
  const cameraRef = useRef<ExpoCameraView>(null);
  
  // Exponemos la función takePicture al padre
  useImperativeHandle(ref, () => ({
    takePicture: async () => {
      if (cameraRef.current) {
        try {
          const photo = await cameraRef.current.takePictureAsync({
            quality: 0.7,
            base64: false,
            skipProcessing: true, // Más rápido
          });
          return photo?.uri;
        } catch (e) {
          console.error("Error tomando foto:", e);
          return undefined;
        }
      }
    }
  }));

  useEffect(() => {
    if (!permission?.granted) requestPermission();
    if (!micPermission?.granted) requestMicPermission();
  }, []);

  if (!permission?.granted || !micPermission?.granted) {
    return (
      <View style={styles.container}>
        <Text style={styles.text}>Necesitamos permisos de cámara y micrófono</Text>
        <TouchableOpacity onPress={requestPermission} style={styles.button}>
          <Text style={styles.buttonText}>Dar Permisos</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ExpoCameraView 
        ref={cameraRef}
        style={styles.camera} 
        facing="back"
        mode="picture" 
      >
        <View style={styles.overlay}>
          {isRecording && (
            <View style={styles.recordingBadge}>
              <View style={styles.redDot} />
              <Text style={styles.recText}>GRABANDO AUDIO</Text>
            </View>
          )}
        </View>
      </ExpoCameraView>
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
    borderRadius: 16,
    overflow: 'hidden',
  },
  camera: {
    flex: 1,
  },
  text: {
    color: 'white',
    textAlign: 'center',
    marginTop: 20
  },
  button: {
    backgroundColor: '#2563eb',
    padding: 10,
    borderRadius: 8,
    alignSelf: 'center',
    marginTop: 10
  },
  buttonText: {
    color: 'white'
  },
  overlay: {
    flex: 1,
    backgroundColor: 'transparent',
    padding: 16,
    justifyContent: 'space-between'
  },
  recordingBadge: {
    alignSelf: 'center',
    marginTop: 20,
    backgroundColor: 'rgba(239, 68, 68, 0.9)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8
  },
  redDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: 'white',
  },
  recText: {
    color: 'white',
    fontSize: 14,
    fontWeight: 'bold'
  }
});