import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  Modal,
  Image
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getConfig } from '../config/environment';
import userCentralService from '../services/userCentralService';

export default function CentralPosts({ onBack }) {
  const [centrals, setCentrals] = useState([]);
  const [selectedCentral, setSelectedCentral] = useState(null);
  const [posts, setPosts] = useState([]);
  const [loadingCentrals, setLoadingCentrals] = useState(true);
  const [loadingPosts, setLoadingPosts] = useState(false);
  const [showCentralModal, setShowCentralModal] = useState(false);

  useEffect(() => {
    loadCentrals();
  }, []);

  useEffect(() => {
    if (selectedCentral) {
      loadPosts();
    }
  }, [selectedCentral]);

  const loadCentrals = async () => {
    setLoadingCentrals(true);
    
    try {
      const userCentrals = await userCentralService.getCurrentUserCentrals();
      
      setCentrals(userCentrals);
      
      if (userCentrals.length === 0) {
        Alert.alert(
          'Aviso', 
          'Nenhuma central foi encontrada para este usuário.'
        );
      } else if (userCentrals.length === 1) {
        // Selecionar automaticamente se tiver apenas uma central
        setSelectedCentral(userCentrals[0]);
      }
      
    } catch (error) {
      Alert.alert('Erro', `Não foi possível carregar as centrais: ${error.message}`);
      setCentrals([]);
    } finally {
      setLoadingCentrals(false);
    }
  };

  const getBasicAuthHeader = () => {
    const email = getConfig('WORDPRESS_EMAIL');
    const password = getConfig('WORDPRESS_PASS');
    
    if (!email || !password) {
      console.warn('⚠️ [CentralPosts] WORDPRESS_EMAIL ou WORDPRESS_PASS não configurados');
      return null;
    }
    
    const credentials = `${email}:${password}`;
    const base64Credentials = btoa(credentials);
    return `Basic ${base64Credentials}`;
  };

  const loadPosts = async () => {
    if (!selectedCentral) return;
    
    setLoadingPosts(true);
    
    try {
      const centralName = getCentralName(selectedCentral);
      const apiUrl = `https://compostagemterraorganica.com.br/wp-json/wp/v2/verificacoes-de-volu?per_page=100&search=${encodeURIComponent(centralName)}`;
      
      const authHeader = getBasicAuthHeader();
      const headers = {
        'Content-Type': 'application/json',
      };
      
      if (authHeader) {
        headers['Authorization'] = authHeader;
      }
      
      const response = await fetch(apiUrl, { headers });
      
      if (!response.ok) {
        throw new Error(`Erro na API: ${response.status}`);
      }
      
      const data = await response.json();
      
      // Processar os dados para extrair as informações necessárias
      const processedPosts = data.map(post => ({
        id: post.id,
        central: post.meta?.central || '',
        volume: post.meta?.volume || '',
        data: post.meta?.data || '',
        videoLink: post.meta?.['link-do-video'] || '',
        title: post.title?.rendered || post.title || '',
        rawData: post
      }));
      
      setPosts(processedPosts);
      
    } catch (error) {
      Alert.alert('Erro', `Não foi possível carregar as postagens: ${error.message}`);
      setPosts([]);
    } finally {
      setLoadingPosts(false);
    }
  };

  const getCentralName = (central) => {
    if (!central) return 'Central não selecionada';
    
    if (central.title && central.title.rendered) {
      return central.title.rendered;
    }
    
    if (central.name) {
      return central.name;
    }
    
    return `Central ${central.id}`;
  };

  const handleCentralSelect = (central) => {
    setSelectedCentral(central);
    setShowCentralModal(false);
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      });
    } catch (error) {
      return dateString;
    }
  };

  const openVideoLink = (url) => {
    if (url) {
      import('react-native').then(({ Linking }) => {
        Linking.openURL(url);
      });
    }
  };

  const renderHeader = () => (
    <View style={styles.header}>
      <View style={styles.headerContent}>
        <TouchableOpacity style={styles.backButton} onPress={onBack}>
          <Text style={styles.backButtonText}>←</Text>
        </TouchableOpacity>
        
        <View style={styles.logoContainer}>
          <Image 
            source={{ uri: getConfig('LOGO_URL') }}
            style={styles.logo}
            resizeMode="contain"
          />
        </View>
        
        <View style={styles.headerSpacer} />
      </View>
    </View>
  );

  const renderCentralSelector = () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Central Selecionada</Text>
      
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
    </View>
  );

  const renderPostsTable = () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>
        Postagens ({posts.length})
      </Text>
      
      {loadingPosts ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator color="#4CAF50" size="small" />
          <Text style={styles.loadingText}>Carregando postagens...</Text>
        </View>
      ) : posts.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>Nenhuma postagem encontrada</Text>
          <Text style={styles.emptySubtext}>
            Esta central ainda não possui postagens registradas
          </Text>
        </View>
      ) : (
        <View style={styles.tableContainer}>
          {/* Header da tabela */}
          <View style={styles.tableHeader}>
            <Text style={[styles.tableHeaderText, styles.dateColumn]}>Data</Text>
            <Text style={[styles.tableHeaderText, styles.volumeColumn]}>Volume (Kg)</Text>
            <Text style={[styles.tableHeaderText, styles.videoColumn]}>Vídeo</Text>
          </View>
          
          {/* Linhas da tabela */}
          <ScrollView style={styles.tableBody} showsVerticalScrollIndicator={false}>
            {posts.map((post, index) => (
              <View 
                key={post.id || index} 
                style={[
                  styles.tableRow,
                  index % 2 === 0 ? styles.tableRowEven : styles.tableRowOdd
                ]}
              >
                <Text style={[styles.tableCellText, styles.dateColumn]}>
                  {formatDate(post.data)}
                </Text>
                <Text style={[styles.tableCellText, styles.volumeColumn]}>
                  {post.volume || 'N/A'}
                </Text>
                <View style={styles.videoColumn}>
                  {post.videoLink ? (
                    <TouchableOpacity
                      style={styles.videoButton}
                      onPress={() => openVideoLink(post.videoLink)}
                    >
                      <Text style={styles.videoButtonText}>▶️</Text>
                    </TouchableOpacity>
                  ) : (
                    <Text style={styles.noVideoText}>-</Text>
                  )}
                </View>
              </View>
            ))}
          </ScrollView>
        </View>
      )}
    </View>
  );

  const renderCentralModal = () => (
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
            {centrals.map((central) => (
              <TouchableOpacity
                key={central.id}
                style={[
                  styles.centralItem,
                  selectedCentral?.id === central.id && styles.centralItemSelected
                ]}
                onPress={() => handleCentralSelect(central)}
              >
                <Text style={[
                  styles.centralText,
                  selectedCentral?.id === central.id && styles.centralTextSelected
                ]}>
                  {getCentralName(central)}
                </Text>
                {selectedCentral?.id === central.id && (
                  <Text style={styles.selectedIcon}>✓</Text>
                )}
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );

  return (
    <SafeAreaView style={styles.container}>
      {renderHeader()}
      
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {renderCentralSelector()}
        {selectedCentral && renderPostsTable()}
      </ScrollView>

      {renderCentralModal()}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1a1a',
  },
  header: {
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    paddingVertical: 8,
    paddingHorizontal: 15,
    marginBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  backButtonText: {
    fontSize: 28,
    color: '#503c24',
    fontWeight: 'bold',
  },
  logoContainer: {
    flex: 1,
    alignItems: 'center',
  },
  logo: {
    width: 200,
    height: 50,
    resizeMode: 'contain',
  },
  headerSpacer: {
    width: 40,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  section: {
    marginBottom: 25,
  },
  sectionTitle: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 15,
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  loadingText: {
    color: '#cccccc',
    fontSize: 14,
    marginLeft: 10,
  },
  centralSelector: {
    backgroundColor: '#2d2d2d',
    borderWidth: 1,
    borderColor: '#444',
    borderRadius: 8,
    padding: 15,
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
  emptyContainer: {
    backgroundColor: '#2d2d2d',
    padding: 30,
    borderRadius: 15,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: '#cccccc',
    marginBottom: 5,
    textAlign: 'center',
    fontWeight: 'bold',
  },
  emptySubtext: {
    fontSize: 12,
    color: '#999',
    textAlign: 'center',
  },
  tableContainer: {
    backgroundColor: '#2d2d2d',
    borderRadius: 15,
    overflow: 'hidden',
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#4CAF50',
    paddingVertical: 12,
    paddingHorizontal: 15,
  },
  tableHeaderText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  dateColumn: {
    flex: 1.2,
  },
  volumeColumn: {
    flex: 1,
    textAlign: 'center',
  },
  videoColumn: {
    flex: 0.8,
    alignItems: 'center',
  },
  tableBody: {
    maxHeight: 400,
  },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: 12,
    paddingHorizontal: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#444',
  },
  tableRowEven: {
    backgroundColor: '#2d2d2d',
  },
  tableRowOdd: {
    backgroundColor: '#3d3d3d',
  },
  tableCellText: {
    color: '#ffffff',
    fontSize: 14,
  },
  videoButton: {
    backgroundColor: '#ff6b6b',
    width: 30,
    height: 30,
    borderRadius: 15,
    justifyContent: 'center',
    alignItems: 'center',
  },
  videoButtonText: {
    fontSize: 16,
  },
  noVideoText: {
    color: '#888',
    fontSize: 14,
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
  centralItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#3d3d3d',
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#444',
  },
  centralItemSelected: {
    backgroundColor: '#4CAF50',
  },
  centralText: {
    color: '#cccccc',
    fontSize: 14,
    flex: 1,
  },
  centralTextSelected: {
    color: '#ffffff',
    fontWeight: 'bold',
  },
  selectedIcon: {
    fontSize: 18,
    color: '#ffffff',
    fontWeight: 'bold',
  },
});
