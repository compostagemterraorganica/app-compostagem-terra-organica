import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import updateService from '../services/updateService';

const UpdateStatus = ({ onCheckUpdate }) => {
  const [isChecking, setIsChecking] = useState(false);
  const [lastCheck, setLastCheck] = useState(null);

  useEffect(() => {
    // Verificar última verificação de atualização
    checkLastUpdateTime();
  }, []);

  const checkLastUpdateTime = async () => {
    try {
      const lastCheck = await AsyncStorage.getItem('last_update_check');
      if (lastCheck) {
        setLastCheck(new Date(lastCheck));
      }
    } catch (error) {
      // Silently fail
    }
  };

  const handleCheckUpdate = async () => {
    if (isChecking) return;

    try {
      setIsChecking(true);
      await updateService.forceCheckForUpdates();
      
      // Atualizar timestamp da última verificação
      const now = new Date();
      await AsyncStorage.setItem('last_update_check', now.toISOString());
      setLastCheck(now);
      
      if (onCheckUpdate) {
        onCheckUpdate();
      }
    } catch (error) {
      console.error('Erro ao verificar atualizações:', error);
    } finally {
      setIsChecking(false);
    }
  };

  const formatLastCheck = () => {
    if (!lastCheck) return 'Nunca';
    
    const now = new Date();
    const diff = now - lastCheck;
    const minutes = Math.floor(diff / 60000);
    
    if (minutes < 1) return 'Agora';
    if (minutes < 60) return `${minutes}min atrás`;
    
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h atrás`;
    
    const days = Math.floor(hours / 24);
    return `${days}d atrás`;
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity 
        style={[styles.button, isChecking && styles.buttonDisabled]} 
        onPress={handleCheckUpdate}
        disabled={isChecking}
      >
        <Text style={styles.buttonText}>
          {isChecking ? '🔄 Verificando...' : '🔄 Verificar Atualizações'}
        </Text>
      </TouchableOpacity>
      
      {lastCheck && (
        <Text style={styles.lastCheckText}>
          Última verificação: {formatLastCheck()}
        </Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    paddingVertical: 10,
  },
  button: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 20,
    marginBottom: 5,
  },
  buttonDisabled: {
    backgroundColor: '#cccccc',
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '600',
  },
  lastCheckText: {
    color: '#666666',
    fontSize: 10,
    fontStyle: 'italic',
  },
});

export default UpdateStatus;
