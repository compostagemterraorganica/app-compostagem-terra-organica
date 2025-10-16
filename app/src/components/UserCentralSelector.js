import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  ScrollView,
  StyleSheet,
  Alert,
  ActivityIndicator
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import userCentralService from '../services/userCentralService';

export default function UserCentralSelector({ 
  onCentralSelect, 
  selectedCentral, 
  style,
  showAsModal = false,
  title = "Selecione uma Central"
}) {
  const [centrals, setCentrals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [debugInfo, setDebugInfo] = useState('');

  useEffect(() => {
    loadUserCentrals();
  }, []);

  const loadUserCentrals = async () => {
    setLoading(true);
    setDebugInfo('Carregando centrais...');
    
    try {
      // Primeiro, vamos ver todas as relações disponíveis para debug
      const allRelations = await userCentralService.getAllRelations();
      
      // Agora buscar centrais do usuário atual
      const userCentrals = await userCentralService.getCurrentUserCentrals();
      
      setCentrals(userCentrals);
      setDebugInfo(`Carregadas ${userCentrals.length} centrais`);
      
      if (userCentrals.length === 0) {
        setDebugInfo('Nenhuma central encontrada para este usuário');
      }
      
    } catch (error) {
      setDebugInfo(`Erro: ${error.message}`);
      Alert.alert('Erro', 'Não foi possível carregar as centrais do usuário.');
      setCentrals([]);
    } finally {
      setLoading(false);
    }
  };

  const handleCentralSelect = (central) => {
    onCentralSelect(central);
    
    if (showAsModal) {
      setShowModal(false);
    }
  };

  const renderCentralItem = (central) => (
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
        {central.name}
      </Text>
      {selectedCentral?.id === central.id && (
        <Text style={styles.selectedIcon}>✓</Text>
      )}
    </TouchableOpacity>
  );

  const renderPicker = () => (
    <View style={[styles.pickerContainer, style]}>
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="small" color="#007AFF" />
          <Text style={styles.loadingText}>Carregando centrais...</Text>
        </View>
      ) : (
        <Picker
          selectedValue={selectedCentral?.id || ''}
          onValueChange={(value) => {
            if (value) {
              const central = centrals.find(c => c.id === value);
              if (central) {
                handleCentralSelect(central);
              }
            }
          }}
          style={styles.picker}
        >
          <Picker.Item label="Selecione uma central..." value="" />
          {centrals.map((central) => (
            <Picker.Item
              key={central.id}
              label={central.name}
              value={central.id}
            />
          ))}
        </Picker>
      )}
      
      {/* Debug info */}
      <Text style={styles.debugText}>{debugInfo}</Text>
      
      {centrals.length > 0 && (
        <Text style={styles.countText}>
          {centrals.length} central(is) disponível(is)
        </Text>
      )}
    </View>
  );

  const renderModal = () => (
    <Modal
      visible={showModal}
      transparent={true}
      animationType="slide"
      onRequestClose={() => setShowModal(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>{title}</Text>
            <TouchableOpacity
              style={styles.modalCloseButton}
              onPress={() => setShowModal(false)}
            >
              <Text style={styles.modalCloseText}>✕</Text>
            </TouchableOpacity>
          </View>
          
          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#007AFF" />
              <Text style={styles.loadingText}>Carregando centrais...</Text>
            </View>
          ) : (
            <ScrollView style={styles.centralList}>
              {centrals.length > 0 ? (
                centrals.map(renderCentralItem)
              ) : (
                <View style={styles.emptyContainer}>
                  <Text style={styles.emptyText}>Nenhuma central disponível</Text>
                  <TouchableOpacity
                    style={styles.retryButton}
                    onPress={loadUserCentrals}
                  >
                    <Text style={styles.retryButtonText}>🔄 Tentar Novamente</Text>
                  </TouchableOpacity>
                </View>
              )}
            </ScrollView>
          )}
          
          {/* Debug info no modal */}
          <View style={styles.debugContainer}>
            <Text style={styles.debugText}>{debugInfo}</Text>
          </View>
        </View>
      </View>
    </Modal>
  );

  if (showAsModal) {
    return (
      <View>
        <TouchableOpacity
          style={[styles.triggerButton, style]}
          onPress={() => setShowModal(true)}
        >
          <Text style={styles.triggerButtonText}>
            {selectedCentral ? selectedCentral.name : 'Selecionar Central'}
          </Text>
          <Text style={styles.triggerButtonIcon}>▼</Text>
        </TouchableOpacity>
        
        {renderModal()}
      </View>
    );
  }

  return renderPicker();
}

const styles = StyleSheet.create({
  pickerContainer: {
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    padding: 10,
    marginVertical: 5,
  },
  picker: {
    backgroundColor: 'white',
    borderRadius: 5,
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  loadingText: {
    marginLeft: 10,
    color: '#666',
    fontSize: 14,
  },
  debugText: {
    fontSize: 10,
    color: '#999',
    marginTop: 5,
    fontStyle: 'italic',
  },
  countText: {
    fontSize: 12,
    color: '#007AFF',
    marginTop: 5,
    fontWeight: '500',
  },
  
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: 'white',
    borderRadius: 15,
    padding: 0,
    width: '90%',
    maxHeight: '70%',
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  modalCloseButton: {
    padding: 5,
  },
  modalCloseText: {
    fontSize: 20,
    color: '#666',
    fontWeight: 'bold',
  },
  centralList: {
    maxHeight: 300,
  },
  centralItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  centralItemSelected: {
    backgroundColor: '#e3f2fd',
  },
  centralText: {
    fontSize: 16,
    color: '#333',
    flex: 1,
  },
  centralTextSelected: {
    color: '#007AFF',
    fontWeight: '600',
  },
  selectedIcon: {
    fontSize: 18,
    color: '#007AFF',
    fontWeight: 'bold',
  },
  emptyContainer: {
    padding: 30,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
    marginBottom: 15,
  },
  retryButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  retryButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  debugContainer: {
    padding: 10,
    backgroundColor: '#f8f8f8',
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  
  // Trigger button for modal
  triggerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#f5f5f5',
    padding: 15,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  triggerButtonText: {
    fontSize: 16,
    color: '#333',
    flex: 1,
  },
  triggerButtonIcon: {
    fontSize: 12,
    color: '#666',
    marginLeft: 10,
  },
});

