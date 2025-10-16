import React, { useState, useRef, useEffect, useCallback } from 'react';
import { 
  StyleSheet, 
  Text, 
  View, 
  TouchableOpacity, 
  Alert,
  Dimensions,
  Platform
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView } from 'react-native-safe-area-context';
import { 
  Camera, 
  useCameraDevices, 
  useFrameProcessor,
  runOnJS,
  useCameraPermission
} from 'react-native-vision-camera';
import * as Location from 'expo-location';

const { width, height } = Dimensions.get('window');

export default function VideoRecorderEnhanced({ onVideoRecorded, onCancel }) {
  const [isRecording, setIsRecording] = useState(false);
  const [location, setLocation] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [cameraType, setCameraType] = useState('back');
  const [recordingStartTime, setRecordingStartTime] = useState(null);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [isRecordingStarted, setIsRecordingStarted] = useState(false);
  const [currentLocation, setCurrentLocation] = useState(null);
  const [locationUpdateInterval, setLocationUpdateInterval] = useState(null);
  
  const cameraRef = useRef(null);
  const devices = useCameraDevices();
  const device = cameraType === 'back' ? devices.back : devices.front;
  const { hasPermission, requestPermission } = useCameraPermission();

  // Solicitar permissões na inicialização
  useEffect(() => {
    if (!hasPermission) {
      requestPermission();
    }
    getInitialLocation();
  }, [hasPermission]);

  // Timer para mostrar duração da gravação
  useEffect(() => {
    let interval = null;
    if (isRecording && recordingStartTime) {
      interval = setInterval(() => {
        setRecordingDuration(Math.floor((Date.now() - recordingStartTime) / 1000));
      }, 1000);
    } else {
      setRecordingDuration(0);
    }
    return () => clearInterval(interval);
  }, [isRecording, recordingStartTime]);

  // Limpar intervalos ao desmontar
  useEffect(() => {
    return () => {
      if (locationUpdateInterval) {
        clearInterval(locationUpdateInterval);
      }
    };
  }, [locationUpdateInterval]);

  const getInitialLocation = async () => {
    try {
      setIsLoading(true);
      
      // Solicitar permissão de localização
      const { status } = await Location.requestForegroundPermissionsAsync();
      
      if (status !== 'granted') {
        Alert.alert(
          'Permissão Necessária',
          'É necessário permitir o acesso à localização para adicionar coordenadas ao vídeo.'
        );
        return;
      }
      
      // Obter localização inicial
      const locationData = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
        maximumAge: 5000,
        timeout: 10000
      });
      
      const addresses = await Location.reverseGeocodeAsync({
        latitude: locationData.coords.latitude,
        longitude: locationData.coords.longitude
      });

      const address = addresses.length > 0 ? addresses[0] : null;
      
      const locationInfo = {
        latitude: locationData.coords.latitude,
        longitude: locationData.coords.longitude,
        accuracy: locationData.coords.accuracy,
        address: address ? `${address.street || ''}, ${address.city || ''}, ${address.region || ''}`.trim() : null,
        formattedLocation: `${locationData.coords.latitude.toFixed(6)}, ${locationData.coords.longitude.toFixed(6)}`
      };
      
      setLocation(locationInfo);
      setCurrentLocation(locationInfo);
      
    } catch (error) {
      Alert.alert(
        'Erro de Localização',
        'Não foi possível obter a localização atual. O vídeo será gravado sem dados de geolocalização.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  // Função para atualizar localização em tempo real
  const updateLocationInRealTime = useCallback(async () => {
    try {
      const locationData = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
        maximumAge: 2000, // Atualizar a cada 2 segundos
        timeout: 5000
      });
      
      const addresses = await Location.reverseGeocodeAsync({
        latitude: locationData.coords.latitude,
        longitude: locationData.coords.longitude
      });

      const address = addresses.length > 0 ? addresses[0] : null;
      
      const locationInfo = {
        latitude: locationData.coords.latitude,
        longitude: locationData.coords.longitude,
        accuracy: locationData.coords.accuracy,
        address: address ? `${address.street || ''}, ${address.city || ''}, ${address.region || ''}`.trim() : null,
        formattedLocation: `${locationData.coords.latitude.toFixed(6)}, ${locationData.coords.longitude.toFixed(6)}`
      };
      
      setCurrentLocation(locationInfo);
      
    } catch (error) {
      Alert.alert(
        'Erro de Localização',
        'Não foi possível obter a localização atual. O vídeo será gravado sem dados de geolocalização.'
      );
    }
  }, []);

  const startRecording = async () => {
    if (!cameraRef.current || isRecording || !hasPermission) return;

    
    try {
      setIsRecording(true);
      setRecordingStartTime(Date.now());
      setIsRecordingStarted(false);
      
      // Iniciar atualização de localização em tempo real
      const interval = setInterval(updateLocationInRealTime, 3000); // Atualizar a cada 3 segundos
      setLocationUpdateInterval(interval);
      
      // Iniciar gravação com Vision Camera
      await cameraRef.current.startRecording({
        flash: 'off',
        videoCodec: 'h264',
        onRecordingFinished: (video) => {
          handleRecordingFinished(video);
        },
        onRecordingError: (error) => {
          Alert.alert('Erro na Gravação', 'Não foi possível gravar o vídeo.');
          handleRecordingError();
        }
      });
      
      setIsRecordingStarted(true);
      
    } catch (error) {
      Alert.alert('Erro', 'Não foi possível iniciar a gravação.');
      handleRecordingError();
    }
  };

  const stopRecording = async () => {
    if (!isRecording || !cameraRef.current) return;
    
    try {
      // Parar atualização de localização
      if (locationUpdateInterval) {
        clearInterval(locationUpdateInterval);
        setLocationUpdateInterval(null);
      }
      
      await cameraRef.current.stopRecording();
    } catch (error) {
      Alert.alert('Erro na Gravação', 'Não foi possível parar a gravação.');
      handleRecordingError();
    }
  };

  const handleRecordingFinished = (video) => {
    // Limpar estado
    setIsRecording(false);
    setIsRecordingStarted(false);
    setRecordingStartTime(null);
    
    // Calcular duração real
    const duration = Math.floor((Date.now() - recordingStartTime) / 1000);
    
    // Criar dados do vídeo com localização atual
    const videoData = {
      uri: video.path,
      duration: duration,
      location: currentLocation || location,
      timestamp: new Date().toISOString(),
      coordinates: (currentLocation || location) ? {
        latitude: (currentLocation || location).latitude,
        longitude: (currentLocation || location).longitude,
        accuracy: (currentLocation || location).accuracy
      } : null,
      watermarkText: generateWatermarkText(currentLocation || location)
    };
    
    // Chamar callback para salvar
    onVideoRecorded(videoData);
  };

  const handleRecordingError = () => {
    setIsRecording(false);
    setIsRecordingStarted(false);
    setRecordingStartTime(null);
    
    // Limpar intervalo de localização
    if (locationUpdateInterval) {
      clearInterval(locationUpdateInterval);
      setLocationUpdateInterval(null);
    }
  };

  const generateWatermarkText = (loc) => {
    if (!loc) {
      return `📅 ${new Date().toLocaleString('pt-BR')}`;
    }
    
    return `📍 ${loc.formattedLocation}\n${loc.address || ''}\n📅 ${new Date().toLocaleString('pt-BR')}`;
  };

  const cancelRecording = () => {
    // Limpar intervalo de localização
    if (locationUpdateInterval) {
      clearInterval(locationUpdateInterval);
      setLocationUpdateInterval(null);
    }
    
    setIsRecording(false);
    setIsRecordingStarted(false);
    setRecordingStartTime(null);
    onCancel();
  };

  if (!hasPermission) {
    return (
      <SafeAreaView style={styles.container}>
        <Text style={styles.message}>Solicitando permissões...</Text>
        <TouchableOpacity 
          style={styles.button} 
          onPress={requestPermission}
        >
          <Text style={styles.buttonText}>Conceder Permissões</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  if (!device) {
    return (
      <SafeAreaView style={styles.container}>
        <Text style={styles.message}>Câmera não disponível</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.recorderContainer}>
      <StatusBar hidden />
      
      <Camera
        style={styles.camera}
        device={device}
        isActive={true}
        ref={cameraRef}
        video={true}
        audio={true}
      />

      {/* Overlay de geolocalização que será capturado no vídeo */}
      <View style={styles.locationOverlay}>
        {currentLocation ? (
          <>
            <Text style={styles.locationText}>
              📍 {currentLocation.formattedLocation}
            </Text>
            {currentLocation.address && (
              <Text style={styles.locationAddress}>
                {currentLocation.address}
              </Text>
            )}
            <Text style={styles.locationTime}>
              📅 {new Date().toLocaleString('pt-BR')}
            </Text>
            <Text style={styles.locationAccuracy}>
              Precisão: ±{Math.round(currentLocation.accuracy)}m
            </Text>
          </>
        ) : location ? (
          <>
            <Text style={styles.locationText}>
              📍 {location.formattedLocation}
            </Text>
            {location.address && (
              <Text style={styles.locationAddress}>
                {location.address}
              </Text>
            )}
            <Text style={styles.locationTime}>
              📅 {new Date().toLocaleString('pt-BR')}
            </Text>
          </>
        ) : (
          <Text style={styles.locationText}>
            📅 {new Date().toLocaleString('pt-BR')}
          </Text>
        )}
      </View>

      {/* Controles da câmera */}
      <View style={styles.controls}>
        <TouchableOpacity style={styles.controlButton} onPress={cancelRecording}>
          <Text style={styles.controlButtonText}>✕</Text>
        </TouchableOpacity>

        <View style={styles.recordingControls}>
          {!isRecording ? (
            <TouchableOpacity
              style={styles.recordButtonCamera}
              onPress={startRecording}
              disabled={isLoading}
            >
              <View style={styles.recordButtonInner} />
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={styles.stopButton}
              onPress={stopRecording}
            >
              <View style={styles.stopButtonInner} />
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.controlButton} />
      </View>

      {/* Loader de geolocalização */}
      {isLoading && (
        <View style={styles.loadingOverlay}>
          <View style={styles.loadingContainer}>
            <Text style={styles.loadingIcon}>🔄</Text>
            <Text style={styles.loadingText}>Carregando localização...</Text>
          </View>
        </View>
      )}

      {/* Indicador de gravação */}
      {isRecording && (
        <View style={styles.recordingIndicator}>
          <View style={styles.recordingDot} />
          <Text style={styles.recordingText}>
            {isRecordingStarted ? `GRAVANDO ${recordingDuration}s` : 'INICIANDO...'}
          </Text>
        </View>
      )}

      {/* Indicador de localização em tempo real */}
      {isRecording && currentLocation && (
        <View style={styles.locationIndicator}>
          <Text style={styles.locationIndicatorText}>
            📍 GPS ATIVO
          </Text>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
    justifyContent: 'center',
    alignItems: 'center',
  },
  recorderContainer: {
    flex: 1,
    backgroundColor: '#000000',
  },
  camera: {
    flex: 1,
  },
  locationOverlay: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 60 : 50,
    left: 20,
    right: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    padding: 15,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.4)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.5,
    shadowRadius: 4,
    elevation: 8,
  },
  locationText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 6,
    textShadowColor: 'rgba(0, 0, 0, 0.8)',
    textShadowOffset: { width: 2, height: 2 },
    textShadowRadius: 4,
  },
  locationAddress: {
    color: '#ffffff',
    fontSize: 12,
    marginBottom: 6,
    textShadowColor: 'rgba(0, 0, 0, 0.8)',
    textShadowOffset: { width: 2, height: 2 },
    textShadowRadius: 4,
  },
  locationTime: {
    color: '#ffffff',
    fontSize: 12,
    marginBottom: 4,
    textShadowColor: 'rgba(0, 0, 0, 0.8)',
    textShadowOffset: { width: 2, height: 2 },
    textShadowRadius: 4,
  },
  locationAccuracy: {
    color: '#4CAF50',
    fontSize: 10,
    fontWeight: 'bold',
    textShadowColor: 'rgba(0, 0, 0, 0.8)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  controls: {
    position: 'absolute',
    bottom: Platform.OS === 'ios' ? 60 : 50,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 30,
  },
  controlButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  controlButtonText: {
    color: '#ffffff',
    fontSize: 24,
    fontWeight: 'bold',
  },
  recordingControls: {
    alignItems: 'center',
  },
  recordButtonCamera: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 4,
    borderColor: '#ffffff',
  },
  recordButtonInner: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#ff6b6b',
  },
  stopButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 4,
    borderColor: '#ffffff',
  },
  stopButtonInner: {
    width: 30,
    height: 30,
    backgroundColor: '#ffffff',
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    padding: 30,
    borderRadius: 15,
    alignItems: 'center',
  },
  loadingIcon: {
    fontSize: 40,
    marginBottom: 15,
  },
  loadingText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  recordingIndicator: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 60 : 50,
    right: 20,
    backgroundColor: 'rgba(255, 0, 0, 0.9)',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 20,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.5,
    shadowRadius: 4,
    elevation: 8,
  },
  recordingDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#ffffff',
    marginRight: 8,
  },
  recordingText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  locationIndicator: {
    position: 'absolute',
    bottom: Platform.OS === 'ios' ? 120 : 110,
    right: 20,
    backgroundColor: 'rgba(76, 175, 80, 0.9)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.5,
    shadowRadius: 4,
    elevation: 8,
  },
  locationIndicatorText: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: 'bold',
  },
  message: {
    color: '#ffffff',
    fontSize: 18,
    textAlign: 'center',
    marginBottom: 20,
  },
  button: {
    backgroundColor: '#4ecdc4',
    paddingVertical: 15,
    paddingHorizontal: 30,
    borderRadius: 10,
    alignSelf: 'center',
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
