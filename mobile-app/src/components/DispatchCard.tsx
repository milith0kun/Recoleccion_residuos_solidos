import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { colors, fontFamily, radius, spacing } from '../theme/tokens';

export type DispatchStatus =
  | 'pending'
  | 'accepted'
  | 'rejected'
  | 'in_progress'
  | 'completed'
  | 'cancelled';

interface DispatchSummary {
  _id: string;
  code: string;
  status: DispatchStatus;
  scheduledFor: string;
  notes?: string;
  route: { _id: string; name: string } | string;
  driver: { _id: string; firstName?: string; lastName?: string } | string;
  vehicle?: { plate?: string } | string;
  assignedBy?: { firstName?: string; lastName?: string };
}

export const STATUS_LABEL: Record<DispatchStatus, string> = {
  pending: 'Pendiente',
  accepted: 'Aceptada',
  rejected: 'Rechazada',
  in_progress: 'En curso',
  completed: 'Completada',
  cancelled: 'Cancelada',
};

const STATUS_TONE: Record<DispatchStatus, { color: string; bg: string; border: string }> = {
  pending: { color: colors.warn, bg: colors.warnSoft, border: colors.warnBorder },
  accepted: { color: colors.info, bg: colors.infoSoft, border: colors.infoBorder },
  rejected: { color: colors.danger, bg: colors.dangerSoft, border: colors.dangerBorder },
  in_progress: { color: colors.primaryDark, bg: colors.primarySoft, border: colors.primaryBorder },
  completed: { color: colors.primaryDark, bg: colors.primarySoft, border: colors.primaryBorder },
  cancelled: { color: colors.textSecondary, bg: colors.bgSurface, border: colors.border },
};

interface DispatchCardProps {
  dispatch: DispatchSummary;
  /** Rol del usuario actual — controla qué botones se muestran. */
  perspective: 'driver' | 'planner';
  onAccept?: () => void;
  onReject?: () => void;
  onStart?: () => void;
  onCancel?: () => void;
  onPress?: () => void;
  busy?: boolean;
}

function fmtDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString('es-PE', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function pickName(obj: unknown, fallback: string): string {
  if (typeof obj === 'object' && obj !== null) {
    const o = obj as { name?: string; firstName?: string; lastName?: string; plate?: string };
    if (o.plate) return o.plate;
    if (o.name) return o.name;
    return `${o.firstName ?? ''} ${o.lastName ?? ''}`.trim() || fallback;
  }
  return fallback;
}

export function DispatchCard({
  dispatch,
  perspective,
  onAccept,
  onReject,
  onStart,
  onCancel,
  onPress,
  busy,
}: DispatchCardProps) {
  const tone = STATUS_TONE[dispatch.status];
  const routeName = pickName(dispatch.route, 'Ruta');
  const driverName = pickName(dispatch.driver, 'Conductor');
  const vehicle = dispatch.vehicle ? pickName(dispatch.vehicle, '') : '';

  return (
    <TouchableOpacity
      style={s.card}
      activeOpacity={onPress ? 0.85 : 1}
      onPress={onPress}
      disabled={!onPress}
    >
      <View style={s.headerRow}>
        <Text style={s.code}>{dispatch.code}</Text>
        <View style={[s.badge, { backgroundColor: tone.bg, borderColor: tone.border }]}>
          <Text style={[s.badgeText, { color: tone.color }]}>{STATUS_LABEL[dispatch.status]}</Text>
        </View>
      </View>

      <Text style={s.routeName} numberOfLines={1}>
        {routeName}
      </Text>
      <Text style={s.meta} numberOfLines={1}>
        <Feather name="calendar" size={11} color={colors.textSecondary} />{' '}
        {fmtDate(dispatch.scheduledFor)}
      </Text>

      {perspective === 'driver' ? (
        <Text style={s.metaSecondary} numberOfLines={1}>
          Asignada por{' '}
          {dispatch.assignedBy
            ? `${dispatch.assignedBy.firstName ?? ''} ${dispatch.assignedBy.lastName ?? ''}`.trim()
            : 'operador'}
        </Text>
      ) : (
        <Text style={s.metaSecondary} numberOfLines={1}>
          Conductor: {driverName}
          {vehicle ? ` · ${vehicle}` : ''}
        </Text>
      )}

      {dispatch.notes ? (
        <Text style={s.notes} numberOfLines={2}>
          “{dispatch.notes}”
        </Text>
      ) : null}

      {perspective === 'driver' && dispatch.status === 'pending' ? (
        <View style={s.actions}>
          <TouchableOpacity
            style={[s.actionBtn, s.acceptBtn, busy && { opacity: 0.6 }]}
            disabled={busy}
            activeOpacity={0.85}
            onPress={onAccept}
          >
            <Feather name="check" size={14} color="#FFFFFF" />
            <Text style={s.acceptText}>Aceptar</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[s.actionBtn, s.rejectBtn, busy && { opacity: 0.6 }]}
            disabled={busy}
            activeOpacity={0.85}
            onPress={onReject}
          >
            <Feather name="x" size={14} color={colors.danger} />
            <Text style={s.rejectText}>Rechazar</Text>
          </TouchableOpacity>
        </View>
      ) : null}

      {perspective === 'driver' && dispatch.status === 'accepted' ? (
        <TouchableOpacity
          style={[s.startBtn, busy && { opacity: 0.6 }]}
          disabled={busy}
          activeOpacity={0.85}
          onPress={onStart}
        >
          <Feather name="play" size={14} color="#FFFFFF" />
          <Text style={s.startText}>Iniciar salida</Text>
        </TouchableOpacity>
      ) : null}

      {perspective === 'planner' &&
      (dispatch.status === 'pending' || dispatch.status === 'accepted') ? (
        <TouchableOpacity style={s.cancelBtn} activeOpacity={0.85} onPress={onCancel}>
          <Feather name="x-circle" size={13} color={colors.danger} />
          <Text style={s.cancelText}>Cancelar salida</Text>
        </TouchableOpacity>
      ) : null}
    </TouchableOpacity>
  );
}

const s = StyleSheet.create({
  card: {
    backgroundColor: colors.bg,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  code: {
    fontFamily: fontFamily.sansBold,
    fontSize: 11,
    color: colors.primary,
    letterSpacing: 0.5,
  },
  badge: {
    paddingHorizontal: 9,
    paddingVertical: 3,
    borderRadius: radius.pill,
    borderWidth: 1,
  },
  badgeText: {
    fontFamily: fontFamily.sansBold,
    fontSize: 10,
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  routeName: {
    fontFamily: fontFamily.serif,
    fontSize: 17,
    fontWeight: '500',
    color: colors.ink,
    letterSpacing: -0.2,
    marginTop: 2,
  },
  meta: {
    fontFamily: fontFamily.sansMedium,
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 4,
  },
  metaSecondary: {
    fontFamily: fontFamily.sansRegular,
    fontSize: 11.5,
    color: colors.textMuted,
    marginTop: 2,
  },
  notes: {
    fontFamily: fontFamily.sansRegular,
    fontSize: 12,
    color: colors.textSecondary,
    fontStyle: 'italic',
    marginTop: 6,
    lineHeight: 17,
  },
  actions: { flexDirection: 'row', gap: 8, marginTop: spacing.md },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: radius.md,
    borderWidth: 1,
  },
  acceptBtn: { backgroundColor: colors.primary, borderColor: colors.primary },
  acceptText: { color: '#FFFFFF', fontFamily: fontFamily.sansSemibold, fontSize: 13 },
  rejectBtn: { backgroundColor: colors.bg, borderColor: colors.dangerBorder },
  rejectText: { color: colors.danger, fontFamily: fontFamily.sansSemibold, fontSize: 13 },
  startBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    paddingVertical: 11,
    marginTop: spacing.md,
  },
  startText: { color: '#FFFFFF', fontFamily: fontFamily.sansSemibold, fontSize: 13.5 },
  cancelBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: colors.bg,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.dangerBorder,
    paddingVertical: 9,
    marginTop: spacing.md,
  },
  cancelText: {
    color: colors.danger,
    fontFamily: fontFamily.sansSemibold,
    fontSize: 12,
  },
});
