import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  FlatList,
  Alert,
  Modal,
  Dimensions
} from 'react-native';
// import { Video, ResizeMode } from 'expo-av'; // deprecated in SDK 54
import { VideoView, useVideoPlayer } from 'expo-video';
import UploadModal from './UploadModal';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

export default function VideoList({ videos, onDeleteVideo, ListHeaderComponent, ListFooterComponent, userLoggedIn, onLogin }) {
  const [selectedVideo, setSelectedVideo] = useState(null);
  const [isVideoModalVisible, setIsVideoModalVisible] = useState(false);
  const [isUploadModalVisible, setIsUploadModalVisible] = useState(false);
  const [videoToUpload, setVideoToUpload] = useState(null);
  
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatDuration = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const openVideoPlayer = (video) => {
    setSelectedVideo(video);
    setIsVideoModalVisible(true);
  };

  const closeVideoPlayer = () => {
    setSelectedVideo(null);
    setIsVideoModalVisible(false);
  };

  const openUploadModal = (video) => {
    // Verificar se o usuário está autenticado antes de abrir o modal
    if (!userLoggedIn) {
      Alert.alert(
        'Login Necessário',
        'É necessário fazer login para postar vídeos. Deseja fazer login agora?',
        [
          {
            text: 'Cancelar',
            style: 'cancel'
          },
          {
            text: 'Fazer Login',
            onPress: () => onLogin()
          }
        ]
      );
      return;
    }
    
    setVideoToUpload(video);
    setIsUploadModalVisible(true);
  };

  const closeUploadModal = () => {
    setVideoToUpload(null);
    setIsUploadModalVisible(false);
  };

  const renderVideoItem = ({ item }) => (
    <View style={styles.videoItem}>
      <View style={styles.videoHeader}>
        <View style={styles.videoInfo}>
          <Text style={styles.videoTitle}>📹 Vídeo Gravado</Text>
          <Text style={styles.videoDetails}>
            Duração: {formatDuration(item.duration || 0)} • {formatDate(item.createdAt)}
          </Text>
          
          {item.location && (
            <View style={styles.locationInfo}>
              <Text style={styles.locationText}>
                📍 {item.location.formattedLocation}
              </Text>
              {item.location.address && (
                <Text style={styles.addressText}>
                  {item.location.address}
                </Text>
              )}
            </View>
          )}
          
        </View>
        
        <View style={styles.videoActions}>
          <TouchableOpacity
            style={[styles.actionButton, styles.playButton]}
            onPress={() => openVideoPlayer(item)}
          >
            <Text style={styles.playButtonText}>▶️</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.actionButton, styles.deleteButton]}
            onPress={() => onDeleteVideo(item.id)}
          >
            <Text style={styles.actionButtonText}>🗑️</Text>
          </TouchableOpacity>
        </View>
      </View>
      
      <TouchableOpacity
        style={styles.uploadButton}
        onPress={() => openUploadModal(item)}
      >
        <Text style={styles.uploadButtonIcon}>📤</Text>
        <Text style={styles.uploadButtonLabel}>Postar Volume</Text>
      </TouchableOpacity>
    </View>
  );

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Text style={styles.emptyStateIcon}>🎥</Text>
      <Text style={styles.emptyStateTitle}>Nenhum vídeo gravado</Text>
      <Text style={styles.emptyStateText}>
        Grave seu primeiro vídeo tocando no botão "Gravar Vídeo" acima
      </Text>
    </View>
  );

  const renderListHeader = () => (
    <>
      {ListHeaderComponent && ListHeaderComponent()}
      <View style={styles.content}>
        <Text style={styles.sectionTitle}>📹 Meus Vídeos ({videos.length})</Text>
      </View>
    </>
  );

  const renderListFooter = () => (
    <>
      {ListFooterComponent && ListFooterComponent()}
    </>
  );

  return (
    <View style={styles.container}>
      {videos.length === 0 ? (
        <FlatList
          data={[]}
          ListHeaderComponent={renderListHeader}
          ListEmptyComponent={<View style={styles.content}>{renderEmptyState()}</View>}
          ListFooterComponent={renderListFooter}
          showsVerticalScrollIndicator={false}
        />
      ) : (
        <FlatList
          data={videos}
          renderItem={renderVideoItem}
          keyExtractor={(item) => item.id}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.listContainer}
          ListHeaderComponent={renderListHeader}
          ListFooterComponent={renderListFooter}
        />
      )}

      {/* Modal do Player de Vídeo */}
      <Modal
        visible={isVideoModalVisible}
        animationType="slide"
        presentationStyle="fullScreen"
        onRequestClose={closeVideoPlayer}
      >
        <View style={styles.videoModalContainer}>
          <View style={styles.videoModalHeader}>
            <TouchableOpacity
              style={styles.closeButton}
              onPress={closeVideoPlayer}
            >
              <Text style={styles.closeButtonText}>✕</Text>
            </TouchableOpacity>
            <Text style={styles.videoModalTitle}>📹 Vídeo Gravado</Text>
          </View>
          
          {selectedVideo && (
            <VideoPlayerComponent video={selectedVideo} />
          )}
        </View>
      </Modal>

      {/* Modal de Upload */}
      <Modal
        visible={isUploadModalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={closeUploadModal}
      >
        <UploadModal 
          video={videoToUpload}
          onClose={closeUploadModal}
        />
      </Modal>
    </View>
  );
}

// Componente separado para o player de vídeo para usar o hook corretamente
function VideoPlayerComponent({ video }) {
  const player = useVideoPlayer(video.uri, (player) => {
    player.loop = false;
    player.play();
  });

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatDuration = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <View style={styles.videoPlayerContainer}>
      <VideoView
        style={styles.videoPlayer}
        player={player}
        fullscreenOptions={{ enterFullscreenButton: true, exitFullscreenButton: true }}
        allowsPictureInPicture
        nativeControls
        contentFit="contain"
      />
      
      <View style={styles.videoInfoModal}>
        <Text style={styles.videoInfoText}>
          Duração: {formatDuration(video.duration || 0)}
        </Text>
        <Text style={styles.videoInfoText}>
          Data: {formatDate(video.createdAt)}
        </Text>
        {video.location && (
          <View style={styles.locationInfoModal}>
            <Text style={styles.locationTextModal}>
              📍 {video.location.formattedLocation}
            </Text>
            {video.location.address && (
              <Text style={styles.addressTextModal}>
                {video.location.address}
              </Text>
            )}
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  sectionTitle: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 15,
  },
  listContainer: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  videoItem: {
    backgroundColor: '#2d2d2d',
    padding: 15,
    borderRadius: 15,
    marginBottom: 15,
    flexDirection: 'column',
  },
  videoHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 15,
  },
  videoInfo: {
    flex: 1,
    marginRight: 10,
  },
  videoTitle: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  videoDetails: {
    color: '#cccccc',
    fontSize: 12,
    marginBottom: 8,
  },
  locationInfo: {
    backgroundColor: 'rgba(76, 175, 80, 0.2)',
    padding: 8,
    borderRadius: 8,
    marginBottom: 8,
  },
  locationText: {
    color: '#4CAF50',
    fontSize: 11,
    fontWeight: 'bold',
    marginBottom: 2,
  },
  addressText: {
    color: '#81C784',
    fontSize: 10,
  },
  videoActions: {
    flexDirection: 'column',
    alignItems: 'center',
  },
  actionButton: {
    width: 35,
    height: 35,
    borderRadius: 17.5,
    backgroundColor: '#4ecdc4',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  playButton: {
    backgroundColor: '#4CAF50',
    width: 45,
    height: 45,
    borderRadius: 22.5,
  },
  uploadButton: {
    backgroundColor: '#ff9800',
    alignSelf: 'flex-start',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    elevation: 3,
    shadowColor: '#ff9800',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  uploadButtonIcon: {
    fontSize: 18,
  },
  uploadButtonLabel: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  deleteButton: {
    backgroundColor: '#ff6b6b',
  },
  actionButtonText: {
    fontSize: 16,
  },
  playButtonText: {
    fontSize: 20,
  },
  emptyState: {
    backgroundColor: '#2d2d2d',
    padding: 30,
    borderRadius: 15,
    alignItems: 'center',
  },
  emptyStateIcon: {
    fontSize: 50,
    marginBottom: 15,
  },
  emptyStateTitle: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  emptyStateText: {
    color: '#cccccc',
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
  // Estilos do Modal do Vídeo
  videoModalContainer: {
    flex: 1,
    backgroundColor: '#000000',
  },
  videoModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 50,
    paddingBottom: 20,
    paddingHorizontal: 20,
    backgroundColor: '#1a1a1a',
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
  videoModalTitle: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: 'bold',
    flex: 1,
  },
  videoPlayerContainer: {
    flex: 1,
    padding: 20,
  },
  videoPlayer: {
    width: '100%',
    height: screenHeight * 0.6,
    backgroundColor: '#000000',
    borderRadius: 10,
    marginBottom: 20,
  },
  videoInfoModal: {
    backgroundColor: '#2d2d2d',
    padding: 20,
    borderRadius: 15,
  },
  videoInfoText: {
    color: '#ffffff',
    fontSize: 16,
    marginBottom: 10,
  },
  locationInfoModal: {
    backgroundColor: 'rgba(76, 175, 80, 0.2)',
    padding: 15,
    borderRadius: 10,
    marginTop: 10,
  },
  locationTextModal: {
    color: '#4CAF50',
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  addressTextModal: {
    color: '#81C784',
    fontSize: 12,
  },
});