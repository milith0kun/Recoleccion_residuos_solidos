import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, Alert, StyleSheet, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../src/context/AuthContext';
import { Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

export default function LoginScreen() {
  const { login } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Ingresa correo y contraseña');
      return;
    }
    setLoading(true);
    try {
      await login(email, password);
      // After login, route by role via index router
      router.replace('/');
    } catch (err: any) {
      Alert.alert('Error', err.response?.data?.error?.message || err.message || 'Error de autenticación');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={s.container}>
      <View style={s.logoContainer}>
        <LinearGradient colors={['#10B981', '#059669']} style={s.logoBox}>
          <Feather name="map" size={40} color="#FFF" />
        </LinearGradient>
        <Text style={s.title}>SRSS Cusco</Text>
        <Text style={s.subtitle}>Sistema de Recolección</Text>
      </View>

      <View style={s.card}>
        <Text style={s.cardTitle}>Iniciar Sesión</Text>

        <View style={s.inputContainer}>
          <Feather name="mail" size={20} color="#64748B" style={s.inputIcon} />
          <TextInput
            style={s.input}
            placeholder="correo@ejemplo.com"
            placeholderTextColor="#64748B"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
          />
        </View>

        <View style={s.inputContainer}>
          <Feather name="lock" size={20} color="#64748B" style={s.inputIcon} />
          <TextInput
            style={s.input}
            placeholder="••••••••"
            placeholderTextColor="#64748B"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
          />
        </View>

        <TouchableOpacity style={[s.btn, loading && s.btnDisabled]} onPress={handleLogin} disabled={loading}>
          <Text style={s.btnText}>{loading ? 'Ingresando...' : 'Ingresar al sistema'}</Text>
          {!loading && <Feather name="arrow-right" size={20} color="#FFF" style={{ marginLeft: 8 }} />}
        </TouchableOpacity>

        <TouchableOpacity onPress={() => router.push('/register')} style={s.linkBtn}>
          <Text style={s.linkText}>¿No tienes cuenta? <Text style={{ color: '#10B981', fontWeight: 'bold' }}>Regístrate</Text></Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  container: { flexGrow: 1, justifyContent: 'center', alignItems: 'center', padding: 24, backgroundColor: '#0F172A' },
  logoContainer: { alignItems: 'center', marginBottom: 40 },
  logoBox: { width: 88, height: 88, borderRadius: 24, justifyContent: 'center', alignItems: 'center', marginBottom: 20, shadowColor: '#10B981', shadowOpacity: 0.4, shadowRadius: 15, shadowOffset: { width: 0, height: 8 }, elevation: 10 },
  title: { fontSize: 32, fontWeight: '900', color: '#10B981', marginBottom: 6, letterSpacing: -0.5 },
  subtitle: { fontSize: 16, color: '#94A3B8', fontWeight: '500' },
  card: { width: '100%', backgroundColor: 'rgba(30,41,59,0.7)', borderRadius: 24, padding: 28, borderWidth: 1, borderColor: 'rgba(51,65,85,0.8)' },
  cardTitle: { fontSize: 22, fontWeight: '800', color: '#F8FAFC', marginBottom: 24 },
  inputContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#0F172A', borderWidth: 1, borderColor: '#334155', borderRadius: 16, marginBottom: 16, paddingHorizontal: 16 },
  inputIcon: { marginRight: 12 },
  input: { flex: 1, paddingVertical: Platform.OS === 'ios' ? 16 : 14, color: '#F8FAFC', fontSize: 15 },
  btn: { backgroundColor: '#10B981', borderRadius: 16, paddingVertical: 16, alignItems: 'center', marginTop: 12, flexDirection: 'row', justifyContent: 'center', shadowColor: '#10B981', shadowOpacity: 0.3, shadowRadius: 10, shadowOffset: { width: 0, height: 4 }, elevation: 5 },
  btnDisabled: { opacity: 0.7 },
  btnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  linkBtn: { marginTop: 24, alignItems: 'center' },
  linkText: { color: '#94A3B8', fontSize: 14 },
});
