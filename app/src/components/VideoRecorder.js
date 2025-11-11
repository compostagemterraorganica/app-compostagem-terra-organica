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
import { CameraView, useCameraPermissions, useMicrophonePermissions } from 'expo-camera';
import * as Location from 'expo-location';

const { width, height } = Dimensions.get('window');

export default function VideoRecorder({ onVideoRecorded, onCancel }) {
  const [isRecording, setIsRecording] = useState(false);
  const [location, setLocation] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [cameraType, setCameraType] = useState('back');
  const [recordingStartTime, setRecordingStartTime] = useState(null);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [isRecordingStarted, setIsRecordingStarted] = useState(false);
  const [isStoppingRecording, setIsStoppingRecording] = useState(false);
  const [orientation, setOrientation] = useState('portrait');
  const [cameraKey, setCameraKey] = useState(0);
  const [isCameraReady, setIsCameraReady] = useState(false);
  const [showCamera, setShowCamera] = useState(true);
  
  const cameraRef = useRef(null);
  const recordingRef = useRef(null);
  const isRecordingRef = useRef(false); // Ref para verificar estado de gravação no callback
  const orientationInitializedRef = useRef(false); // Ref para garantir que orientação inicial só seja detectada uma vez
  const [cameraPermission, requestCameraPermission] = useCameraPermissions();
  const [microphonePermission, requestMicrophonePermission] = useMicrophonePermissions();

  useEffect(() => {
       
    if (cameraPermission && !cameraPermission.granted) {
      requestCameraPermission();
    }
    if (microphonePermission && !microphonePermission.granted) {
      requestMicrophonePermission();
    }
    getLocation();
  }, [cameraPermission, microphonePermission]);

  // Detectar orientação do dispositivo (apenas quando NÃO está gravando)
  useEffect(() => {
    const updateOrientation = () => {
      // Não processar mudanças de orientação durante gravação
      if (isRecordingRef.current) {
        console.log('⚠️ [VideoRecorder] Mudança de orientação ignorada durante gravação');
        return;
      }

      const { width, height } = Dimensions.get('window');
      const isLandscape = width > height;
      const newOrientation = isLandscape ? 'landscape' : 'portrait';
      
      console.log('🔄 [VideoRecorder] Mudança de orientação detectada:', {
        anterior: orientation,
        nova: newOrientation,
        dimensoes: `${width}x${height}`,
        isRecording: isRecordingRef.current
      });
      
      // Só remontar a câmera se não estiver gravando
      if (newOrientation !== orientation) {
        console.log('📹 [VideoRecorder] Orientação mudou antes da gravação, remontando câmera');
        setIsCameraReady(false); // Marcar câmera como não pronta durante remontagem
        setShowCamera(false); // Esconder câmera temporariamente
        setOrientation(newOrientation);
        
        // Resetar ref da câmera antes de remontar
        cameraRef.current = null;
        
        // Aguardar um pouco antes de remontar para garantir que a câmera anterior foi desmontada
        setTimeout(() => {
          setCameraKey(prev => prev + 1);
          setShowCamera(true); // Mostrar câmera novamente
          console.log('📹 [VideoRecorder] Câmera remontada com nova orientação');
          
          // Aguardar mais um pouco para garantir que a câmera foi totalmente montada antes de marcar como pronta
          setTimeout(() => {
            if (cameraRef.current && !isRecordingRef.current) {
              console.log('📹 [VideoRecorder] Câmera remontada e aguardando inicialização...');
            }
          }, 300);
        }, 300);
      } else {
        setOrientation(newOrientation);
      }
    };

    // Detectar orientação inicial apenas na primeira montagem
    const { width, height } = Dimensions.get('window');
    const isLandscape = width > height;
    const initialOrientation = isLandscape ? 'landscape' : 'portrait';
    
    // Só detectar orientação inicial uma vez
    if (!orientationInitializedRef.current) {
      console.log('🚀 [VideoRecorder] Orientação inicial:', initialOrientation, 'Dimensões:', width, 'x', height);
      setOrientation(initialOrientation);
      orientationInitializedRef.current = true;
    }

    // Escutar mudanças de orientação
    const subscription = Dimensions.addEventListener('change', updateOrientation);

    return () => {
      subscription?.remove();
    };
  }, [orientation]); // Removido isRecording das dependências

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
      
      // Solicitar permissão de localização
      const { status } = await Location.requestForegroundPermissionsAsync();
      
      if (status !== 'granted') {
        Alert.alert(
          'Permissão Necessária',
          'É necessário permitir o acesso à localização para adicionar coordenadas ao vídeo.'
        );
        return;
      }
      
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
    if (!cameraRef.current || isRecording || !isCameraReady) {
      if (!isCameraReady) {
        console.log('⚠️ [VideoRecorder] Câmera ainda não está pronta');
        Alert.alert('Aguarde', 'A câmera ainda está inicializando. Aguarde alguns instantes.');
      }
      return;
    }

    // Verificar permissões antes de iniciar
    if (!cameraPermission?.granted) {
      Alert.alert('Erro', 'Permissão de câmera não concedida.');
      return;
    }
    if (!microphonePermission?.granted) {
      Alert.alert('Erro', 'Permissão de microfone não concedida.');
      return;
    }

    // Verificar orientação atual antes de iniciar gravação
    const { width, height } = Dimensions.get('window');
    const currentOrientation = width > height ? 'landscape' : 'portrait';
    console.log('🎥 [VideoRecorder] Iniciando gravação com orientação:', currentOrientation, 'Dimensões:', width, 'x', height);

    try {
      setIsRecording(true);
      isRecordingRef.current = true; // Atualizar ref
      setIsCameraReady(false); // Marcar como não pronta ao iniciar gravação
      setRecordingStartTime(Date.now());
      setIsRecordingStarted(false);
      
      console.log('🎬 [VideoRecorder] Iniciando gravação, cameraRef existe:', !!cameraRef.current);
      
      // Verificar se cameraRef ainda existe antes de iniciar
      if (!cameraRef.current) {
        throw new Error('Câmera não está disponível');
      }
      
      // Iniciar gravação e armazenar promise
      recordingRef.current = cameraRef.current.recordAsync({
        quality: '720p',
      });
      
      console.log('🎬 [VideoRecorder] Gravação iniciada, promise criada:', !!recordingRef.current);
      
      // Marcar como iniciado imediatamente
      setIsRecordingStarted(true);
      
    } catch (error) {
      console.error('Erro ao iniciar gravação:', error);
      
      // Verificar se é erro de permissão
      if (error.message.includes('permission') || error.message.includes('Permission')) {
        Alert.alert(
          'Erro de Permissão', 
          'Não foi possível iniciar a gravação. Verifique se as permissões de câmera e microfone foram concedidas nas configurações do dispositivo.'
        );
      } else {
        Alert.alert('Erro', 'Não foi possível iniciar a gravação.');
      }
      
      setIsRecording(false);
      isRecordingRef.current = false; // Atualizar ref
      setIsRecordingStarted(false);
      setRecordingStartTime(null);
    }
  };

  const stopRecording = async () => {
    if (!isRecording || !cameraRef.current) {
      return;
    }

    if (isStoppingRecording) {
      return;
    }

    // Verificar se a gravação tem pelo menos 2 segundos
    const currentDuration = Math.floor((Date.now() - recordingStartTime) / 1000);
    if (currentDuration < 2) {
      Alert.alert(
        'Gravação Muito Curta', 
        'A gravação deve ter pelo menos 2 segundos para ser salva. Continue gravando.'
      );
      return;
    }

    setIsStoppingRecording(true);
    
    try {
      // Parar a gravação e aguardar resultado
      if (recordingRef.current) {
        console.log('🛑 [VideoRecorder] Parando gravação...');
        // Parar a câmera primeiro
        cameraRef.current.stopRecording();
        
        console.log('⏳ [VideoRecorder] Aguardando promise de gravação...');
        // Aguardar a promise de gravação
        const video = await recordingRef.current;
        
        console.log('📹 [VideoRecorder] Vídeo recebido:', video ? 'sim' : 'não', video?.uri ? `URI: ${video.uri}` : 'sem URI');
        
        if (video && video.uri) {
          // Calcular duração real
          const duration = Math.floor((Date.now() - recordingStartTime) / 1000);
          
          // Criar objeto de vídeo com dados completos
          const videoData = {
            uri: video.uri,
            duration: duration,
            location: location,
            timestamp: new Date().toISOString(),
            coordinates: location ? {
              latitude: location.latitude,
              longitude: location.longitude,
              accuracy: location.accuracy
            } : null
          };
                    
          console.log('✅ [VideoRecorder] Vídeo salvo com sucesso:', videoData.uri);
          // Chamar callback para salvar
          onVideoRecorded(videoData);
          
        } else {
          throw new Error('Nenhum vídeo foi produzido - URI inválida');
        }
      } else {
        console.error('❌ [VideoRecorder] Promise de gravação não encontrada');
        throw new Error('Promise de gravação não encontrada');
      }
      
    } catch (error) {
      console.error('Erro ao parar gravação:', error);
      
      // Se o erro for específico sobre não ter dados, tentar uma abordagem diferente
      if (error.message.includes('before any data could be produced')) {
        Alert.alert(
          'Erro de Gravação', 
          'A gravação foi interrompida antes de produzir dados. Isso pode acontecer por:\n\n• Problemas de permissão\n• Falta de espaço em disco\n• Problemas com a câmera\n\nVerifique as permissões e tente novamente.'
        );
      } else if (error.message.includes('permission') || error.message.includes('Permission')) {
        Alert.alert(
          'Erro de Permissão', 
          'Não foi possível finalizar a gravação devido a problemas de permissão. Verifique se as permissões de câmera e microfone estão ativas nas configurações do dispositivo.'
        );
      } else {
        Alert.alert('Erro', 'Não foi possível finalizar a gravação. Tente novamente.');
      }
    } finally {
      // Limpar estado independentemente do resultado
      setIsRecording(false);
      isRecordingRef.current = false; // Atualizar ref
      setIsRecordingStarted(false);
      setIsStoppingRecording(false);
      setRecordingStartTime(null);
      recordingRef.current = null;
      // Garantir que a câmera está pronta após parar a gravação
      if (cameraRef.current) {
        setIsCameraReady(true);
      }
    }
  };


  const cancelRecording = async () => {
    try {
      // Se estiver gravando, parar a gravação primeiro
      if (isRecording && cameraRef.current && !isStoppingRecording) {
        setIsStoppingRecording(true);
        
        // Parar a gravação sem aguardar o resultado
        cameraRef.current.stopRecording();
        
        // Aguardar um pouco para garantir que a gravação foi cancelada
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      
      // Limpar referências
      recordingRef.current = null;
      setIsRecording(false);
      isRecordingRef.current = false; // Atualizar ref
      setIsRecordingStarted(false);
      setIsStoppingRecording(false);
      setRecordingStartTime(null);
      
      // Chamar callback para cancelar
      onCancel();
      
    } catch (error) {
      console.error('Erro ao cancelar gravação:', error);
      // Mesmo com erro, continuar com o cancelamento
      onCancel();
    }
  };

  if (!cameraPermission || !microphonePermission) {
    return (
      <SafeAreaView style={styles.container}>
        <Text style={styles.message}>Solicitando permissões...</Text>
      </SafeAreaView>
    );
  }

  if (!cameraPermission.granted || !microphonePermission.granted) {
    return (
      <SafeAreaView style={styles.container}>
        <Text style={styles.message}>
          {!cameraPermission.granted && !microphonePermission.granted 
            ? 'Permissões de câmera e microfone necessárias'
            : !cameraPermission.granted 
            ? 'Permissão de câmera necessária'
            : 'Permissão de microfone necessária'}
        </Text>
        <TouchableOpacity 
          style={styles.button} 
          onPress={() => {
            if (!cameraPermission.granted) requestCameraPermission();
            if (!microphonePermission.granted) requestMicrophonePermission();
          }}
        >
          <Text style={styles.buttonText}>Conceder Permissões</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.recorderContainer}>
      <StatusBar hidden />
      
      {showCamera ? (
        <CameraView
          key={`${orientation}-${cameraKey}`}
          style={styles.camera}
          facing={cameraType}
          mode="video"
          ref={cameraRef}
          onCameraReady={() => {
            // Ignorar se estiver gravando - usar ref para verificar estado atual
            if (isRecordingRef.current) {
              console.log('⚠️ [VideoRecorder] onCameraReady chamado durante gravação, ignorando');
              return;
            }
            
            console.log('✅ [VideoRecorder] Câmera pronta, aguardando inicialização completa...');
            // Aguardar um pouco para garantir que a câmera está totalmente inicializada
            // Especialmente importante após remontagem por mudança de orientação
            setTimeout(() => {
              // Verificar novamente se não está gravando antes de marcar como pronta
              if (!isRecordingRef.current && cameraRef.current) {
                console.log('✅ [VideoRecorder] Câmera totalmente inicializada e pronta para gravar');
                setIsCameraReady(true);
              } else {
                console.log('⚠️ [VideoRecorder] Câmera não pode ser marcada como pronta:', {
                  isRecording: isRecordingRef.current,
                  cameraExists: !!cameraRef.current
                });
              }
            }, 800);
          }}
        />
      ) : (
        <View style={styles.cameraPlaceholder}>
          <Text style={styles.cameraPlaceholderText}>Ajustando câmera...</Text>
        </View>
      )}

      {/* Overlay de geolocalização */}
      <View style={styles.locationOverlay}>
        {location ? (
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
              style={[styles.recordButtonCamera, !isCameraReady && styles.recordButtonDisabled]}
              onPress={startRecording}
              disabled={isLoading || !isCameraReady}
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
  cameraPlaceholder: {
    flex: 1,
    backgroundColor: '#000000',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cameraPlaceholderText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  locationOverlay: {
    position: 'absolute',
    bottom: 140,
    left: 16,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    maxWidth: width * 0.45,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 3,
  },
  locationText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: 'bold',
    marginBottom: 4,
    textShadowColor: 'rgba(0, 0, 0, 0.8)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  locationAddress: {
    color: '#ffffff',
    fontSize: 11,
    marginBottom: 3,
    textShadowColor: 'rgba(0, 0, 0, 0.8)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  locationTime: {
    color: '#ffffff',
    fontSize: 11,
    marginBottom: 2,
    textShadowColor: 'rgba(0, 0, 0, 0.8)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
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
  recordButtonDisabled: {
    opacity: 0.5,
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
