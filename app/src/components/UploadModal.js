import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  Alert,
  TextInput,
  ActivityIndicator,
  Linking,
  ScrollView,
  Modal
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { getConfig } from '../config/environment';
import userCentralService from '../services/userCentralService';
const API_BASE_URL = getConfig('API_BASE_URL');

export default function UploadModal({ video, onClose, onUploadSuccess }) {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [centrals, setCentrals] = useState([]);
  const [selectedCentral, setSelectedCentral] = useState(null);
  const [volume, setVolume] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState('');
  const [showCentralModal, setShowCentralModal] = useState(false);
  const [loadingCentrals, setLoadingCentrals] = useState(true);

  // Função helper para obter o nome da central de forma consistente
  const getCentralName = (central) => {
    if (!central) return 'Central não selecionada';
    
    // Se tem title.rendered (estrutura da API WordPress direta)
    if (central.title && central.title.rendered) {
      return central.title.rendered;
    }
    
    // Se tem name (estrutura do userCentralService)
    if (central.name) {
      return central.name;
    }
    
    // Fallback
    return `Central ${central.id}`;
  };

  useEffect(() => {
    checkLoginStatus();
    loadCentrals();
    loadSavedCentral();
  }, []);

  // Escutar mudanças no estado de login global
  useEffect(() => {
    const checkLoginPeriodically = setInterval(async () => {
      const jwtToken = await AsyncStorage.getItem('wp_session_id');
      if (jwtToken && !isLoggedIn) {
        setIsLoggedIn(true);
      }
    }, 1000);

    return () => clearInterval(checkLoginPeriodically);
  }, [isLoggedIn]);

  const checkLoginStatus = async () => {
    try {
      const jwtToken = await AsyncStorage.getItem('wp_session_id');
      if (jwtToken) {
        // Verificar se o JWT ainda é válido
        const response = await fetch(`${API_BASE_URL}/me`, {
          headers: {
            'Authorization': `Bearer ${jwtToken}`
          }
        });
        
        if (response.ok) {
          setIsLoggedIn(true);
        } else {
          // JWT expirado ou inválido, limpar
          await AsyncStorage.removeItem('wp_session_id');
          await AsyncStorage.removeItem('wp_user_data');
        }
      }
    } catch (error) {
      // Erro silencioso
    }
  };


  const loadCentrals = async () => {
    setLoadingCentrals(true);
    
    try {
      // Primeiro, vamos testar todas as relações para debug
      const allRelations = await userCentralService.getAllRelations();
      
      // Agora buscar centrais específicas do usuário logado
      const userCentrals = await userCentralService.getCurrentUserCentrals();
      
      setCentrals(userCentrals);
      
      if (userCentrals.length === 0) {
        Alert.alert(
          'Aviso', 
          'Nenhuma central foi encontrada para este usuário. Verifique se o usuário está associado a alguma central.'
        );
      } else if (userCentrals.length === 1) {
        // Se o usuário possui apenas uma central, selecionar automaticamente
        setSelectedCentral(userCentrals[0]);
        // Salvar a central selecionada automaticamente
        AsyncStorage.setItem('saved_central', JSON.stringify(userCentrals[0]));
      } else {
      }
      
    } catch (error) {
      Alert.alert('Erro', `Não foi possível carregar as centrais do usuário: ${error.message}`);
      setCentrals([]);
    } finally {
      setLoadingCentrals(false);
    }
  };

  const loadSavedCentral = async () => {
    try {
      const savedCentral = await AsyncStorage.getItem('saved_central');
      if (savedCentral) {
        const central = JSON.parse(savedCentral);
        setSelectedCentral(central);
      }
    } catch (error) {
      // Silently fail
    }
  };

  const handleLogin = async () => {
    try {
      const authUrl = `${getConfig('WORDPRESS_BASE_URL')}/oauth/authorize?response_type=code&client_id=${getConfig('WORDPRESS_OAUTH_CLIENT_ID')}&redirect_uri=${getConfig('WORDPRESS_OAUTH_REDIRECT_URI')}&scope=basic&state=app`;
      
      // Abrir no navegador padrão - a API vai redirecionar via deep link
      const supported = await Linking.canOpenURL(authUrl);
      if (supported) {
        await Linking.openURL(authUrl);
      } else {
        Alert.alert('Erro', 'Não é possível abrir o navegador para login.');
      }
    } catch (error) {
      Alert.alert('Erro', 'Não foi possível abrir a página de login.');
    }
  };


  const handleCentralSelect = (central) => {
    setSelectedCentral(central);
    // Salvar central selecionada
    AsyncStorage.setItem('saved_central', JSON.stringify(central));
  };


  const handleUpload = async () => {
    if (!selectedCentral || !volume) {
      Alert.alert('Erro', 'Por favor, selecione uma central e informe o volume.');
      return;
    }

    setIsUploading(true);
    setUploadProgress('Fazendo upload para o YouTube...');
    let youtubeUrl = null;
    let youtubeError = null;

    try {
      // 1. Tentar upload para YouTube
      try {
        const youtubeResponse = await uploadToYouTube();
        youtubeUrl = youtubeResponse.video?.url || youtubeResponse.videoUrl;
        
        if (!youtubeUrl) {
          throw new Error('URL do YouTube não foi retornada corretamente');
        }
        setUploadProgress('Upload para YouTube concluído! Postando volume no site...');
      } catch (ytError) {
        youtubeError = ytError;
      }

      // 2. Se falhou no YouTube, perguntar se quer postar mesmo assim
      if (youtubeError) {
        setUploadProgress('');
        const shouldPostAnyway = await new Promise((resolve) => {
          Alert.alert(
            'Erro no Upload do YouTube',
            `Não foi possível enviar o vídeo para o YouTube:\n\n${youtubeError.message}\n\nDeseja postar no WordPress mesmo assim (sem o link do vídeo)?`,
            [
              {
                text: 'Não',
                style: 'cancel',
                onPress: () => resolve(false)
              },
              {
                text: 'Sim, Postar Mesmo Assim',
                onPress: () => resolve(true)
              }
            ]
          );
        });

        if (!shouldPostAnyway) {
          setUploadProgress('');
          setIsUploading(false);
          return;
        }

        setUploadProgress('Postando volume no site (sem link do YouTube)...');
      }

      // 3. Postar no WordPress (com ou sem link do YouTube)
      await postToWordPress(youtubeUrl);

      setUploadProgress('');
      if (youtubeUrl) {
        Alert.alert('Sucesso!', 'Coleta postada com sucesso!');
      } 
      
      // Chamar callback de sucesso se fornecido
      if (onUploadSuccess) {
        onUploadSuccess(video.id, {
          central: selectedCentral,
          volume: volume,
          youtubeUrl: youtubeUrl,
          uploadedAt: new Date().toISOString()
        });
      }
      
      onClose();
    } catch (error) {
      setUploadProgress('');
      Alert.alert('Erro', `Não foi possível postar: ${error.message}`);
    } finally {
      setIsUploading(false);
      setUploadProgress('');
    }
  };

  const uploadToYouTube = async () => {
    try {
      const formData = new FormData();
      formData.append('video', {
        uri: video.uri,
        type: 'video/mp4',
        name: 'video.mp4'
      });

      const title = `${getCentralName(selectedCentral)} - ${new Date().toLocaleDateString('pt-BR')}`;
      
      let description = `Central: ${getCentralName(selectedCentral)}\n`;
      description += `Volume: ${volume} Kg\n`;
      description += `Data: ${new Date().toLocaleString('pt-BR')}\n`;
      
      if (video.location) {
        description += `Localização: ${video.location.formattedLocation}\n`;
        if (video.location.address) {
          description += `Endereço: ${video.location.address}\n`;
        }
      }

      formData.append('title', title);
      formData.append('description', description);

      const response = await fetch(`${API_BASE_URL}/youtube/upload`, {
        method: 'POST',
        body: formData,
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || 'Erro no upload do YouTube');
      }

      return data;
    } catch (error) {
      throw error;
    }
  };

  const postToWordPress = async (youtubeUrl = null) => {
    try {
      // Obter o JWT do AsyncStorage para autenticação
      const jwtToken = await AsyncStorage.getItem('wp_session_id');
      
      if (!jwtToken) {
        throw new Error('JWT expirado. Por favor, faça login novamente.');
      }

      // Formatar data no padrão YYYY-MM-DD
      const hoje = new Date();
      const dia = String(hoje.getDate()).padStart(2, '0');
      const mes = String(hoje.getMonth() + 1).padStart(2, '0');
      const ano = hoje.getFullYear();
      const dataFormatada = `${ano}-${mes}-${dia}`; // Formato YYYY-MM-DD
      
      const postData = {
        title: `${getCentralName(selectedCentral)} - ${new Date().toLocaleDateString('pt-BR')}`,
        meta: {
          central: selectedCentral.id.toString(),
          volume: volume,
          data: dataFormatada, // Formato YYYY-MM-DD
          'link-do-video': youtubeUrl || '' // Vazio se não tiver link do YouTube
        },
        status: 'publish' // Publicar diretamente
      };

      // Usar a rota do backend que tem o access_token real do WordPress
      const response = await fetch(`${API_BASE_URL}/create-post`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${jwtToken}` // JWT do nosso backend
        },
        body: JSON.stringify(postData)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Erro na postagem do WordPress');
      }

      const result = await response.json();
      return result;
    } catch (error) {
      throw error;
    }
  };

  if (!isLoggedIn) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.closeButton} onPress={onClose}>
            <Text style={styles.closeButtonText}>✕</Text>
          </TouchableOpacity>
          <Text style={styles.title}>Upload de Vídeo</Text>
        </View>
        
        <View style={styles.content}>
          <Text style={styles.message}>
            Para fazer upload do vídeo, você precisa estar logado no WordPress.
          </Text>
          
          <TouchableOpacity style={styles.loginButton} onPress={handleLogin}>
            <Text style={styles.loginButtonText}>🔐 Fazer Login no WordPress</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.closeButton} onPress={onClose}>
          <Text style={styles.closeButtonText}>✕</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Upload de Vídeo</Text>
      </View>
      
      <ScrollView style={styles.content}>
        <Text style={styles.sectionTitle}>Selecione a Central</Text>
        {loadingCentrals ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator color="#4CAF50" size="small" />
            <Text style={styles.loadingText}>Carregando centrais...</Text>
          </View>
        ) : (
          <TouchableOpacity 
            style={styles.centralSelector}
            onPress={() => setShowCentralModal(true)}
          >
            <Text style={styles.centralSelectorText}>
              {selectedCentral ? getCentralName(selectedCentral) : 'Selecione uma central...'}
            </Text>
            <Text style={styles.centralSelectorIcon}>▼</Text>
          </TouchableOpacity>
        )}
        
        <Text style={styles.sectionTitle}>Volume (Kg)</Text>
        <TextInput
          style={styles.input}
          value={volume}
          onChangeText={setVolume}
          placeholder="Digite o volume em Kg"
          keyboardType="numeric"
        />
        
        {uploadProgress && (
          <View style={styles.progressContainer}>
            <ActivityIndicator size="small" color="#4ecdc4" />
            <Text style={styles.progressText}>{uploadProgress}</Text>
          </View>
        )}
        
        <TouchableOpacity
          style={[styles.uploadButton, isUploading && styles.uploadButtonDisabled]}
          onPress={handleUpload}
          disabled={isUploading}
        >
          {isUploading && !uploadProgress ? (
            <ActivityIndicator color="#ffffff" />
          ) : (
            <Text style={styles.uploadButtonText}>📤 Fazer Upload</Text>
          )}
        </TouchableOpacity>
      </ScrollView>

      {/* Modal de seleção de centrais */}
      <Modal
        visible={showCentralModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowCentralModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Selecione uma Central</Text>
              <TouchableOpacity 
                style={styles.modalCloseButton}
                onPress={() => setShowCentralModal(false)}
              >
                <Text style={styles.modalCloseText}>✕</Text>
              </TouchableOpacity>
            </View>
            
            <ScrollView style={styles.centralList}>
              {loadingCentrals ? (
                <View style={styles.loadingContainer}>
                  <Text style={styles.loadingText}>Carregando centrais do usuário...</Text>
                </View>
              ) : Array.isArray(centrals) && centrals.length > 0 ? centrals.map((central) => (
                <TouchableOpacity
                  key={central.id}
                  style={[
                    styles.centralItem,
                    selectedCentral?.id === central.id && styles.centralItemSelected
                  ]}
                  onPress={() => {
                    handleCentralSelect(central);
                    setShowCentralModal(false);
                  }}
                >
                  <View style={styles.centralItemContent}>
                    <Text style={[
                      styles.centralText,
                      selectedCentral?.id === central.id && styles.centralTextSelected
                    ]}>
                      {central.name}
                    </Text>
                  </View>
                  {selectedCentral?.id === central.id && (
                    <Text style={styles.selectedIcon}>✓</Text>
                  )}
                </TouchableOpacity>
              )) : (
                <View style={styles.emptyContainer}>
                  <Text style={styles.emptyText}>Nenhuma central disponível</Text>
                  <Text style={styles.emptySubtext}>
                    Este usuário não está associado a nenhuma central
                  </Text>
                  <TouchableOpacity
                    style={styles.retryButton}
                    onPress={loadCentrals}
                  >
                    <Text style={styles.retryButtonText}>🔄 Tentar Novamente</Text>
                  </TouchableOpacity>
                </View>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1a1a',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 50,
    paddingBottom: 20,
    paddingHorizontal: 20,
    backgroundColor: '#2d2d2d',
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  closeButtonText: {
    color: '#ffffff',
    fontSize: 20,
    fontWeight: 'bold',
  },
  title: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: 'bold',
    flex: 1,
  },
  content: {
    flex: 1,
    padding: 20,
  },
  message: {
    color: '#cccccc',
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 30,
    lineHeight: 24,
  },
  loginButton: {
    backgroundColor: '#4ecdc4',
    paddingVertical: 15,
    paddingHorizontal: 30,
    borderRadius: 10,
    alignItems: 'center',
  },
  loginButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  sectionTitle: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 15,
    marginTop: 20,
  },
  centralItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#2d2d2d',
    padding: 15,
    borderRadius: 10,
    marginBottom: 10,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  centralItemSelected: {
    borderColor: '#4ecdc4',
    backgroundColor: '#3d3d3d',
  },
  centralText: {
    color: '#cccccc',
    fontSize: 14,
  },
  centralTextSelected: {
    color: '#4ecdc4',
    fontWeight: 'bold',
  },
  centralItemContent: {
    flex: 1,
  },
  centralIdText: {
    fontSize: 12,
    color: '#999',
    fontStyle: 'italic',
    marginTop: 2,
  },
  selectedIcon: {
    fontSize: 18,
    color: '#4ecdc4',
    fontWeight: 'bold',
  },
  loadingContainer: {
    padding: 20,
    alignItems: 'center',
  },
  loadingText: {
    color: '#cccccc',
    fontSize: 14,
  },
  emptyContainer: {
    padding: 30,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: '#cccccc',
    marginBottom: 5,
    textAlign: 'center',
  },
  emptySubtext: {
    fontSize: 12,
    color: '#999',
    marginBottom: 15,
    textAlign: 'center',
  },
  retryButton: {
    backgroundColor: '#4ecdc4',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
  input: {
    backgroundColor: '#2d2d2d',
    color: '#ffffff',
    padding: 15,
    borderRadius: 10,
    fontSize: 16,
    marginBottom: 20,
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2d2d2d',
    padding: 15,
    borderRadius: 10,
    marginTop: 20,
    gap: 10,
  },
  progressText: {
    color: '#4ecdc4',
    fontSize: 14,
    fontWeight: '600',
    flex: 1,
  },
  uploadButton: {
    backgroundColor: '#4CAF50',
    paddingVertical: 15,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 20,
  },
  uploadButtonDisabled: {
    backgroundColor: '#666666',
  },
  uploadButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  centralSelector: {
    backgroundColor: '#2d2d2d',
    borderWidth: 1,
    borderColor: '#444',
    borderRadius: 8,
    padding: 15,
    marginBottom: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  centralSelectorText: {
    color: '#ffffff',
    fontSize: 16,
    flex: 1,
  },
  centralSelectorIcon: {
    color: '#888',
    fontSize: 16,
    marginLeft: 10,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#2d2d2d',
    borderRadius: 10,
    width: '90%',
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#444',
  },
  modalTitle: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  modalCloseButton: {
    padding: 5,
  },
  modalCloseText: {
    color: '#888',
    fontSize: 20,
    fontWeight: 'bold',
  },
  centralList: {
    maxHeight: 300,
  },
  loadingContainer: {
    backgroundColor: '#2d2d2d',
    borderWidth: 1,
    borderColor: '#444',
    borderRadius: 8,
    padding: 15,
    marginBottom: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    color: '#ffffff',
    fontSize: 16,
    marginLeft: 10,
  },
});
