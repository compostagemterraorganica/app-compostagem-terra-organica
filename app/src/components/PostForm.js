import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ScrollView,
  ActivityIndicator,
  Picker
} from 'react-native';
import { wordpressService } from '../services/wordpressService';
import { youtubeService } from '../services/youtubeService';
import { storageService } from '../services/storageService';

export default function PostForm({ videoData, onSuccess, onCancel }) {
  const [centrals, setCentrals] = useState([]);
  const [selectedCentral, setSelectedCentral] = useState(null);
  const [volume, setVolume] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingCentrals, setLoadingCentrals] = useState(true);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    loadCentrals();
    loadLastSelectedCentral();
  }, []);

  const loadCentrals = async () => {
      try {
      setLoadingCentrals(true);
      const centralsList = await wordpressService.getCentrals();
      setCentrals(centralsList || []); // Garantir que sempre seja um array
    } catch (error) {
      Alert.alert('Erro', 'Não foi possível carregar a lista de centrais.');
      setCentrals([]); // Definir como array vazio em caso de erro
    } finally {
      setLoadingCentrals(false);
    }
  };

  const loadLastSelectedCentral = async () => {
    try {
      const lastCentralId = await storageService.getSelectedCentral();
      if (lastCentralId && centrals.length > 0) {
        const central = centrals.find(c => c.id === lastCentralId);
        if (central) {
          setSelectedCentral(central);
        }
      }
    } catch (error) {
      // Silently fail
    }
  };

  const handleSubmit = async () => {
    if (!selectedCentral) {
      Alert.alert('Erro', 'Selecione uma central');
      return;
    }

    if (!volume || isNaN(parseFloat(volume)) || parseFloat(volume) <= 0) {
      Alert.alert('Erro', 'Digite um volume válido em Litros');
      return;
    }

    try {
      setLoading(true);
      setUploading(true);

      // 1. Upload do vídeo para YouTube
      const dataGravacao = videoData.timestamp || videoData.createdAt;
      const currentDate = dataGravacao ? new Date(dataGravacao) : new Date();
      const videoTitle = youtubeService.generateVideoTitle(selectedCentral.name, currentDate);
      const videoDescription = youtubeService.generateVideoDescription({
        centralName: selectedCentral.name,
        volume: volume,
        date: currentDate.toISOString(),
        location: videoData.location,
        duration: videoData.duration
      });

      const uploadResult = await youtubeService.uploadVideo(videoData, {
        title: videoTitle,
        description: videoDescription
      });

      if (!uploadResult.success) {
        throw new Error('Falha no upload do vídeo');
      }

      // 2. Salvar central selecionada para próximas postagens
      await storageService.saveSelectedCentral(selectedCentral.id);

      // 3. Preparar dados para postagem no WordPress
      const postData = {
        title: `Verificação de Volume - ${selectedCentral.name} - ${currentDate.toLocaleDateString('pt-BR')}`,
        central: selectedCentral.id,
        volume: parseFloat(volume),
        data: currentDate,
        dateISO: currentDate.toISOString(),
        videoLink: uploadResult.videoUrl
      };

      // 4. Postar no WordPress
      const wordpressResult = await wordpressService.createVolumeVerification(postData);

      Alert.alert(
        'Sucesso!',
        'Vídeo postado com sucesso no YouTube e dados salvos no WordPress.',
        [
          {
            text: 'OK',
            onPress: () => onSuccess({
              youtubeUrl: uploadResult.videoUrl,
              wordpressPost: wordpressResult,
              central: selectedCentral,
              volume: volume,
              date: currentDate
            })
          }
        ]
      );

    } catch (error) {
      Alert.alert(
        'Erro',
        error.message || 'Não foi possível postar o vídeo. Tente novamente.'
      );
    } finally {
      setLoading(false);
      setUploading(false);
    }
  };

  const formatCurrentDate = () => {
    const now = new Date();
    return now.toLocaleDateString('pt-BR') + ' ' + now.toLocaleTimeString('pt-BR');
  };

  const formatLocationInfo = () => {
    if (!videoData.location) return 'Não disponível';
    
    let info = videoData.location.formattedLocation;
    if (videoData.location.address && videoData.location.address.formattedAddress) {
      info += `\n${videoData.location.address.formattedAddress}`;
    }
    return info;
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>📤 Postar Vídeo</Text>
        <Text style={styles.subtitle}>Complete os dados para postar o vídeo</Text>
      </View>

      {/* Informações do vídeo */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Informações do Vídeo</Text>
        
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Data da gravação:</Text>
          <Text style={styles.infoValue}>
            {new Date(videoData.recordedAt || videoData.createdAt).toLocaleDateString('pt-BR')} às {new Date(videoData.recordedAt || videoData.createdAt).toLocaleTimeString('pt-BR')}
          </Text>
        </View>

        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Localização:</Text>
          <Text style={styles.infoValue}>{formatLocationInfo()}</Text>
        </View>

        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Data da postagem:</Text>
          <Text style={styles.infoValue}>{formatCurrentDate()}</Text>
        </View>
      </View>

      {/* Formulário */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Dados da Coleta</Text>

        {/* Select de Centrais */}
        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Escolha a sua central *</Text>
          {loadingCentrals ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="small" color="#4CAF50" />
              <Text style={styles.loadingText}>Carregando centrais...</Text>
            </View>
          ) : (
            <View style={styles.pickerContainer}>
              <Picker
                selectedValue={selectedCentral?.id || ''}
                onValueChange={(value) => {
                  const central = centrals.find(c => c.id === value);
                  setSelectedCentral(central);
                }}
                style={styles.picker}
              >
                <Picker.Item label="Selecione uma central..." value="" />
                {Array.isArray(centrals) && centrals.length > 0 ? centrals.map((central) => (
                  <Picker.Item
                    key={central.id}
                    label={central.name}
                    value={central.id}
                  />
                )) : (
                  <Picker.Item label="Nenhuma central disponível" value="" />
                )}
              </Picker>
            </View>
          )}
        </View>

        {/* Volume */}
        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Volume em Litros *</Text>
          <TextInput
            style={styles.input}
            value={volume}
            onChangeText={setVolume}
            placeholder="Ex: 25.5"
            keyboardType="numeric"
            returnKeyType="done"
          />
        </View>
      </View>

      {/* Status do Upload */}
      {uploading && (
        <View style={styles.uploadStatus}>
          <ActivityIndicator size="large" color="#4CAF50" />
          <Text style={styles.uploadText}>Enviando vídeo para YouTube...</Text>
        </View>
      )}

      {/* Botões */}
      <View style={styles.buttonContainer}>
        <TouchableOpacity
          style={[styles.button, styles.cancelButton]}
          onPress={onCancel}
          disabled={loading}
        >
          <Text style={styles.cancelButtonText}>Cancelar</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.button, styles.submitButton]}
          onPress={handleSubmit}
          disabled={loading || !selectedCentral || !volume}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.submitButtonText}>Postar Vídeo</Text>
          )}
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    backgroundColor: '#4CAF50',
    padding: 20,
    paddingTop: 40,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
    color: '#E8F5E9',
  },
  section: {
    backgroundColor: '#fff',
    margin: 15,
    padding: 20,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15,
  },
  infoRow: {
    marginBottom: 12,
  },
  infoLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    marginBottom: 4,
  },
  infoValue: {
    fontSize: 16,
    color: '#333',
    lineHeight: 22,
  },
  inputGroup: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#fff',
  },
  pickerContainer: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    backgroundColor: '#fff',
  },
  picker: {
    height: 50,
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
  },
  loadingText: {
    marginLeft: 10,
    color: '#666',
  },
  uploadStatus: {
    backgroundColor: '#E8F5E9',
    margin: 15,
    padding: 20,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#4CAF50',
  },
  uploadText: {
    marginTop: 10,
    color: '#2E7D32',
    fontSize: 16,
    fontWeight: '500',
  },
  buttonContainer: {
    flexDirection: 'row',
    padding: 15,
    gap: 10,
  },
  button: {
    flex: 1,
    paddingVertical: 15,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#f44336',
  },
  cancelButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  submitButton: {
    backgroundColor: '#4CAF50',
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
