import React, { useRef } from 'react';
import { 
  StyleSheet, 
  Text, 
  View, 
  TouchableOpacity,
  Alert
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { 
  Camera, 
  useCameraDevices, 
  useCameraPermission
} from 'react-native-vision-camera';

export default function TestCamera({ onClose }) {
  const cameraRef = useRef(null);
  const devices = useCameraDevices();
  const device = devices.back;
  const { hasPermission, requestPermission } = useCameraPermission();

  // Debug logs
  React.useEffect(() => {
    console.log('TestCamera - Debug Info:', {
      hasPermission,
      devices: devices ? Object.keys(devices) : 'nenhum',
      device: device ? 'disponível' : 'não disponível',
      backDevice: devices?.back ? 'disponível' : 'não disponível',
      frontDevice: devices?.front ? 'disponível' : 'não disponível'
    });
  }, [hasPermission, devices, device]);

  const handleTakePhoto = async () => {
    try {
      if (!cameraRef.current) {
        Alert.alert('Erro', 'Câmera não inicializada');
        return;
      }

      const photo = await cameraRef.current.takePhoto({
        quality: 85,
        skipMetadata: true,
      });
      
      Alert.alert('Sucesso!', `Foto salva em: ${photo.path}`);
    } catch (error) {
      Alert.alert('Erro', `Erro ao tirar foto: ${error.message}`);
    }
  };

  if (!hasPermission) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centerContainer}>
          <Text style={styles.title}>Permissão Necessária</Text>
          <Text style={styles.message}>
            É necessário permitir o acesso à câmera para testar.
          </Text>
          <TouchableOpacity 
            style={styles.button} 
            onPress={requestPermission}
          >
            <Text style={styles.buttonText}>Solicitar Permissão</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.cancelButton} 
            onPress={onClose}
          >
            <Text style={styles.cancelButtonText}>Cancelar</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  if (!device) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centerContainer}>
          <Text style={styles.title}>Câmera Não Disponível</Text>
          <Text style={styles.message}>
            Nenhuma câmera foi encontrada no dispositivo.
          </Text>
          
          <View style={styles.debugContainer}>
            <Text style={styles.debugText}>
              Permissão: {hasPermission ? '✅ Concedida' : '❌ Negada'}
            </Text>
            <Text style={styles.debugText}>
              Devices: {devices ? JSON.stringify(Object.keys(devices)) : 'null'}
            </Text>
            <Text style={styles.debugText}>
              Back Device: {devices?.back ? '✅ Disponível' : '❌ Não disponível'}
            </Text>
            <Text style={styles.debugText}>
              Front Device: {devices?.front ? '✅ Disponível' : '❌ Não disponível'}
            </Text>
          </View>

          <TouchableOpacity 
            style={styles.button} 
            onPress={requestPermission}
          >
            <Text style={styles.buttonText}>Solicitar Permissão</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.cancelButton} 
            onPress={onClose}
          >
            <Text style={styles.cancelButtonText}>Voltar</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <Camera
        style={styles.camera}
        device={device}
        isActive={true}
        ref={cameraRef}
        photo={true}
      />

      <View style={styles.controls}>
        <TouchableOpacity 
          style={styles.cancelButton} 
          onPress={onClose}
        >
          <Text style={styles.cancelButtonText}>✕</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.photoButton} 
          onPress={handleTakePhoto}
        >
          <View style={styles.photoButtonInner} />
        </TouchableOpacity>

        <View style={styles.placeholder} />
      </View>

      <View style={styles.debugInfo}>
        <Text style={styles.debugText}>
          Device: {device ? 'Disponível' : 'Não disponível'}
        </Text>
        <Text style={styles.debugText}>
          Permission: {hasPermission ? 'Concedida' : 'Negada'}
        </Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  camera: {
    flex: 1,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 20,
    textAlign: 'center',
  },
  message: {
    fontSize: 16,
    color: '#ffffff',
    marginBottom: 30,
    textAlign: 'center',
    lineHeight: 24,
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
  cancelButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cancelButtonText: {
    color: '#ffffff',
    fontSize: 20,
    fontWeight: 'bold',
  },
  photoButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 4,
    borderColor: '#ffffff',
  },
  photoButtonInner: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#ffffff',
  },
  placeholder: {
    width: 50,
    height: 50,
  },
  button: {
    backgroundColor: '#4CAF50',
    paddingVertical: 15,
    paddingHorizontal: 30,
    borderRadius: 10,
    marginBottom: 15,
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  debugInfo: {
    position: 'absolute',
    top: 50,
    left: 20,
    right: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    padding: 10,
    borderRadius: 8,
  },
  debugContainer: {
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    padding: 15,
    borderRadius: 8,
    marginVertical: 20,
    width: '100%',
  },
  debugText: {
    color: '#ffffff',
    fontSize: 12,
    marginVertical: 2,
    fontFamily: 'monospace',
  },
});
