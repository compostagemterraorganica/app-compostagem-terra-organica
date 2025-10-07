import React, { useState, useEffect } from 'react';
import { 
  StyleSheet, 
  Text, 
  View, 
  TouchableOpacity, 
  Alert, 
  FlatList,
  Linking,
  ImageBackground,
  Image
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import VideoRecorder from './src/components/VideoRecorder';
import VideoRecorderWithOverlay from './src/components/VideoRecorderWithOverlay';
import NativeCameraRecorder from './src/components/NativeCameraRecorder';
import VideoList from './src/components/VideoList';
import { getConfig } from './src/config/environment';

export default function App() {
  const [userLoggedIn, setUserLoggedIn] = useState(false);
  const [userData, setUserData] = useState(null);
  const [currentScreen, setCurrentScreen] = useState('home'); // 'home', 'recorder', 'recorder-overlay', 'native-recorder'
  const [videos, setVideos] = useState([]);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    const initializeApp = async () => {
      try {
        await loadVideos();
        await checkLoginStatus();
        setupDeepLinking();
      } catch (error) {
        setHasError(true);
      }
    };

    initializeApp();
  }, []);

  const setupDeepLinking = () => {
    // Escutar deep links quando o app está ativo
    const subscription = Linking.addEventListener('url', (event) => {
      handleDeepLink(event);
    });
    
    // Verificar se o app foi aberto via deep link
    Linking.getInitialURL().then((url) => {
      if (url && url.includes('auth/callback')) {
        handleDeepLink({ url });
      }
    }).catch(() => {});

    return () => {
      subscription?.remove();
    };
  };

  const checkLoginStatus = async () => {
    try {
      const sessionId = await AsyncStorage.getItem('wp_session_id');
      if (sessionId) {
        // Verificar se a sessão ainda é válida
        const response = await fetch(`${getConfig('API_BASE_URL')}/me`, {
          headers: {
            'Authorization': `Bearer ${sessionId}`
          }
        });
        
        if (response.ok) {
          setUserLoggedIn(true);
          // Carregar dados do usuário
          const userDataString = await AsyncStorage.getItem('wp_user_data');
          if (userDataString) {
            const userData = JSON.parse(userDataString);
            setUserData(userData);
          }
        } else {
          // Sessão expirada, limpar
          await AsyncStorage.removeItem('wp_session_id');
          await AsyncStorage.removeItem('wp_user_data');
          setUserData(null);
        }
      }
    } catch (error) {
      // Silently fail
    }
  };

  const handleDeepLink = async (event) => {
    try {
      const { url } = event;
      
      // Ignorar URLs do Expo (exp://) que não são de autenticação
      if (url && url.startsWith('exp://') && !url.includes('auth/callback')) {
        return;
      }
      
      if (url && url.includes('auth/callback')) {
        // Extrair parâmetros da URL de forma segura
        let jwtToken = null;
        let userData = null;
        
        try {
          const queryString = url.split('?')[1];
          if (queryString) {
            const params = new URLSearchParams(queryString);
            jwtToken = params.get('jwt_token');
            userData = params.get('user_data');
          }
        } catch (parseError) {
          Alert.alert('Erro', 'URL de autenticação inválida.');
          return;
        }
        
        if (jwtToken) {
          await AsyncStorage.setItem('wp_session_id', jwtToken);
          
          if (userData) {
            try {
              const user = JSON.parse(decodeURIComponent(userData));
              await AsyncStorage.setItem('wp_user_data', JSON.stringify(user));
              setUserData(user);
            } catch (userDataError) {
              // Continuar mesmo se falhar ao salvar user data
            }
          }
          
          setUserLoggedIn(true);
        } else {
          Alert.alert('Erro', 'Não foi possível obter os dados de autenticação.');
        }
      }
    } catch (error) {
      Alert.alert('Erro', `Falha no processamento do login: ${error.message}`);
    }
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

  const handleLogin = async () => {
    try {
      const authUrl = `${getConfig('WORDPRESS_BASE_URL')}/oauth/authorize?response_type=code&client_id=${getConfig('WORDPRESS_OAUTH_CLIENT_ID')}&redirect_uri=${getConfig('WORDPRESS_OAUTH_REDIRECT_URI')}&scope=basic&state=app`;
      
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

  const handleRecordVideo = () => {
    // Iniciar automaticamente a gravação padrão
    setCurrentScreen('recorder');
  };

  const handleLogout = async () => {
    try {
      // Obter JWT antes de remover
      const jwtToken = await AsyncStorage.getItem('wp_session_id');
      
      // Fazer logout no servidor se houver sessão
      if (jwtToken) {
        try {
          const response = await fetch(`${getConfig('API_BASE_URL')}/logout`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${jwtToken}`,
              'Content-Type': 'application/json'
            }
          });
          
          await response.json();
        } catch (serverError) {
          // Continuar mesmo se falhar no servidor
        }
      }
      
      // Limpar dados locais
      await AsyncStorage.removeItem('wp_session_id');
      await AsyncStorage.removeItem('wp_user_data');
      
      // Atualizar estado
      setUserLoggedIn(false);
      setUserData(null);
      
    } catch (error) {
      Alert.alert('Erro', 'Não foi possível fazer logout. Tente novamente.');
    }
  };

  const handleVideoRecorded = (videoData) => {
    const newVideo = {
      id: Date.now().toString(),
      ...videoData,
      createdAt: new Date().toISOString()
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

  const renderHeader = () => (
    <>
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <View style={styles.logoContainer}>
            <Image 
              source={{ uri: getConfig('LOGO_URL') }}
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
              <Text style={styles.loginButtonText}>🔐 Fazer Login</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      <View style={styles.content}>
        <TouchableOpacity style={styles.recordButton} onPress={handleRecordVideo}>
          <Text style={styles.recordButtonIcon}>📹</Text>
          <Text style={styles.recordButtonText}>Gravar Vídeo</Text>
        </TouchableOpacity>
        
      </View>
    </>
  );

  const renderFooter = () => (
    <View style={[styles.content, styles.footerContainer]}>
    </View>
  );

  const renderHomeScreen = () => (
    <ImageBackground
      source={{ uri: getConfig('BACKGROUND_URL') }}
      style={styles.backgroundImage}
      resizeMode="cover"
    >
      <View style={styles.overlay} />
      <SafeAreaView style={styles.container}>
        <StatusBar style="light" />
        
        <VideoList 
          videos={videos}
          onDeleteVideo={handleDeleteVideo}
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

  if (currentScreen === 'recorder') {
    return renderVideoRecorder();
  }

  if (currentScreen === 'recorder-overlay') {
    return (
      <VideoRecorderWithOverlay
        onVideoRecorded={handleVideoRecorded}
        onCancel={handleCancelRecording}
      />
    );
  }

  if (currentScreen === 'native-recorder') {
    return (
      <NativeCameraRecorder
        onVideoRecorded={handleVideoRecorded}
        onBack={handleCancelRecording}
      />
    );
  }

  return renderHomeScreen();
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
    backgroundColor: '#ff6b6b',
    paddingVertical: 20,
    paddingHorizontal: 30,
    borderRadius: 15,
    alignItems: 'center',
    marginBottom: 30,
    elevation: 5,
    shadowColor: '#ff6b6b',
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
  loginButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    flex: 1,
    alignItems: 'center',
  },
  loginButtonText: {
    color: '#503c24',
    fontSize: 14,
    fontWeight: '600',
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