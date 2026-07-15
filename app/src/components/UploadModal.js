import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  Alert,
  TextInput,
  ActivityIndicator,
  ScrollView,
  Modal
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Picker } from '@react-native-picker/picker';
import { Ionicons } from '@expo/vector-icons';

import userCentralService from '../services/userCentralService';
import { apiClient } from '../services/apiClient';
import authService from '../services/authService';
import volumeVerificationService from '../services/volumeVerificationService';
import centralTagsService from '../services/centralTagsService';
import {
  litersToKg,
  kgToLiters,
  parseNumericInput,
  WASTE_TYPE_LABELS
} from '../utils/volumeConversion';
import LoginScreen from './LoginScreen';

export default function UploadModal({ video, onClose, onUploadSuccess, userLoggedIn = false }) {
  const [authState, setAuthState] = useState(userLoggedIn ? true : null);
  const [centrals, setCentrals] = useState([]);
  const [selectedCentral, setSelectedCentral] = useState(null);
  const [wasteType, setWasteType] = useState('alimentares');
  const [volume, setVolume] = useState('');
  const [volumeKg, setVolumeKg] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState('');
  const [showCentralModal, setShowCentralModal] = useState(false);
  const [loadingCentrals, setLoadingCentrals] = useState(true);
  const [availableTags, setAvailableTags] = useState([]);
  const [selectedTagIds, setSelectedTagIds] = useState([]);
  const [newTagName, setNewTagName] = useState('');
  const [loadingTags, setLoadingTags] = useState(false);
  const [showTagsModal, setShowTagsModal] = useState(false);
  const [showEditTagModal, setShowEditTagModal] = useState(false);
  const [editingTag, setEditingTag] = useState(null);
  const [editTagName, setEditTagName] = useState('');

  const getCentralName = (central) => {
    if (!central) return 'Central não selecionada';
    if (central.name) return central.name;
    return `Central ${central.id}`;
  };

  const selectedTags = availableTags.filter((tag) => selectedTagIds.includes(tag.id));

  useEffect(() => {
    checkLoginStatus();
  }, []);

  useEffect(() => {
    if (authState === true) {
      loadCentrals();
      loadSavedCentral();
    }
  }, [authState]);

  useEffect(() => {
    if (selectedCentral?.id) {
      loadTags(selectedCentral.id);
    } else {
      setAvailableTags([]);
      setSelectedTagIds([]);
    }
  }, [selectedCentral?.id]);

  const checkLoginStatus = async () => {
    try {
      const user = await authService.me();
      setAuthState(Boolean(user));
    } catch {
      setAuthState(false);
    }
  };

  const loadCentrals = async () => {
    setLoadingCentrals(true);
    try {
      const userCentrals = await userCentralService.getCurrentUserCentrals();
      setCentrals(userCentrals);
      if (userCentrals.length === 0) {
        Alert.alert(
          'Aviso',
          'Nenhuma central foi encontrada para este usuário. Verifique se o usuário está associado a alguma central.'
        );
      } else if (userCentrals.length === 1) {
        setSelectedCentral(userCentrals[0]);
        AsyncStorage.setItem('saved_central', JSON.stringify(userCentrals[0]));
      }
    } catch (error) {
      Alert.alert('Erro', `Não foi possível carregar as centrais do usuário: ${error.message}`);
      setCentrals([]);
    } finally {
      setLoadingCentrals(false);
    }
  };

  const loadSavedCentral = async () => {
    try {
      const savedCentral = await AsyncStorage.getItem('saved_central');
      if (savedCentral) {
        setSelectedCentral(JSON.parse(savedCentral));
      }
    } catch {
      // silently fail
    }
  };

  const loadTags = async (centralId) => {
    if (!centralId) {
      setAvailableTags([]);
      return;
    }

    setLoadingTags(true);
    try {
      const tags = await centralTagsService.listByCentral(centralId);
      setAvailableTags(tags);
      setSelectedTagIds((prev) => prev.filter((id) => tags.some((tag) => tag.id === id)));
    } catch (error) {
      if (__DEV__) {
        console.warn('[UploadModal] erro ao carregar tags:', error?.message || error);
      }
      setAvailableTags([]);
    } finally {
      setLoadingTags(false);
    }
  };

  const handleLoginSuccess = () => {
    setAuthState(true);
  };

  const handleCentralSelect = (central) => {
    setSelectedCentral(central);
    setSelectedTagIds([]);
    AsyncStorage.setItem('saved_central', JSON.stringify(central));
  };

  const handleLitersChange = (text) => {
    setVolume(text);
    const trimmed = String(text).trim();
    if (!trimmed) {
      setVolumeKg('');
      return;
    }
    const converted = litersToKg(trimmed);
    if (converted !== '') setVolumeKg(converted);
  };

  const handleKgChange = (text) => {
    setVolumeKg(text);
    const trimmed = String(text).trim();
    if (!trimmed) {
      setVolume('');
      return;
    }
    const converted = kgToLiters(trimmed);
    if (converted !== '') setVolume(converted);
  };

  const handleSelectTag = (tagId) => {
    setSelectedTagIds((prev) => (prev.includes(tagId) ? prev : [...prev, tagId]));
  };

  const handleRemoveChip = (tagId) => {
    setSelectedTagIds((prev) => prev.filter((id) => id !== tagId));
  };

  const handleCreateTag = async () => {
    const name = newTagName.trim();
    if (!name) {
      Alert.alert('Erro', 'Informe o nome da tag.');
      return;
    }
    if (!selectedCentral?.id) {
      Alert.alert('Erro', 'Selecione uma central primeiro.');
      return;
    }

    try {
      const created = await centralTagsService.create({
        central_id: Number(selectedCentral.id),
        name
      });
      setAvailableTags((prev) => [...prev, created].sort((a, b) => a.name.localeCompare(b.name)));
      setSelectedTagIds((prev) => [...prev, created.id]);
      setNewTagName('');
    } catch (error) {
      Alert.alert('Erro', error.message || 'Não foi possível criar a tag.');
    }
  };

  const openEditTag = (tag) => {
    setEditingTag(tag);
    setEditTagName(tag.name);
    setShowEditTagModal(true);
  };

  const handleSaveEditTag = async () => {
    const name = editTagName.trim();
    if (!name || !editingTag) return;

    try {
      const updated = await centralTagsService.update(editingTag.id, { name });
      setAvailableTags((prev) =>
        prev
          .map((tag) => (tag.id === updated.id ? updated : tag))
          .sort((a, b) => a.name.localeCompare(b.name))
      );
      setShowEditTagModal(false);
      setEditingTag(null);
      setEditTagName('');
    } catch (error) {
      Alert.alert('Erro', error.message || 'Não foi possível editar a tag.');
    }
  };

  const handleDeleteTag = (tag) => {
    Alert.alert(
      'Excluir tag',
      'Esta ação excluirá a tag da central selecionada, não desta postagem. Não pode ser desfeita.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Excluir',
          style: 'destructive',
          onPress: async () => {
            try {
              await centralTagsService.delete(tag.id);
              setAvailableTags((prev) => prev.filter((t) => t.id !== tag.id));
              setSelectedTagIds((prev) => prev.filter((id) => id !== tag.id));
            } catch (error) {
              Alert.alert('Erro', error.message || 'Não foi possível excluir a tag.');
            }
          }
        }
      ]
    );
  };

  const hasValidVolume = () => {
    const liters = parseNumericInput(volume);
    const kg = parseNumericInput(volumeKg);
    return (liters !== null && liters > 0) || (kg !== null && kg > 0);
  };

  const handleUpload = async () => {
    if (!selectedCentral || !hasValidVolume()) {
      Alert.alert('Erro', 'Por favor, selecione uma central e informe o volume em litros ou quilos.');
      return;
    }

    setIsUploading(true);

    try {
      setUploadProgress('Fazendo upload para o YouTube...');
      let youtubeUrl = null;
      let youtubeError = null;
      try {
        const youtubeResponse = await uploadToYouTube();
        youtubeUrl = youtubeResponse.video?.url || youtubeResponse.videoUrl;
        if (!youtubeUrl) {
          throw new Error('URL do YouTube não foi retornada corretamente');
        }
        setUploadProgress('Upload para YouTube concluído! Postando volume no site...');
      } catch (ytError) {
        youtubeError = ytError;
      }

      if (youtubeError) {
        setUploadProgress('');
        const shouldPostAnyway = await new Promise((resolve) => {
          Alert.alert(
            'Erro no Upload do YouTube',
            `Não foi possível enviar o vídeo para o YouTube:\n\n${youtubeError.message}\n\nDeseja registrar a coleta mesmo assim (sem o link do vídeo)?`,
            [
              { text: 'Não', style: 'cancel', onPress: () => resolve(false) },
              { text: 'Sim, Postar Mesmo Assim', onPress: () => resolve(true) }
            ]
          );
        });
        if (!shouldPostAnyway) {
          setIsUploading(false);
          return;
        }
        setUploadProgress('Postando volume no site (sem link do YouTube)...');
      }

      await createVolumeVerification(youtubeUrl);

      setUploadProgress('');
      Alert.alert('Sucesso!', 'Coleta postada com sucesso!');

      if (onUploadSuccess) {
        onUploadSuccess(video.id, {
          central: selectedCentral,
          volume,
          volumeKg,
          wasteType,
          tagIds: selectedTagIds,
          youtubeUrl,
          uploadedAt: new Date().toISOString()
        });
      }

      onClose();
    } catch (error) {
      setUploadProgress('');
      Alert.alert('Erro', `Não foi possível postar: ${error.message}`);
    } finally {
      setIsUploading(false);
      setUploadProgress('');
    }
  };

  const uploadToYouTube = async () => {
    const formData = new FormData();
    formData.append('video', {
      uri: video.uri,
      type: 'video/mp4',
      name: 'video.mp4'
    });

    const title = `${getCentralName(selectedCentral)} - ${new Date().toLocaleDateString('pt-BR')}`;

    let description = `Central: ${getCentralName(selectedCentral)}\n`;
    description += `Tipo: ${WASTE_TYPE_LABELS[wasteType]}\n`;
    description += `Volume: ${volume} Litros / ${volumeKg} Kg\n`;
    description += `Data: ${new Date().toLocaleString('pt-BR')}\n`;

    if (selectedTags.length) {
      description += `Tags: ${selectedTags.map((t) => t.name).join(', ')}\n`;
    }

    if (video.location) {
      description += `Localização: ${video.location.formattedLocation}\n`;
      if (video.location.address) {
        description += `Endereço: ${video.location.address}\n`;
      }
    }

    formData.append('title', title);
    formData.append('description', description);

    const response = await apiClient.request('/youtube/upload', {
      method: 'POST',
      body: formData
    });

    const text = await response.text();
    const data = text ? JSON.parse(text) : null;

    if (!response.ok) {
      throw new Error(data?.message || data?.error || 'Erro no upload do YouTube');
    }

    return data;
  };

  const createVolumeVerification = async (youtubeUrl = null) => {
    await authService.me();

    const dataGravacao = video?.timestamp || video?.createdAt;
    const dataPost = dataGravacao ? new Date(dataGravacao) : new Date();
    const dia = String(dataPost.getDate()).padStart(2, '0');
    const mes = String(dataPost.getMonth() + 1).padStart(2, '0');
    const ano = dataPost.getFullYear();
    const dataFormatada = `${ano}-${mes}-${dia}`;

    const liters = parseNumericInput(volume) ?? 0;
    const kg = parseNumericInput(volumeKg) ?? 0;

    return volumeVerificationService.create({
      title: `${getCentralName(selectedCentral)} - ${dataPost.toLocaleDateString('pt-BR')}`,
      central_id: Number(selectedCentral.id),
      volume_liters: liters,
      volume_kg: kg,
      waste_type: wasteType,
      tag_ids: selectedTagIds,
      measurement_date: dataFormatada,
      video_link: youtubeUrl || '',
      status: 'publish'
    });
  };

  if (authState === null) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.closeButton} onPress={onClose}>
            <Text style={styles.closeButtonText}>✕</Text>
          </TouchableOpacity>
          <Text style={styles.title}>Upload de Vídeo</Text>
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator color="#4CAF50" size="large" />
          <Text style={styles.loadingText}>Verificando sessão...</Text>
        </View>
      </View>
    );
  }

  if (authState === false) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.closeButton} onPress={onClose}>
            <Text style={styles.closeButtonText}>✕</Text>
          </TouchableOpacity>
          <Text style={styles.title}>Upload de Vídeo</Text>
        </View>
        <LoginScreen
          compact
          title="Login necessário"
          onSuccess={handleLoginSuccess}
          onCancel={onClose}
        />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.closeButton} onPress={onClose}>
          <Text style={styles.closeButtonText}>✕</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Upload de Vídeo</Text>
      </View>

      <ScrollView style={styles.content}>
        <Text style={styles.sectionTitle}>Selecione a Central</Text>
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

        <Text style={styles.sectionTitle}>Tipo de resíduo</Text>
        <View style={styles.pickerWrapper}>
          <Picker
            selectedValue={wasteType}
            onValueChange={setWasteType}
            style={styles.picker}
            dropdownIconColor="#ffffff"
          >
            <Picker.Item label="Resíduos alimentares" value="alimentares" color="#000000" />
            <Picker.Item label="Resíduos verdes" value="verdes" color="#000000" />
          </Picker>
        </View>

        <Text style={styles.sectionTitle}>Tags</Text>
        {loadingTags ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator color="#4CAF50" size="small" />
            <Text style={styles.loadingText}>Carregando tags...</Text>
          </View>
        ) : (
          <>
            {selectedTags.length > 0 && (
              <View style={styles.chipsRow}>
                {selectedTags.map((tag) => (
                  <View key={tag.id} style={styles.chip}>
                    <Text style={styles.chipText}>{tag.name}</Text>
                    <TouchableOpacity onPress={() => handleRemoveChip(tag.id)} hitSlop={8}>
                      <Text style={styles.chipRemove}>✕</Text>
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            )}

            <TouchableOpacity
              style={styles.tagSelectorButton}
              onPress={() => setShowTagsModal(true)}
              disabled={!selectedCentral}
            >
              <Text style={styles.tagSelectorText}>
                {selectedCentral ? 'Selecionar ou gerenciar tags' : 'Selecione uma central primeiro'}
              </Text>
              <Text style={styles.centralSelectorIcon}>▼</Text>
            </TouchableOpacity>
          </>
        )}

        <Text style={styles.sectionTitle}>Volume</Text>
        <View style={styles.volumeRow}>
          <View style={styles.volumeField}>
            <Text style={styles.volumeLabel}>Litros</Text>
            <TextInput
              style={styles.volumeInput}
              value={volume}
              onChangeText={handleLitersChange}
              placeholder="L"
              keyboardType="decimal-pad"
              placeholderTextColor="#888"
            />
          </View>
          <View style={styles.volumeField}>
            <Text style={styles.volumeLabel}>Quilos</Text>
            <TextInput
              style={styles.volumeInput}
              value={volumeKg}
              onChangeText={handleKgChange}
              placeholder="Kg"
              keyboardType="decimal-pad"
              placeholderTextColor="#888"
            />
          </View>
        </View>

        {uploadProgress ? (
          <View style={styles.progressContainer}>
            <ActivityIndicator size="small" color="#4ecdc4" />
            <Text style={styles.progressText}>{uploadProgress}</Text>
          </View>
        ) : null}

        <TouchableOpacity
          style={[styles.uploadButton, isUploading && styles.uploadButtonDisabled]}
          onPress={handleUpload}
          disabled={isUploading}
        >
          {isUploading && !uploadProgress ? (
            <ActivityIndicator color="#ffffff" />
          ) : (
            <Text style={styles.uploadButtonText}>📤 Fazer Upload</Text>
          )}
        </TouchableOpacity>
      </ScrollView>

      <Modal
        visible={showCentralModal}
        transparent
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
              {centrals.length > 0 ? (
                centrals.map((central) => (
                  <TouchableOpacity
                    key={central.id}
                    style={[
                      styles.centralItem,
                      selectedCentral?.id === central.id && styles.centralItemSelected
                    ]}
                    onPress={() => {
                      handleCentralSelect(central);
                      setShowCentralModal(false);
                    }}
                  >
                    <Text
                      style={[
                        styles.centralText,
                        selectedCentral?.id === central.id && styles.centralTextSelected
                      ]}
                    >
                      {central.name}
                    </Text>
                    {selectedCentral?.id === central.id && (
                      <Text style={styles.selectedIcon}>✓</Text>
                    )}
                  </TouchableOpacity>
                ))
              ) : (
                <View style={styles.emptyContainer}>
                  <Text style={styles.emptyText}>Nenhuma central disponível</Text>
                  <TouchableOpacity style={styles.retryButton} onPress={loadCentrals}>
                    <Text style={styles.retryButtonText}>🔄 Tentar Novamente</Text>
                  </TouchableOpacity>
                </View>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>

      <Modal
        visible={showTagsModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowTagsModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Tags da central</Text>
              <TouchableOpacity
                style={styles.modalCloseButton}
                onPress={() => setShowTagsModal(false)}
              >
                <Text style={styles.modalCloseText}>✕</Text>
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.centralList}>
              {availableTags.length > 0 ? (
                availableTags.map((tag) => (
                  <View key={tag.id} style={styles.tagListItem}>
                    <TouchableOpacity
                      style={styles.tagListSelect}
                      onPress={() => {
                        handleSelectTag(tag.id);
                        setShowTagsModal(false);
                      }}
                    >
                      <Text style={styles.tagListName}>{tag.name}</Text>
                      {selectedTagIds.includes(tag.id) && (
                        <Text style={styles.selectedIcon}>✓</Text>
                      )}
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.tagActionButton} onPress={() => openEditTag(tag)}>
                      <Text style={styles.tagActionText}>✎</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.tagActionButton, styles.tagDeleteButton]}
                      onPress={() => handleDeleteTag(tag)}
                    >
                      <Text style={styles.tagDeleteText}>🗑</Text>
                    </TouchableOpacity>
                  </View>
                ))
              ) : (
                <View style={styles.emptyContainer}>
                  <Text style={styles.emptyText}>Nenhuma tag cadastrada</Text>
                  <Text style={styles.emptySubtext}>Crie a primeira tag no campo abaixo</Text>
                </View>
              )}
            </ScrollView>
            <View style={styles.modalTagCreateRow}>
              <TextInput
                style={styles.modalTagInput}
                value={newTagName}
                onChangeText={setNewTagName}
                placeholder="Nova tag"
                placeholderTextColor="#888"
                onSubmitEditing={handleCreateTag}
                returnKeyType="done"
              />
              <TouchableOpacity
                style={styles.addTagButton}
                onPress={handleCreateTag}
                accessibilityLabel="Adicionar tag"
              >
                <Ionicons name="add" size={24} color="#ffffff" />
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal
        visible={showEditTagModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowEditTagModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, styles.editTagModal]}>
            <Text style={styles.modalTitle}>Editar tag</Text>
            <TextInput
              style={styles.input}
              value={editTagName}
              onChangeText={setEditTagName}
              placeholder="Nome da tag"
              placeholderTextColor="#888"
              autoFocus
            />
            <View style={styles.editTagActions}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => {
                  setShowEditTagModal(false);
                  setEditingTag(null);
                }}
              >
                <Text style={styles.cancelButtonText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.saveButton} onPress={handleSaveEditTag}>
                <Text style={styles.saveButtonText}>Salvar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1a1a'
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 50,
    paddingBottom: 20,
    paddingHorizontal: 20,
    backgroundColor: '#2d2d2d'
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15
  },
  closeButtonText: {
    color: '#ffffff',
    fontSize: 20,
    fontWeight: 'bold'
  },
  title: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: 'bold',
    flex: 1
  },
  content: {
    flex: 1,
    padding: 20
  },
  sectionTitle: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 10,
    marginTop: 16
  },
  centralSelector: {
    backgroundColor: '#2d2d2d',
    borderWidth: 1,
    borderColor: '#444',
    borderRadius: 8,
    padding: 15,
    marginBottom: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  centralSelectorText: {
    color: '#ffffff',
    fontSize: 16,
    flex: 1
  },
  centralSelectorIcon: {
    color: '#888',
    fontSize: 16,
    marginLeft: 10
  },
  pickerWrapper: {
    backgroundColor: '#2d2d2d',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#444',
    marginBottom: 8,
    overflow: 'hidden'
  },
  picker: {
    color: '#ffffff',
    backgroundColor: '#2d2d2d'
  },
  tagSelectorButton: {
    backgroundColor: '#2d2d2d',
    borderWidth: 1,
    borderColor: '#444',
    borderRadius: 8,
    padding: 15,
    marginBottom: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  tagSelectorText: {
    color: '#ffffff',
    fontSize: 15,
    flex: 1
  },
  chipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 10
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#3d5a3d',
    borderRadius: 16,
    paddingVertical: 6,
    paddingLeft: 12,
    paddingRight: 8,
    gap: 6
  },
  chipText: {
    color: '#ffffff',
    fontSize: 14
  },
  chipRemove: {
    color: '#cccccc',
    fontSize: 14,
    fontWeight: 'bold'
  },
  modalTagCreateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 12,
    borderTopWidth: 1,
    borderTopColor: '#444'
  },
  modalTagInput: {
    flex: 1,
    backgroundColor: '#1a1a1a',
    color: '#ffffff',
    padding: 12,
    borderRadius: 8,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#444'
  },
  addTagButton: {
    backgroundColor: '#4CAF50',
    borderRadius: 8,
    width: 48,
    height: 48,
    justifyContent: 'center',
    alignItems: 'center'
  },
  volumeRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 8
  },
  volumeField: {
    flex: 1
  },
  volumeLabel: {
    color: '#cccccc',
    fontSize: 13,
    marginBottom: 6
  },
  volumeInput: {
    backgroundColor: '#2d2d2d',
    color: '#ffffff',
    padding: 15,
    borderRadius: 10,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#444'
  },
  input: {
    backgroundColor: '#2d2d2d',
    color: '#ffffff',
    padding: 15,
    borderRadius: 10,
    fontSize: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#444'
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2d2d2d',
    padding: 15,
    borderRadius: 10,
    marginTop: 16,
    gap: 10
  },
  progressText: {
    color: '#4ecdc4',
    fontSize: 14,
    fontWeight: '600',
    flex: 1
  },
  uploadButton: {
    backgroundColor: '#4CAF50',
    paddingVertical: 15,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 30
  },
  uploadButtonDisabled: {
    backgroundColor: '#666666'
  },
  uploadButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold'
  },
  loadingContainer: {
    backgroundColor: '#2d2d2d',
    borderWidth: 1,
    borderColor: '#444',
    borderRadius: 8,
    padding: 15,
    marginBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center'
  },
  loadingText: {
    color: '#ffffff',
    fontSize: 14,
    marginLeft: 10
  },
  centralItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#1a1a1a',
    padding: 15,
    borderRadius: 10,
    marginBottom: 10,
    borderWidth: 2,
    borderColor: 'transparent'
  },
  centralItemSelected: {
    borderColor: '#4ecdc4',
    backgroundColor: '#2a2a2a'
  },
  centralText: {
    color: '#cccccc',
    fontSize: 14,
    flex: 1
  },
  centralTextSelected: {
    color: '#4ecdc4',
    fontWeight: 'bold'
  },
  selectedIcon: {
    fontSize: 18,
    color: '#4ecdc4',
    fontWeight: 'bold'
  },
  emptyContainer: {
    padding: 30,
    alignItems: 'center'
  },
  emptyText: {
    fontSize: 16,
    color: '#cccccc',
    marginBottom: 5,
    textAlign: 'center'
  },
  emptySubtext: {
    fontSize: 12,
    color: '#999',
    textAlign: 'center'
  },
  retryButton: {
    backgroundColor: '#4ecdc4',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
    marginTop: 10
  },
  retryButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600'
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center'
  },
  modalContent: {
    backgroundColor: '#2d2d2d',
    borderRadius: 10,
    width: '90%',
    maxHeight: '80%'
  },
  editTagModal: {
    padding: 20
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#444'
  },
  modalTitle: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: 'bold'
  },
  modalCloseButton: {
    padding: 5
  },
  modalCloseText: {
    color: '#888',
    fontSize: 20,
    fontWeight: 'bold'
  },
  centralList: {
    maxHeight: 360,
    padding: 12
  },
  tagListItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 6
  },
  tagListSelect: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#1a1a1a',
    padding: 14,
    borderRadius: 8
  },
  tagListName: {
    color: '#ffffff',
    fontSize: 15
  },
  tagActionButton: {
    width: 40,
    height: 40,
    borderRadius: 8,
    backgroundColor: '#3d3d3d',
    justifyContent: 'center',
    alignItems: 'center'
  },
  tagActionText: {
    color: '#4ecdc4',
    fontSize: 16
  },
  tagDeleteButton: {
    backgroundColor: '#4a2a2a'
  },
  tagDeleteText: {
    fontSize: 16
  },
  editTagActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
    marginTop: 4
  },
  cancelButton: {
    paddingVertical: 10,
    paddingHorizontal: 16
  },
  cancelButtonText: {
    color: '#cccccc',
    fontSize: 15
  },
  saveButton: {
    backgroundColor: '#4CAF50',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8
  },
  saveButtonText: {
    color: '#ffffff',
    fontWeight: '600'
  }
});
