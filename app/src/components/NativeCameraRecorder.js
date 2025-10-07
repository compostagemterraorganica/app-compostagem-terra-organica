import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Platform,
  PermissionsAndroid,
  Dimensions,
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as FileSystem from 'expo-file-system/legacy';
import * as MediaLibrary from 'expo-media-library';
import { geolocationService } from '../services/geolocationService';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

const NativeCameraRecorder = ({ onVideoRecorded, onBack }) => {
  const [isRecording, setIsRecording] = useState(false);
  const [permissionsGranted, setPermissionsGranted] = useState(false);
  const [currentLocation, setCurrentLocation] = useState(null);
  const [recordingTime, setRecordingTime] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  
  const timerRef = useRef(null);
  const cameraRef = useRef(null);

  useEffect(() => {
    requestPermissions();
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, []);

  const requestPermissions = async () => {
    try {
      if (Platform.OS === 'android') {
        // Verificar permissões já concedidas
        const cameraStatus = await PermissionsAndroid.check(PermissionsAndroid.PERMISSIONS.CAMERA);
        const audioStatus = await PermissionsAndroid.check(PermissionsAndroid.PERMISSIONS.RECORD_AUDIO);
        const locationStatus = await PermissionsAndroid.check(PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION);
        
        if (cameraStatus && audioStatus && locationStatus) {
          setPermissionsGranted(true);
          await initializeLocation();
          return;
        }

        // Solicitar permissões uma por uma para melhor controle
        const permissions = [
          PermissionsAndroid.PERMISSIONS.CAMERA,
          PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
          PermissionsAndroid.PERMISSIONS.WRITE_EXTERNAL_STORAGE,
        ];

        const results = await PermissionsAndroid.requestMultiple(permissions);
        
        // Verificar se todas foram concedidas
        const allGranted = permissions.every(
          permission => results[permission] === PermissionsAndroid.RESULTS.GRANTED
        );

        if (allGranted) {
          setPermissionsGranted(true);
          await initializeLocation();
        } else {
          // Mostrar quais permissões foram negadas
          const deniedPermissions = permissions.filter(
            permission => results[permission] !== PermissionsAndroid.RESULTS.GRANTED
          );
          
          Alert.alert(
            'Permissões Necessárias',
            `As seguintes permissões são necessárias: ${deniedPermissions.join(', ')}.\n\nVá em Configurações > Aplicativos > Terra Orgânica > Permissões para habilitar.`,
            [
              { text: 'OK' },
              { 
                text: 'Tentar Novamente', 
                onPress: () => requestPermissions() 
              }
            ]
          );
        }
      } else {
        // Para iOS, assumir que as permissões estão OK (gerenciadas pelo Expo)
        setPermissionsGranted(true);
        await initializeLocation();
      }
    } catch (error) {
      Alert.alert(
        'Erro de Permissões', 
        'Não foi possível verificar as permissões. Verifique manualmente nas configurações do dispositivo.',
        [{ text: 'OK' }]
      );
    }
  };

  const initializeLocation = async () => {
    try {
        const location = await geolocationService.getCurrentLocation();
        setCurrentLocation(location);
      
      // Atualizar localização periodicamente
      const locationInterval = setInterval(async () => {
        try {
          const newLocation = await geolocationService.getCurrentLocation();
          setCurrentLocation(newLocation);
        } catch (error) {
          // Erro silencioso
        }
      }, 5000); // A cada 5 segundos
      
      return () => clearInterval(locationInterval);
    } catch (error) {
      // Erro silencioso
    }
  };

  const startRecording = async () => {
    try {
      setIsLoading(true);
      
      if (!cameraRef.current) {
        throw new Error('Câmera não está pronta');
      }
      
      
      setIsRecording(true);
      setRecordingTime(0);
      setIsLoading(false);
        
      // Iniciar timer
      timerRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);

      // Atualizar localização a cada 3 segundos durante gravação
      const locationTimer = setInterval(async () => {
        try {
          const location = await geolocationService.getCurrentLocation();
          setCurrentLocation(location);
        } catch (error) {
          // Erro silencioso
        }
      }, 3000);

      // Armazenar o timer para limpar depois
      timerRef.locationTimer = locationTimer;
      
      // Iniciar gravação (Promise que só resolve quando parar)
      cameraRef.current.recordAsync({
        maxDuration: 300, // 5 minutos máximo
      }).then(video => {
        
        // Retornar vídeo com dados GPS
        const videoData = {
          uri: video.uri,
          type: 'video/mp4',
          name: `video-gps-${Date.now()}.mp4`,
          location: currentLocation,
          timestamp: new Date().toISOString(),
          duration: recordingTime,
        };
        
        onVideoRecorded(videoData);
      }).catch(error => {
        Alert.alert('Erro', 'Falha ao gravar vídeo');
      });
      
    } catch (error) {
      Alert.alert('Erro', `Falha ao iniciar gravação: ${error.message}`);
      setIsLoading(false);
    }
  };

  const stopRecording = async () => {
    try {
      
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }

      if (timerRef.locationTimer) {
        clearInterval(timerRef.locationTimer);
      }

      if (!cameraRef.current) {
        throw new Error('Câmera não está disponível');
      }

      // Parar gravação do Expo Camera (isso faz o recordAsync resolver)
      cameraRef.current.stopRecording();
      
      setIsRecording(false);
      setRecordingTime(0);

    } catch (error) {
      Alert.alert('Erro', 'Falha ao parar gravação do vídeo.');
      setIsRecording(false);
      setRecordingTime(0);
    }
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };


  if (!permissionsGranted) {
    return (
      <View style={styles.container}>
        <View style={styles.permissionContainer}>
          <Text style={styles.permissionTitle}>🔒 Permissões Necessárias</Text>
          <Text style={styles.permissionText}>
            Este módulo nativo requer permissões para:
            {'\n'}• 📹 Câmera - Para gravar vídeos
            {'\n'}• 🎤 Microfone - Para gravar áudio
            {'\n'}• 📍 Localização GPS - Para watermark de geolocalização
          </Text>
          
          <View style={styles.permissionSteps}>
            <Text style={styles.stepsTitle}>Como habilitar:</Text>
            <Text style={styles.stepText}>1. Toque em "Solicitar Permissões"</Text>
            <Text style={styles.stepText}>2. Aceite cada permissão no popup</Text>
            <Text style={styles.stepText}>3. Se negar, vá em Configurações {'>'} Apps {'>'} Terra Orgânica {'>'} Permissões</Text>
          </View>
          
          <TouchableOpacity 
            style={styles.permissionButton}
            onPress={requestPermissions}
          >
            <Text style={styles.permissionButtonText}>🔓 Solicitar Permissões</Text>
          </TouchableOpacity>
        </View>
        
        <TouchableOpacity style={styles.backButton} onPress={onBack}>
          <Text style={styles.backButtonText}>← Voltar</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Área da câmera REAL com preview */}
      <View style={styles.cameraContainer}>
        <CameraView
          ref={cameraRef}
          style={styles.camera}
          facing="back"
          mode="video"
          onCameraReady={() => {
            startRecording();
          }}
        >
          {/* Overlay de informações GPS sobre o preview */}
        <View style={styles.infoOverlay}>
          <Text style={styles.infoText}>
            📍 {currentLocation ? 
              `${currentLocation.latitude.toFixed(6)}, ${currentLocation.longitude.toFixed(6)}` : 
              'Localizando...'
            }
          </Text>
          <Text style={styles.infoText}>
            📅 {new Date().toLocaleString('pt-BR')}
          </Text>
          {currentLocation && (
            <Text style={styles.infoText}>
              Precisão: ±{Math.round(currentLocation.accuracy)}m
            </Text>
          )}
        </View>

        {/* Indicador de gravação */}
        {isRecording && (
          <View style={styles.recordingIndicator}>
            <View style={styles.recordingDot} />
            <Text style={styles.recordingText}>
              REC {formatTime(recordingTime)}
            </Text>
          </View>
        )}
        </CameraView>
      </View>

      {/* Controles simplificados */}
      <View style={styles.controlsContainer}>
        <TouchableOpacity style={styles.backButton} onPress={onBack}>
          <Text style={styles.backButtonText}>← Voltar</Text>
        </TouchableOpacity>

        <View style={styles.infoContainer}>
          <Text style={styles.infoLabel}>Status:</Text>
          <Text style={styles.infoValue}>
            {isLoading ? 'Inicializando...' : 
             isRecording ? 'Gravando automaticamente' : 
             'Preparando gravação...'}
          </Text>
        </View>
      </View>

      {/* Informações técnicas */}
      <View style={styles.techInfo}>
        <Text style={styles.techTitle}>📹 Gravação Automática + GPS</Text>
        <Text style={styles.techText}>
          • Gravação automática ao abrir a câmera
        </Text>
        <Text style={styles.techText}>
          • Localização GPS em tempo real
        </Text>
        <Text style={styles.techText}>
          • Dados GPS salvos nos metadados
        </Text>
        <Text style={styles.techText}>
          • Máximo de 5 minutos por gravação
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  permissionContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  permissionTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 20,
    textAlign: 'center',
  },
  permissionText: {
    fontSize: 16,
    color: '#ccc',
    textAlign: 'center',
    marginBottom: 30,
    lineHeight: 24,
  },
  permissionButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 30,
    paddingVertical: 15,
    borderRadius: 25,
  },
  permissionButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  permissionSteps: {
    backgroundColor: 'rgba(0, 122, 255, 0.1)',
    padding: 15,
    borderRadius: 10,
    marginVertical: 20,
    borderWidth: 1,
    borderColor: 'rgba(0, 122, 255, 0.3)',
  },
  stepsTitle: {
    color: '#007AFF',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  stepText: {
    color: '#ccc',
    fontSize: 14,
    marginBottom: 5,
    lineHeight: 20,
  },
  cameraContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#1a1a1a',
    margin: 20,
    borderRadius: 15,
    position: 'relative',
    overflow: 'hidden',
  },
  camera: {
    width: '100%',
    height: '100%',
  },
  cameraPlaceholder: {
    fontSize: 24,
    color: '#fff',
    fontWeight: 'bold',
    marginBottom: 10,
  },
  cameraSubtext: {
    fontSize: 16,
    color: '#888',
    textAlign: 'center',
  },
  infoOverlay: {
    position: 'absolute',
    top: 20,
    left: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    padding: 15,
    borderRadius: 10,
    minWidth: 250,
  },
  infoText: {
    color: '#fff',
    fontSize: 14,
    marginBottom: 5,
    fontWeight: '500',
  },
  recordingIndicator: {
    position: 'absolute',
    top: 20,
    right: 20,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 0, 0, 0.8)',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 20,
  },
  recordingDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#fff',
    marginRight: 8,
  },
  recordingText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  controlsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 20,
  },
  backButton: {
    backgroundColor: '#333',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 20,
  },
  backButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  infoContainer: {
    alignItems: 'flex-end',
  },
  infoLabel: {
    color: '#888',
    fontSize: 12,
  },
  infoValue: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  techInfo: {
    backgroundColor: '#1a1a1a',
    margin: 20,
    padding: 15,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#333',
  },
  techTitle: {
    color: '#007AFF',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  techText: {
    color: '#ccc',
    fontSize: 12,
    marginBottom: 3,
  },
});

export default NativeCameraRecorder;

