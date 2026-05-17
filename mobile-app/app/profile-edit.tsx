import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import api from '../src/api/client';
import { useAuth, type User } from '../src/context/AuthContext';
import { getZoneId } from '../src/utils/zone';
import { colors, fontFamily, radius, spacing } from '../src/theme/tokens';

interface Zone {
  _id: string;
  name: string;
  district?: string;
  color?: string;
}

export default function ProfileEditScreen() {
  const { user, setUser } = useAuth();
  const router = useRouter();

  const [firstName, setFirstName] = useState(user?.firstName ?? '');
  const [lastName, setLastName] = useState(user?.lastName ?? '');
  const [phone, setPhone] = useState(user?.phone ?? '');
  const [dni, setDni] = useState(user?.dni ?? '');
  const [zoneId, setZoneId] = useState<string | null>(getZoneId(user?.zone));
  const [zones, setZones] = useState<Zone[]>([]);
  const [loadingZones, setLoadingZones] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const loadZones = async () => {
      try {
        const { data } = await api.get('/zones');
        setZones((data?.data as Zone[]) ?? []);
      } catch {
        setZones([]);
      } finally {
        setLoadingZones(false);
      }
    };
    loadZones();
  }, []);

  const handleSave = async () => {
    if (!firstName.trim() || !lastName.trim()) {
      Alert.alert('Datos incompletos', 'Ingresá tu nombre y apellido');
      return;
    }
    if (dni && !/^\d{8}$/.test(dni)) {
      Alert.alert('DNI inválido', 'El DNI debe tener exactamente 8 dígitos');
      return;
    }

    setSaving(true);
    try {
      const body = {
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        phone: phone.trim(),
        dni: dni.trim() || null,
        zone: zoneId,
      };
      const { data } = await api.patch('/users/me', body);
      const updated = data?.data as Record<string, unknown> | undefined;
      if (!updated) throw new Error('Respuesta inválida del servidor');

      const nextUser: User = {
        ...(user as User),
        id: (updated._id as string) ?? user!.id,
        _id: updated._id as string,
        firstName: updated.firstName as string,
        lastName: updated.lastName as string,
        email: updated.email as string,
        role: updated.role as User['role'],
        dni: updated.dni as string | undefined,
        phone: updated.phone as string | undefined,
        zone: updated.zone as User['zone'],
        avatar: updated.avatar as string | undefined,
        profileComplete: updated.profileComplete as boolean | undefined,
      };
      await setUser(nextUser);
      Alert.alert('Listo', 'Perfil actualizado correctamente', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { error?: { message?: string } } } })?.response?.data?.error
          ?.message ||
        (err as Error)?.message ||
        'No se pudo guardar';
      Alert.alert('Error', message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <ScrollView style={s.container} contentContainerStyle={s.content}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn} activeOpacity={0.85}>
          <Feather name="arrow-left" size={20} color={colors.ink} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={s.eyebrow}>Tu perfil</Text>
          <Text style={s.title}>Editar perfil</Text>
        </View>
      </View>
      <Text style={s.subtitle}>
        Completá tus datos para acceder a todas las funciones del sistema.
      </Text>

      <Text style={s.sectionTitle}>Datos básicos</Text>
      <View style={s.card}>
        <FieldText label="Nombre" value={firstName} onChangeText={setFirstName} />
        <View style={s.separator} />
        <FieldText label="Apellido" value={lastName} onChangeText={setLastName} />
      </View>

      <Text style={s.sectionTitle}>Contacto (opcional)</Text>
      <View style={s.card}>
        <FieldText
          label="Teléfono"
          value={phone}
          onChangeText={setPhone}
          keyboardType="phone-pad"
          placeholder="984000111"
        />
        <View style={s.separator} />
        <FieldText
          label="DNI"
          value={dni}
          onChangeText={setDni}
          keyboardType="number-pad"
          maxLength={8}
          placeholder="8 dígitos"
        />
      </View>

      <Text style={s.sectionTitle}>Mi zona</Text>
      <Text style={s.zoneHelp}>
        Seleccioná tu zona para ver tus horarios y recibir alertas cuando el camión pase cerca.
      </Text>
      <View style={s.zoneList}>
        {loadingZones ? (
          <ActivityIndicator color={colors.primary} style={{ paddingVertical: 24 }} />
        ) : zones.length === 0 ? (
          <Text style={s.zoneEmpty}>No hay zonas disponibles por ahora.</Text>
        ) : (
          <>
            <ZoneOption
              label="Sin asignar"
              description="Podés elegir una zona más adelante."
              selected={!zoneId}
              onPress={() => setZoneId(null)}
            />
            {zones.map((z) => (
              <ZoneOption
                key={z._id}
                label={z.name}
                description={z.district}
                color={z.color}
                selected={zoneId === z._id}
                onPress={() => setZoneId(z._id)}
              />
            ))}
          </>
        )}
      </View>

      <TouchableOpacity
        style={[s.saveBtn, saving && s.saveBtnDisabled]}
        onPress={handleSave}
        disabled={saving}
        activeOpacity={0.85}
      >
        {saving ? (
          <ActivityIndicator color="#FFFFFF" />
        ) : (
          <>
            <Feather name="check" size={16} color="#FFFFFF" />
            <Text style={s.saveBtnText}>Guardar cambios</Text>
          </>
        )}
      </TouchableOpacity>

      <TouchableOpacity onPress={() => router.back()} style={s.cancelBtn} disabled={saving}>
        <Text style={s.cancelBtnText}>Cancelar</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

function FieldText({
  label,
  value,
  onChangeText,
  placeholder,
  keyboardType,
  maxLength,
}: {
  label: string;
  value: string;
  onChangeText: (v: string) => void;
  placeholder?: string;
  keyboardType?: 'default' | 'number-pad' | 'phone-pad' | 'email-address';
  maxLength?: number;
}) {
  return (
    <View style={s.field}>
      <Text style={s.fieldLabel}>{label}</Text>
      <TextInput
        style={s.input}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.textPlaceholder}
        keyboardType={keyboardType ?? 'default'}
        maxLength={maxLength}
        autoCapitalize={
          keyboardType === 'number-pad' || keyboardType === 'phone-pad' ? 'none' : 'words'
        }
      />
    </View>
  );
}

function ZoneOption({
  label,
  description,
  color,
  selected,
  onPress,
}: {
  label: string;
  description?: string;
  color?: string;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.85}
      style={[s.zoneItem, selected && s.zoneItemSelected]}
    >
      <View style={[s.zoneDot, { backgroundColor: color ?? colors.primary }]} />
      <View style={{ flex: 1 }}>
        <Text style={s.zoneLabel}>{label}</Text>
        {description ? <Text style={s.zoneDesc}>{description}</Text> : null}
      </View>
      <Feather
        name={selected ? 'check-circle' : 'circle'}
        size={18}
        color={selected ? colors.primary : colors.textMuted}
      />
    </TouchableOpacity>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing.xxl, paddingTop: 60, paddingBottom: 60 },

  header: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: radius.md,
    backgroundColor: colors.bg,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },
  eyebrow: {
    fontFamily: fontFamily.sansBold,
    fontSize: 10.5,
    color: colors.primary,
    letterSpacing: 1.4,
    textTransform: 'uppercase',
    marginBottom: 6,
  },
  title: {
    fontFamily: fontFamily.serif,
    fontSize: 26,
    fontWeight: '500',
    color: colors.ink,
    letterSpacing: -0.4,
    lineHeight: 30,
  },
  subtitle: {
    fontFamily: fontFamily.sansRegular,
    fontSize: 13.5,
    color: colors.textSecondary,
    marginTop: 6,
    marginBottom: spacing.xl,
    lineHeight: 19,
  },

  sectionTitle: {
    fontFamily: fontFamily.sansBold,
    fontSize: 11,
    color: colors.textSecondary,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    marginBottom: spacing.sm,
    marginTop: spacing.md,
  },

  card: {
    backgroundColor: colors.bg,
    borderRadius: radius.md,
    paddingHorizontal: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.md,
  },

  field: { paddingVertical: spacing.md },
  fieldLabel: {
    fontFamily: fontFamily.sansBold,
    fontSize: 10.5,
    color: colors.textSecondary,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  input: {
    fontFamily: fontFamily.sansMedium,
    fontSize: 14,
    color: colors.ink,
    paddingVertical: 4,
  },
  separator: { height: 1, backgroundColor: colors.borderSoft },

  zoneHelp: {
    fontFamily: fontFamily.sansRegular,
    fontSize: 12.5,
    color: colors.textSecondary,
    marginBottom: spacing.md,
    lineHeight: 18,
  },
  zoneList: { gap: spacing.xs, marginBottom: spacing.xl },
  zoneEmpty: {
    fontFamily: fontFamily.sansRegular,
    fontSize: 13,
    color: colors.textSecondary,
    textAlign: 'center',
    paddingVertical: spacing.xl,
  },
  zoneItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.bg,
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  zoneItemSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primarySoft,
  },
  zoneDot: { width: 9, height: 9, borderRadius: 4.5 },
  zoneLabel: {
    fontFamily: fontFamily.sansSemibold,
    fontSize: 13.5,
    color: colors.ink,
  },
  zoneDesc: {
    fontFamily: fontFamily.sansRegular,
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },

  saveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: colors.primary,
    paddingVertical: 13,
    borderRadius: radius.md,
    marginTop: spacing.lg,
  },
  saveBtnDisabled: { opacity: 0.6 },
  saveBtnText: {
    color: '#FFFFFF',
    fontFamily: fontFamily.sansSemibold,
    fontSize: 14,
    letterSpacing: 0.2,
  },
  cancelBtn: {
    alignItems: 'center',
    paddingVertical: spacing.md,
    marginTop: spacing.xs,
  },
  cancelBtnText: {
    fontFamily: fontFamily.sansMedium,
    fontSize: 13,
    color: colors.textSecondary,
  },
});
