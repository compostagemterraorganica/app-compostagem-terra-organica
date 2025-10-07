import React, { useState, useRef, useEffect } from 'react';
import { 
  StyleSheet, 
  Text, 
  View, 
  TouchableOpacity, 
  Alert,
  Dimensions
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView } from 'react-native-safe-area-context';
import { 
  Camera, 
  useCameraDevices, 
  useFrameProcessor,
  runOnJS
} from 'react-native-vision-camera';
import * as Location from 'expo-location';

const { width, height } = Dimensions.get('window');

export default function VideoRecorderVision({ onVideoRecorded, onCancel }) {
  const [isRecording, setIsRecording] = useState(false);
  const [location, setLocation] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [cameraType, setCameraType] = useState('back');
  const [recordingStartTime, setRecordingStartTime] = useState(null);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [isRecordingStarted, setIsRecordingStarted] = useState(false);
  
  const cameraRef = useRef(null);
  const devices = useCameraDevices();
  const device = cameraType === 'back' ? devices.back : devices.front;

  useEffect(() => {
    getLocation();
  }, []);

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

  const getLocation = async () => {
    try {
      setIsLoading(true);
      const locationData = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
        maximumAge: 10000,
        timeout: 15000
      });
      
      const addresses = await Location.reverseGeocodeAsync({
        latitude: locationData.coords.latitude,
        longitude: locationData.coords.longitude
      });

      const address = addresses.length > 0 ? addresses[0] : null;
      
      setLocation({
        latitude: locationData.coords.latitude,
        longitude: locationData.coords.longitude,
        accuracy: locationData.coords.accuracy,
        address: address ? `${address.street || ''}, ${address.city || ''}, ${address.region || ''}`.trim() : null,
        formattedLocation: `${locationData.coords.latitude.toFixed(6)}, ${locationData.coords.longitude.toFixed(6)}`
      });
    } catch (error) {
      console.error('Erro ao obter localização:', error);
      Alert.alert(
        'Erro de Localização',
        'Não foi possível obter a localização atual. O vídeo será gravado sem dados de geolocalização.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  const startRecording = async () => {
    if (!cameraRef.current || isRecording) return;

    console.log('Iniciando gravação com Vision Camera...');
    
    try {
      setIsRecording(true);
      setRecordingStartTime(Date.now());
      setIsRecordingStarted(false);
      
      // Iniciar gravação com Vision Camera
      const video = await cameraRef.current.startRecording({
        flash: 'off',
        onRecordingFinished: (video) => {
          console.log('Gravação finalizada:', video.path);
          setIsRecording(false);
          setIsRecordingStarted(false);
          setRecordingStartTime(null);
          
          // Processar vídeo com marca d'água
          processVideoWithWatermark(video);
        },
        onRecordingError: (error) => {
          console.error('Erro na gravação:', error);
          Alert.alert('Erro', 'Não foi possível gravar o vídeo.');
          setIsRecording(false);
          setIsRecordingStarted(false);
          setRecordingStartTime(null);
        }
      });
      
      setIsRecordingStarted(true);
      console.log('Gravação iniciada com sucesso');
      
    } catch (error) {
      console.error('Erro ao iniciar gravação:', error);
      Alert.alert('Erro', 'Não foi possível iniciar a gravação.');
      setIsRecording(false);
      setIsRecordingStarted(false);
      setRecordingStartTime(null);
    }
  };

  const stopRecording = async () => {
    if (!isRecording || !cameraRef.current) return;

    console.log('Parando gravação...');
    
    try {
      await cameraRef.current.stopRecording();
    } catch (error) {
      console.error('Erro ao parar gravação:', error);
      Alert.alert('Erro', 'Não foi possível parar a gravação.');
    }
  };

  const processVideoWithWatermark = (video) => {
    // Criar texto de marca d'água
    const watermarkText = location ? 
      `📍 ${location.formattedLocation}\n${location.address || ''}\n📅 ${new Date().toLocaleString('pt-BR')}` :
      `📅 ${new Date().toLocaleString('pt-BR')}`;
    
    // Criar dados do vídeo com marca d'água
    const videoData = {
      uri: video.path,
      duration: recordingDuration,
      location: location,
      timestamp: new Date().toISOString(),
      watermark: watermarkText,
      coordinates: location ? {
        latitude: location.latitude,
        longitude: location.longitude,
        accuracy: location.accuracy
      } : null
    };
    
    console.log('Vídeo processado com marca d\'água:', videoData);
    
    // Chamar callback para salvar
    onVideoRecorded(videoData);
  };

  const cancelRecording = () => {
    setIsRecording(false);
    setIsRecordingStarted(false);
    setRecordingStartTime(null);
    onCancel();
  };

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
      />

      {/* Overlay de marca d'água que será capturado no vídeo */}
      <View style={styles.watermarkOverlay}>
        {location ? (
          <>
            <Text style={styles.watermarkText}>
              📍 {location.formattedLocation}
            </Text>
            {location.address && (
              <Text style={styles.watermarkAddress}>
                {location.address}
              </Text>
            )}
            <Text style={styles.watermarkTime}>
              📅 {new Date().toLocaleString('pt-BR')}
            </Text>
          </>
        ) : (
          <Text style={styles.watermarkText}>
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
  watermarkOverlay: {
    position: 'absolute',
    top: 50,
    left: 20,
    right: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    padding: 12,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.5)',
  },
  watermarkText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
    textShadowColor: 'rgba(0, 0, 0, 0.8)',
    textShadowOffset: { width: 2, height: 2 },
    textShadowRadius: 4,
  },
  watermarkAddress: {
    color: '#ffffff',
    fontSize: 12,
    marginBottom: 4,
    textShadowColor: 'rgba(0, 0, 0, 0.8)',
    textShadowOffset: { width: 2, height: 2 },
    textShadowRadius: 4,
  },
  watermarkTime: {
    color: '#ffffff',
    fontSize: 12,
    marginBottom: 4,
    textShadowColor: 'rgba(0, 0, 0, 0.8)',
    textShadowOffset: { width: 2, height: 2 },
    textShadowRadius: 4,
  },
  controls: {
    position: 'absolute',
    bottom: 50,
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
    top: 50,
    right: 20,
    backgroundColor: 'rgba(255, 0, 0, 0.8)',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 20,
    flexDirection: 'row',
    alignItems: 'center',
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
  message: {
    color: '#ffffff',
    fontSize: 18,
    textAlign: 'center',
    marginBottom: 20,
  },
});
