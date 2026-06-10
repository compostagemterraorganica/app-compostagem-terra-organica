import React, { useState } from 'react';
import { View, TextInput, TouchableOpacity, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export default function PasswordInput({
  value,
  onChangeText,
  placeholder = 'Senha',
  style,
  inputStyle,
  testID
}) {
  const [visible, setVisible] = useState(false);

  return (
    <View style={[styles.container, style]}>
      <TextInput
        testID={testID}
        style={[styles.input, inputStyle]}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor="#888"
        secureTextEntry={!visible}
        autoCapitalize="none"
        autoCorrect={false}
      />
      <TouchableOpacity
        style={styles.eyeButton}
        onPress={() => setVisible((prev) => !prev)}
        accessibilityLabel={visible ? 'Ocultar senha' : 'Mostrar senha'}
      >
        <Ionicons name={visible ? 'eye-off-outline' : 'eye-outline'} size={22} color="#666" />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd'
  },
  input: {
    flex: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    color: '#222'
  },
  eyeButton: {
    paddingHorizontal: 12,
    paddingVertical: 10
  }
});
