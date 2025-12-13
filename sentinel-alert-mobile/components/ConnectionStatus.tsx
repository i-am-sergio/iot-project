import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { MqttConnectionState } from '../types';

interface ConnectionStatusProps {
  status: MqttConnectionState;
}

export const ConnectionStatus: React.FC<ConnectionStatusProps> = ({ status }) => {
  const getStatusConfig = () => {
    switch (status) {
      case MqttConnectionState.CONNECTED:
        return { icon: 'wifi', color: '#34d399', text: 'Conectado a MQTT', bg: 'rgba(52, 211, 153, 0.1)' };
      case MqttConnectionState.CONNECTING:
        return { icon: 'loading', color: '#60a5fa', text: 'Conectando...', bg: 'rgba(96, 165, 250, 0.1)' };
      case MqttConnectionState.ERROR:
        return { icon: 'alert-circle', color: '#fbbf24', text: 'Error de Conexión', bg: 'rgba(251, 191, 36, 0.1)' };
      case MqttConnectionState.DISCONNECTED:
      default:
        return { icon: 'wifi-off', color: '#94a3b8', text: 'Desconectado', bg: 'rgba(148, 163, 184, 0.1)' };
    }
  };

  const config = getStatusConfig();

  return (
    <View style={[styles.container, { backgroundColor: config.bg, borderColor: config.color }]}>
      <MaterialCommunityIcons 
        name={config.icon as any} 
        size={20} 
        color={config.color} 
      />
      <Text style={[styles.text, { color: config.color }]}>{config.text}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    gap: 10,
    marginBottom: 10
  },
  text: {
    fontWeight: '600',
    fontSize: 14
  }
});