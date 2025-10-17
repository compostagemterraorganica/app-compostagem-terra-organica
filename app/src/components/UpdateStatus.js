import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import updateService from '../services/updateService';

const UpdateStatus = ({ onCheckUpdate }) => {
  const [lastCheck, setLastCheck] = useState(null);

  useEffect(() => {
    // Verificar última verificação de atualização
    checkLastUpdateTime();
    
    // Verificar atualizações automaticamente na inicialização (silenciosamente)
    performAutomaticUpdate();
    
    // Configurar verificação automática a cada 30 minutos (silenciosamente)
    const interval = setInterval(() => {
      performAutomaticUpdate();
    }, 30 * 60 * 1000); // 30 minutos

    return () => clearInterval(interval);
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

  const performAutomaticUpdate = async () => {
    try {
      // Verificar e aplicar atualizações silenciosamente
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
      // Falha silenciosamente - não mostra mensagem para o usuário
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
      {/* Removido - não mostra mais informações sobre atualizações */}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    // Container vazio - componente agora funciona apenas em background
  },
});

export default UpdateStatus;
