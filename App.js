import React, { useState, useEffect, useRef } from 'react';
import {StyleSheet, Text, View, SafeAreaView, FlatList, Modal,TextInput, Animated, Platform, TouchableOpacity, Image,} from 'react-native';

import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import { Ionicons } from '@expo/vector-icons';

// Configuração das notificações
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export default function App() {
  const [medications, setMedications] = useState([]);
  const [modal, setModal] = useState(false);

  const [name, setName] = useState('');
  const [dosage, setDosage] = useState('');
  const [instruction, setInstruction] = useState('');
  const [time, setTime] = useState('');

  const [toast, setToast] = useState('');
  const top = useRef(new Animated.Value(-50)).current;

  // Carregar medicamentos
  useEffect(() => {
    async function load() {
      const data = await AsyncStorage.getItem('@medications');

      if (data) {
        setMedications(JSON.parse(data));
      }

      if (Platform.OS !== 'web') {
        await Notifications.requestPermissionsAsync();
      }
    }

    load();
  }, []);

  // Salvar Medicamento
  useEffect(() => {
    AsyncStorage.setItem('@medications', JSON.stringify(medications));
  }, [medications]);

  // Verificação de horário na Web
  useEffect(() => {
    const timer = setInterval(() => {
      const now = new Date();

      const current =
        String(now.getHours()).padStart(2, '0') +
        ':' +
        String(now.getMinutes()).padStart(2, '0');

      medications.forEach((item) => {
        if (
          item.time === current &&
          !item.taken &&
          !item.notified &&
          Platform.OS === 'web'
        ) {
          showToast(`${item.name} (${item.dosage})`);

          const list = medications.map((t) =>
            t.id === item.id ? { ...t, notified: true } : t
          );

          setMedications(list);
        }
      });
    }, 2000);

    return () => clearInterval(timer);
  }, [medications]);

  function showToast(message) {
    setToast('💊 Hora do remédio: ' + message);

    Animated.sequence([
      Animated.timing(top, {
        toValue: 50,
        duration: 400,
        useNativeDriver: false,
      }),
      Animated.delay(3000),
      Animated.timing(top, {
        toValue: -80,
        duration: 400,
        useNativeDriver: false,
      }),
    ]).start();
  }

  async function scheduleNotification(medName, medDosage, medInstruction, hour) {
    if (Platform.OS === 'web') return;

    const [h, m] = hour.split(':');

    const date = new Date();
    date.setHours(Number(h));
    date.setMinutes(Number(m));
    date.setSeconds(0);

    if (date <= new Date()) {
      date.setDate(date.getDate() + 1);
    }

    await Notifications.scheduleNotificationAsync({
      content: {
        title: '💊 Hora do seu remédio!',
        body: `Tomar ${medName} - ${medDosage}${medInstruction ? ` (${medInstruction})` : ''}`,
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date,
      },
    });
  }

  // Função adicionar medicamento
  async function addMedication() {
    if (name.trim() === '' || dosage.trim() === '' || time.trim() === '') return;

    const newMed = {
      id: Date.now().toString(),
      name,
      dosage,
      instruction,
      time,
      taken: false,
      notified: false,
    };

    await scheduleNotification(name, dosage, instruction, time);

    setMedications([...medications, newMed]);

    setName('');
    setTime('');
    setDosage('');
    setInstruction('');
    setModal(false);
  }
  function toggle(id) {
    const list = medications.map((item) => {
      if (item.id === id) {
        return {
          ...item,
          taken: !item.taken,
          notified: false,
        };
      }

      return item;
    });

    setMedications(list);
  }

  // Excluir o medicamento
  function remove(id) {
    setMedications(medications.filter((item) => item.id !== id));
  }

  return (
    <SafeAreaView style={styles.container}>
    
      <Animated.View style={[styles.toast, { top }]}>
        <Text style={styles.toastText}>{toast}</Text>
      </Animated.View>

      <View style={styles.header}>
        <Text style={styles.title}>Meus Remédios</Text>
        <Image source={require('./assets/img_03.png')} style={styles.imagem} />
      </View>

      <FlatList
        data={medications}
        keyExtractor={(item) => item.id}
        ListEmptyComponent={
          <Text style={styles.emptyText}>
            Nenhum medicamento cadastrado. Toque no + para adicionar.
          </Text>
        }
        renderItem={({ item }) => (
          <View style={styles.card}>
            <TouchableOpacity onPress={() => toggle(item.id)}>
              <Ionicons
                name={item.taken ? 'checkmark-circle' : 'ellipse-outline'}
                size={30}
                color={item.taken ? '#10B981' : '#94A3B8'}
              />
            </TouchableOpacity>

            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={[styles.medName, item.taken && styles.taken]}>
                {item.name}
              </Text>

              <Text style={styles.dosage}>💉 Dosagem: {item.dosage}</Text>

              {item.instruction ? (
                <Text style={styles.instructions}>📝 {item.instruction}</Text>
              ) : null}

              <Text style={styles.time}>⏰ Horário: {item.time}</Text>
            </View>

            <TouchableOpacity onPress={() => remove(item.id)}>
              <Ionicons name="trash-outline" size={24} color="#d62828" />
            </TouchableOpacity>
          </View>
        )}
      />

      {/* BOTÃO + */}
      <TouchableOpacity style={styles.fab} onPress={() => setModal(true)}>
        <Ionicons name="add" size={34} color="#FFF" />
      </TouchableOpacity>

      
      <Modal visible={modal} animationType="slide">
        <SafeAreaView style={styles.modal}>
          

          <View style={styles.modalHeader}>
            <View style={styles.iconCircle}>
              <Ionicons name="medkit" size={28} color="#0284C7" />
            </View>
            <Text style={styles.modalTitle}>Novo Medicamento</Text>
            <Text style={styles.modalSubtitle}>
              Preencha os dados para adicionar um lembrete
            </Text>
          </View>

          
          <View style={styles.formContainer}>
            <Text style={styles.label}>Nome do medicamento</Text>
            <TextInput
              placeholder="Ex: Dipirona 500mg"
              placeholderTextColor="#94A3B8"
              style={styles.input}
              value={name}
              onChangeText={setName}
            />

            <Text style={styles.label}>Dosagem</Text>
            <TextInput
              placeholder="Ex: 1 comprimido ou 20 gotas"
              placeholderTextColor="#94A3B8"
              style={styles.input}
              value={dosage}
              onChangeText={setDosage}
            />

            <Text style={styles.label}>Instrução / Observação (opcional)</Text>
            <TextInput
              placeholder="Ex: Tomar após o almoço"
              placeholderTextColor="#94A3B8"
              style={styles.input}
              value={instruction}
              onChangeText={setInstruction}
            />

            <Text style={styles.label}>Horário do lembrete</Text>
            <TextInput
              placeholder="Ex: 08:30"
              placeholderTextColor="#94A3B8"
              style={styles.input}
              value={time}
              onChangeText={setTime}
              keyboardType="numbers-and-punctuation"
              maxLength={5}
            />

            <TouchableOpacity style={styles.save} onPress={addMedication}>
              <Ionicons name="alarm-outline" size={22} color="#FFF" />
              <Text style={styles.saveText}>Salvar Lembrete</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => setModal(false)}
              style={styles.cancel}
            >
              <Text style={styles.cancelText}>Cancelar</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#E2E8F0',
  },

  header: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#06354d',
    paddingVertical: 25,
    marginBottom: 15,
    gap: 10,
    borderBottomLeftRadius: 25,
    borderBottomRightRadius: 25,
  },

  title: {
    color: '#FFF',
    fontSize: 26,
    fontWeight: 'bold',
  },

  imagem: {
    width: 42,
    height: 40,
    resizeMode: 'contain',
  },

  emptyText: {
    color: '#334155',
    textAlign: 'center',
    marginTop: 40,
    fontSize: 16,
    paddingHorizontal: 20,
  },

  card: {
    backgroundColor: '#FFF',
    marginHorizontal: 15,
    marginVertical: 6,
    borderRadius: 12,
    padding: 15,
    flexDirection: 'row',
    alignItems: 'center',
    elevation: 3,
  },

  medName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#0F172A',
  },

  taken: {
    textDecorationLine: 'line-through',
    color: '#94A3B8',
  },

  dosage: {
    color: '#0284C7',
    fontWeight: '600',
    marginTop: 4,
    fontSize: 14,
  },

  instructions: {
    color: '#475569',
    fontSize: 13,
    marginTop: 3,
    fontStyle: 'italic',
  },

  time: {
    color: '#334155',
    marginTop: 6,
    fontWeight: 'bold',
    fontSize: 14,
  },

  fab: {
    position: 'absolute',
    right: 25,
    bottom: 25,
    width: 65,
    height: 65,
    borderRadius: 33,
    backgroundColor: '#0f1c42',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 5,
  },

  modal: {
    flex: 1,
    backgroundColor: '#0F172A',
    paddingHorizontal: 20,
    justifyContent: 'center',
  },

  modalHeader: {
    alignItems: 'center',
    marginBottom: 20,
  },

  iconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#E0F2FE',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },

  modalTitle: {
    color: '#F8FAFC',
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
  },

  modalSubtitle: {
    color: '#94A3B8',
    fontSize: 14,
    marginTop: 4,
    textAlign: 'center',
  },

  formContainer: {
    backgroundColor: '#FFFFFF',
    padding: 22,
    borderRadius: 24,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
  },

  label: {
    fontSize: 13,
    fontWeight: '600',
    color: '#334155',
    marginBottom: 6,
    marginLeft: 2,
  },

  input: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 14,
    fontSize: 15,
    color: '#0F172A',
  },

  save: {
    backgroundColor: '#0284C7',
    paddingVertical: 15,
    borderRadius: 12,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    marginTop: 6,
    elevation: 2,
  },

  saveText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: 'bold',
  },

  cancel: {
    paddingVertical: 12,
    marginTop: 8,
    alignItems: 'center',
  },

  cancelText: {
    color: '#64748B',
    fontSize: 15,
    fontWeight: '600',
  },

  toast: {
    position: 'absolute',
    left: 20,
    right: 20,
    backgroundColor: '#10B981',
    padding: 15,
    borderRadius: 10,
    zIndex: 999,
    elevation: 10,
  },

  toastText: {
    color: '#FFF',
    textAlign: 'center',
    fontWeight: 'bold',
  },
});