import React, { useState, useEffect } from 'react';
import { 
  StyleSheet, 
  Text, 
  View, 
  TouchableOpacity, 
  Alert, 
  FlatList,
  ImageBackground,
  Image,
  Modal
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import VideoRecorder from './src/components/VideoRecorder';
import VideoList from './src/components/VideoList';
import CentralPosts from './src/components/CentralPosts';
import UpdateStatus from './src/components/UpdateStatus';
import LoginScreen from './src/components/LoginScreen';
import updateService from './src/services/updateService';
import authService from './src/services/authService';

export default function App() {
  const [userLoggedIn, setUserLoggedIn] = useState(false);
  const [userData, setUserData] = useState(null);
  const [currentScreen, setCurrentScreen] = useState('home'); // 'home', 'recorder', 'central-posts'
  const [videos, setVideos] = useState([]);
  const [hasError, setHasError] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [loginSession, setLoginSession] = useState(0);

  useEffect(() => {
    const initializeApp = async () => {
      try {
        await loadVideos();
        await checkLoginStatus();
        await updateService.initialize();
      } catch (error) {
        console.error('❌ Erro na inicialização do app:', error);
      }
    };

    initializeApp();

    // Cleanup ao desmontar o componente
    return () => {
      updateService.destroy();
    };
  }, []);

  // Reagir a logout automático (401/403 ou expiração local)
  useEffect(() => {
    const unsubscribe = authService.subscribe(() => {
      setUserLoggedIn(false);
      setUserData(null);
    });
    return unsubscribe;
  }, []);

  const checkLoginStatus = async () => {
    try {
      const user = await authService.me();
      if (user) {
        setUserLoggedIn(true);
        setUserData(user);
      }
    } catch {
      setUserLoggedIn(false);
      setUserData(null);
    }
  };

  const handleLoginSuccess = (user) => {
    setUserLoggedIn(true);
    setUserData(user);
    setShowLoginModal(false);
  };

  const handleLogin = () => {
    setLoginSession((value) => value + 1);
    setShowLoginModal(true);
  };

  const loadVideos = async () => {
    try {
      const savedVideos = await AsyncStorage.getItem('videos');
      if (savedVideos) {
        setVideos(JSON.parse(savedVideos));
      }
    } catch (error) {
      // Silently fail
    }
  };

  const saveVideos = async (videosList) => {
    try {
      await AsyncStorage.setItem('videos', JSON.stringify(videosList));
      setVideos(videosList);
    } catch (error) {
      // Silently fail
    }
  };

  const handleRecordVideo = () => {
    // Iniciar automaticamente a gravação padrão
    setCurrentScreen('recorder');
  };

  const handleViewCentralPosts = () => {
    setCurrentScreen('central-posts');
  };

  const handleBackToHome = () => {
    setCurrentScreen('home');
  };

  const handleLogout = async () => {
    try {
      await authService.logout();
      setUserLoggedIn(false);
      setUserData(null);
    } catch (error) {
      Alert.alert('Erro', 'Não foi possível fazer logout. Tente novamente.');
    }
  };

  const handleVideoRecorded = async (videoData) => {
    try {
      // Verificar se o vídeo já está na galeria (tem originalUri significa que foi salvo)
      // Se não tiver originalUri mas a URI não for da galeria, tentar salvar
      let finalUri = videoData.uri;
      
      // Se não tem originalUri e a URI parece ser temporária, tentar salvar na galeria
      if (!videoData.originalUri && videoData.uri && !videoData.uri.includes('ph://')) {
        try {
          const { storageService } = await import('./src/services/storageService');
          finalUri = await storageService.saveVideoToGallery(videoData.uri);
          console.log('Vídeo salvo na galeria pelo App.js:', finalUri);
        } catch (galleryError) {
          console.warn('Erro ao salvar na galeria pelo App.js:', galleryError);
          // Continuar com URI original
        }
      }
      
      const newVideo = {
        id: Date.now().toString(),
        ...videoData,
        uri: finalUri,
        createdAt: videoData.timestamp || new Date().toISOString()
      };
      
      // Verificar se o usuário está autenticado antes de permitir postagem
      if (!userLoggedIn) {
        Alert.alert(
          'Login Necessário',
          'É necessário fazer login para postar vídeos. Deseja fazer login agora?',
          [
            {
              text: 'Cancelar',
              style: 'cancel',
              onPress: () => {
                // Apenas salvar o vídeo localmente sem postar
                const updatedVideos = [newVideo, ...videos];
                saveVideos(updatedVideos);
                setCurrentScreen('home');
              }
            },
            {
              text: 'Fazer Login',
              onPress: () => {
                // Salvar vídeo localmente primeiro
                const updatedVideos = [newVideo, ...videos];
                saveVideos(updatedVideos);
                setCurrentScreen('home');
                // Depois fazer login
                handleLogin();
              }
            }
          ]
        );
        return;
      }
      
      // Usuário autenticado, proceder normalmente
      const updatedVideos = [newVideo, ...videos];
      saveVideos(updatedVideos);
      setCurrentScreen('home');
    } catch (error) {
      console.error('Erro ao processar vídeo gravado:', error);
      Alert.alert('Erro', 'Não foi possível processar o vídeo gravado.');
    }
  };

  const handleCancelRecording = () => {
    setCurrentScreen('home');
  };

  const handleDeleteVideo = async (videoId) => {
    Alert.alert(
      'Confirmar Exclusão',
      'Deseja realmente excluir este vídeo?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Excluir',
          style: 'destructive',
          onPress: () => {
            const updatedVideos = videos.filter(video => video.id !== videoId);
            saveVideos(updatedVideos);
          }
        }
      ]
    );
  };

  const handleUpdateVideo = (videoId, updateData) => {
    const updatedVideos = videos.map(video => {
      if (video.id === videoId) {
        return { ...video, ...updateData };
      }
      return video;
    });
    saveVideos(updatedVideos);
  };

  const renderHeader = () => (
    <>
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <View style={styles.logoContainer}>
            <Image 
              source={require('./assets/logo.png')}
              style={styles.logo}
              resizeMode="contain"
            />
          </View>
          
          {userLoggedIn ? (
            <View style={styles.userContainer}>
              <Text style={styles.userName}>
                {userData ? userData.name : 'Usuário'}
              </Text>
              <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
                <Text style={styles.logoutIcon}>✕</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity style={styles.loginButton} onPress={handleLogin}>
              <Text style={styles.loginButtonText}>Fazer login</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      <View style={styles.content}>
        <TouchableOpacity style={styles.recordButton} onPress={handleRecordVideo}>
          <Text style={styles.recordButtonIcon}>📹</Text>
          <Text style={styles.recordButtonText}>Gravar Vídeo</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.postsButton} onPress={handleViewCentralPosts}>
          <Text style={styles.postsButtonIcon}>♻️</Text>
          <Text style={styles.postsButtonText}>Volumes Postados</Text>
        </TouchableOpacity>
        
        <UpdateStatus onCheckUpdate={() => console.log('Verificação de atualização solicitada')} />
        
      </View>
    </>
  );

  const renderFooter = () => (
    <View style={[styles.content, styles.footerContainer]}>
    </View>
  );

  const renderHomeScreen = () => (
    <ImageBackground
      source={require('./assets/background.jpg')}
      style={styles.backgroundImage}
      resizeMode="cover"
    >
      <View style={styles.overlay} />
      <SafeAreaView style={styles.container}>
        <StatusBar style="light" />
        
        <VideoList 
          videos={videos}
          onDeleteVideo={handleDeleteVideo}
          onUpdateVideo={handleUpdateVideo}
          ListHeaderComponent={renderHeader}
          ListFooterComponent={renderFooter}
          userLoggedIn={userLoggedIn}
          onLogin={handleLogin}
        />
      </SafeAreaView>
    </ImageBackground>
  );

  const renderVideoRecorder = () => (
    <VideoRecorder
      onVideoRecorded={handleVideoRecorded}
      onCancel={handleCancelRecording}
    />
  );

  const renderErrorScreen = () => (
    <SafeAreaView style={styles.container}>
      <StatusBar style="light" />
      <View style={styles.errorContainer}>
        <Text style={styles.errorIcon}>⚠️</Text>
        <Text style={styles.errorTitle}>Erro no App</Text>
        <Text style={styles.errorMessage}>
          Ocorreu um erro ao inicializar o aplicativo.
        </Text>
        <TouchableOpacity 
          style={styles.retryButton}
          onPress={() => {
            setHasError(false);
            // Recarregar o app
            window.location?.reload?.();
          }}
        >
          <Text style={styles.retryButtonText}>🔄 Tentar Novamente</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );

  if (hasError) {
    return renderErrorScreen();
  }

  return (
    <>
      {currentScreen === 'recorder' ? renderVideoRecorder() : null}
      {currentScreen === 'central-posts' ? (
        <CentralPosts onBack={handleBackToHome} onLogin={handleLogin} />
      ) : null}
      {currentScreen === 'home' ? renderHomeScreen() : null}

      <Modal visible={showLoginModal} animationType="slide" onRequestClose={() => setShowLoginModal(false)}>
        <LoginScreen
          key={loginSession}
          onSuccess={handleLoginSuccess}
          onCancel={() => setShowLoginModal(false)}
        />
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  backgroundImage: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
  },
  container: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  header: {
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    paddingVertical: 8,
    paddingHorizontal: 15,
    marginBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    borderTopLeftRadius: 15,
    borderTopRightRadius: 15,
    borderBottomLeftRadius: 15,
    borderBottomRightRadius: 15,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
  },
  logoContainer: {
    flex: 2,
    alignItems: 'flex-start',
    marginLeft: -15,
    paddingLeft: 0,
  },
  logo: {
    width: 200,
    height: 50,
    resizeMode: 'contain',
    alignSelf: 'flex-start',
    marginLeft: 0,
  },
  userContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginLeft: 'auto',
  },
  userName: {
    color: '#503c24',
    fontSize: 12,
    fontWeight: '500',
    marginRight: 8,
  },
  logoutButton: {
    padding: 4,
  },
  logoutIcon: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#503c24',
  },
  headerTitle: {
    color: '#ffffff',
    fontSize: 20,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  content: {
    flex: 1,
    padding: 20,
  },
  recordButton: {
    backgroundColor: '#4CAF50',
    paddingVertical: 20,
    paddingHorizontal: 30,
    borderRadius: 15,
    alignItems: 'center',
    marginBottom: 30,
    elevation: 5,
    shadowColor: '#4CAF50',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  recordButtonIcon: {
    fontSize: 40,
    marginBottom: 10,
  },
  recordButtonText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  postsButton: {
    backgroundColor: '#2196F3',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 30,
    alignSelf: 'center',
    elevation: 2,
    shadowColor: '#2196F3',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  postsButtonIcon: {
    fontSize: 16,
    marginRight: 8,
  },
  postsButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
  loginButton: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    marginLeft: 'auto',
    elevation: 2,
    shadowColor: '#4CAF50',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3,
  },
  loginButtonText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: 'bold',
  },
  footerContainer: {
    paddingBottom: 20,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorIcon: {
    fontSize: 60,
    marginBottom: 20,
  },
  errorTitle: {
    color: '#ffffff',
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 15,
    textAlign: 'center',
  },
  errorMessage: {
    color: '#cccccc',
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 30,
    lineHeight: 24,
  },
  retryButton: {
    backgroundColor: '#4CAF50',
    paddingVertical: 15,
    paddingHorizontal: 30,
    borderRadius: 10,
  },
  retryButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});