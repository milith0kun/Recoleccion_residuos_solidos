import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  Dimensions,
  Easing,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useRouter, usePathname } from 'expo-router';
import { useAuth } from '../../context/AuthContext';
import { BrandMark } from '../branding/BrandMark';
import { colors, fontFamily, radius, spacing } from '../../theme/tokens';

// Estado compartido del operador (jornada activa o no) para que el AppHeader
// pueda mostrar el badge "EN RUTA / FUERA DE SERVICIO" en todas las pantallas.
interface OperatorStatusContextValue {
  onRoute: boolean;
}
const OperatorStatusContext = createContext<OperatorStatusContextValue>({ onRoute: false });

type FeatherIconName = React.ComponentProps<typeof Feather>['name'];

interface DrawerContextValue {
  open: () => void;
  close: () => void;
  toggle: () => void;
  isOpen: boolean;
}

const DrawerContext = createContext<DrawerContextValue | null>(null);

export function useDrawer() {
  const ctx = useContext(DrawerContext);
  if (!ctx) throw new Error('useDrawer must be used within AppShell');
  return ctx;
}

interface MenuItem {
  href: string;
  label: string;
  icon: FeatherIconName;
}

interface MenuGroup {
  label?: string;
  items: MenuItem[];
}

const CITIZEN_MENU: MenuGroup[] = [
  {
    items: [{ href: '/(tabs)/home', label: 'Inicio', icon: 'home' }],
  },
  {
    label: 'Servicios',
    items: [
      { href: '/(tabs)/map', label: 'Mapa en vivo', icon: 'map' },
      { href: '/(tabs)/schedule', label: 'Horarios', icon: 'calendar' },
      { href: '/(tabs)/education', label: 'Guía de residuos', icon: 'trash-2' },
    ],
  },
  {
    label: 'Comunidad',
    items: [
      { href: '/(tabs)/incidents', label: 'Reportar incidencia', icon: 'alert-triangle' },
    ],
  },
  {
    label: 'Cuenta',
    items: [{ href: '/(tabs)/profile', label: 'Mi perfil', icon: 'user' }],
  },
];

const OPERATOR_MENU: MenuGroup[] = [
  {
    items: [{ href: '/(operator)/jornada', label: 'Inicio', icon: 'home' }],
  },
  {
    label: 'Operación',
    items: [
      { href: '/(operator)/route', label: 'Mi ruta', icon: 'map' },
      { href: '/(operator)/report', label: 'Reportar', icon: 'check-square' },
    ],
  },
  {
    label: 'Cuenta',
    items: [{ href: '/(operator)/profile', label: 'Mi perfil', icon: 'user' }],
  },
];

const ROLE_LABELS: Record<string, string> = {
  citizen: 'Ciudadano',
  operator: 'Operador',
  admin: 'Administrador',
};

const SCREEN_WIDTH = Dimensions.get('window').width;
const DRAWER_WIDTH = Math.min(300, SCREEN_WIDTH * 0.82);
const STATUS_BAR_HEIGHT = StatusBar.currentHeight ?? (Platform.OS === 'ios' ? 44 : 24);

interface AppShellProps {
  children: React.ReactNode;
  role: 'citizen' | 'operator';
}

export function AppShell({ children, role }: AppShellProps) {
  const [isOpen, setIsOpen] = useState(false);
  const slide = useRef(new Animated.Value(-DRAWER_WIDTH)).current;
  const overlay = useRef(new Animated.Value(0)).current;
  const { getActiveExecutionId } = useAuth();
  const [onRoute, setOnRoute] = useState(false);

  // Poll del estado de jornada solo si rol = operator.
  useEffect(() => {
    if (role !== 'operator') return;
    let cancelled = false;
    const check = async () => {
      const id = await getActiveExecutionId();
      if (!cancelled) setOnRoute(!!id);
    };
    check();
    const t = setInterval(check, 4000);
    return () => {
      cancelled = true;
      clearInterval(t);
    };
  }, [role, getActiveExecutionId]);

  const open = useCallback(() => setIsOpen(true), []);
  const close = useCallback(() => setIsOpen(false), []);
  const toggle = useCallback(() => setIsOpen((v) => !v), []);

  useEffect(() => {
    Animated.parallel([
      Animated.timing(slide, {
        toValue: isOpen ? 0 : -DRAWER_WIDTH,
        duration: 260,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(overlay, {
        toValue: isOpen ? 0.45 : 0,
        duration: 220,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start();
  }, [isOpen, slide, overlay]);

  const ctxValue = useMemo<DrawerContextValue>(
    () => ({ open, close, toggle, isOpen }),
    [open, close, toggle, isOpen]
  );

  const menu = role === 'operator' ? OPERATOR_MENU : CITIZEN_MENU;

  return (
    <DrawerContext.Provider value={ctxValue}>
    <OperatorStatusContext.Provider value={{ onRoute }}>
      <View style={{ flex: 1, backgroundColor: colors.bg }}>
        {children}

        <Modal
          visible={isOpen}
          transparent
          animationType="none"
          statusBarTranslucent
          onRequestClose={close}
        >
          <View style={s.drawerRoot}>
            <Animated.View
              style={[s.overlay, { opacity: overlay }]}
              pointerEvents={isOpen ? 'auto' : 'none'}
            >
              <Pressable style={StyleSheet.absoluteFill} onPress={close} />
            </Animated.View>

            <Animated.View style={[s.drawer, { transform: [{ translateX: slide }] }]}>
              <DrawerContent menu={menu} onClose={close} />
            </Animated.View>
          </View>
        </Modal>
      </View>
    </OperatorStatusContext.Provider>
    </DrawerContext.Provider>
  );
}

/**
 * Badge "EN RUTA" / "FUERA DE SERVICIO" con dot pulsante.
 * Se muestra automáticamente en el AppHeader si el rol es operador.
 */
function OperatorStatusPill() {
  const { onRoute } = useContext(OperatorStatusContext);
  const pulse = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1,
          duration: 900,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 0,
          duration: 900,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [pulse]);

  const dotScale = pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.4] });
  const dotOpacity = pulse.interpolate({ inputRange: [0, 1], outputRange: [0.45, 1] });

  return (
    <View style={[s.opPill, onRoute ? s.opPillOn : s.opPillOff]}>
      <Animated.View
        style={[
          s.opDot,
          {
            backgroundColor: onRoute ? colors.primary : colors.textMuted,
            transform: [{ scale: dotScale }],
            opacity: dotOpacity,
          },
        ]}
      />
      <Text
        style={[
          s.opPillText,
          { color: onRoute ? colors.primaryDark : colors.textSecondary },
        ]}
      >
        {onRoute ? 'EN RUTA' : 'FUERA'}
      </Text>
    </View>
  );
}

interface DrawerContentProps {
  menu: MenuGroup[];
  onClose: () => void;
}

function DrawerContent({ menu, onClose }: DrawerContentProps) {
  const { user, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  const initials = `${user?.firstName?.[0] ?? ''}${user?.lastName?.[0] ?? ''}`.toUpperCase();
  const roleLabel = user?.role ? ROLE_LABELS[user.role] || 'Usuario' : 'Usuario';

  const handleNavigate = (href: string) => {
    onClose();
    setTimeout(() => router.push(href as never), 80);
  };

  const handleLogout = async () => {
    onClose();
    await logout();
    router.replace('/login');
  };

  return (
    <View style={s.drawerInner}>
      <View style={s.drawerBrand}>
        <BrandMark size={32} />
        <View style={{ flex: 1, marginLeft: 10 }}>
          <Text style={s.drawerBrandTitle}>SRSS Cusco</Text>
          <Text style={s.drawerBrandSub}>Recolección segregada</Text>
        </View>
      </View>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingVertical: spacing.md }}>
        {menu.map((group, gi) => (
          <View key={gi} style={s.drawerGroup}>
            {group.label ? <Text style={s.drawerGroupLabel}>{group.label}</Text> : null}
            {group.items.map((item) => {
              const isActive = pathname?.includes(item.href.replace('/(tabs)', '').replace('/(operator)', ''));
              return (
                <TouchableOpacity
                  key={item.href}
                  style={[s.drawerItem, isActive && s.drawerItemActive]}
                  activeOpacity={0.7}
                  onPress={() => handleNavigate(item.href)}
                >
                  <Feather
                    name={item.icon}
                    size={16}
                    color={isActive ? colors.primaryDark : colors.textSecondary}
                  />
                  <Text style={[s.drawerItemText, isActive && s.drawerItemTextActive]}>
                    {item.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        ))}
      </ScrollView>

      <View style={s.drawerFooter}>
        <View style={s.drawerUser}>
          <View style={s.drawerAvatar}>
            <Text style={s.drawerAvatarText}>{initials || 'U'}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={s.drawerUserName} numberOfLines={1}>
              {user?.firstName} {user?.lastName}
            </Text>
            <Text style={s.drawerUserRole}>{roleLabel}</Text>
          </View>
        </View>
        <TouchableOpacity
          style={s.drawerLogout}
          activeOpacity={0.85}
          onPress={handleLogout}
        >
          <Feather name="log-out" size={14} color={colors.danger} />
          <Text style={s.drawerLogoutText}>Cerrar sesión</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

interface AppHeaderProps {
  title: string;
  section?: string;
  onBack?: () => void;
}

export function AppHeader({ title, section, onBack }: AppHeaderProps) {
  const { toggle } = useDrawer();
  const { user } = useAuth();
  const isOperator = user?.role === 'operator' || user?.role === 'admin';
  return (
    <View style={s.header}>
      <View style={s.headerInner}>
        <TouchableOpacity
          style={s.headerIconBtn}
          onPress={onBack ?? toggle}
          activeOpacity={0.75}
          hitSlop={6}
          accessibilityLabel={onBack ? 'Volver' : 'Abrir menú'}
        >
          <Feather name={onBack ? 'arrow-left' : 'menu'} size={20} color={colors.ink} />
        </TouchableOpacity>

        <View style={s.headerCenter}>
          <BrandMark size={22} />
          <View style={{ marginLeft: 8 }}>
            <Text style={s.headerBrand}>SRSS</Text>
          </View>
        </View>

        {isOperator ? <OperatorStatusPill /> : <View style={s.headerSpacer} />}
      </View>

      <View style={s.breadcrumb}>
        {section ? (
          <>
            <Text style={s.breadcrumbLabel}>{section.toUpperCase()}</Text>
            <Feather name="chevron-right" size={12} color={colors.textMuted} />
          </>
        ) : null}
        <Text style={s.breadcrumbTitle} numberOfLines={1}>
          {title}
        </Text>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  // ─── Header ──────────────────────────────────────────────────
  header: {
    backgroundColor: colors.bg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingTop: STATUS_BAR_HEIGHT,
  },
  headerInner: {
    height: 48,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
  },
  headerIconBtn: {
    width: 36,
    height: 36,
    borderRadius: radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerCenter: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerBrand: {
    fontFamily: fontFamily.serif,
    fontSize: 16,
    fontWeight: '500',
    color: colors.ink,
    letterSpacing: -0.2,
  },
  headerSpacer: { width: 36 },
  opPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: radius.pill,
    borderWidth: 1,
    minWidth: 90,
    justifyContent: 'center',
  },
  opPillOn: {
    backgroundColor: colors.primarySoft,
    borderColor: colors.primaryBorder,
  },
  opPillOff: {
    backgroundColor: colors.bgSurface,
    borderColor: colors.border,
  },
  opDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    marginRight: 6,
  },
  opPillText: {
    fontFamily: fontFamily.sansBold,
    fontSize: 9.5,
    letterSpacing: 0.7,
  },
  breadcrumb: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingBottom: 8,
    gap: 6,
  },
  breadcrumbLabel: {
    fontFamily: fontFamily.sansBold,
    fontSize: 9.5,
    color: colors.textMuted,
    letterSpacing: 1.2,
  },
  breadcrumbTitle: {
    flex: 1,
    fontFamily: fontFamily.sansSemibold,
    fontSize: 13,
    color: colors.primaryDark,
    letterSpacing: -0.2,
  },

  // ─── Drawer ──────────────────────────────────────────────────
  drawerRoot: { flex: 1, flexDirection: 'row' },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#000',
  },
  drawer: {
    width: DRAWER_WIDTH,
    backgroundColor: colors.bg,
    borderRightWidth: 1,
    borderRightColor: colors.border,
    shadowColor: colors.ink,
    shadowOpacity: 0.12,
    shadowRadius: 18,
    shadowOffset: { width: 4, height: 0 },
    elevation: 12,
  },
  drawerInner: {
    flex: 1,
    paddingTop: STATUS_BAR_HEIGHT,
  },
  drawerBrand: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  drawerBrandTitle: {
    fontFamily: fontFamily.serif,
    fontSize: 16,
    fontWeight: '500',
    color: colors.ink,
    letterSpacing: -0.2,
  },
  drawerBrandSub: {
    fontFamily: fontFamily.sansRegular,
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 1,
  },

  drawerGroup: { paddingTop: 8, paddingBottom: 4 },
  drawerGroupLabel: {
    fontFamily: fontFamily.sansBold,
    fontSize: 10,
    color: colors.primary,
    letterSpacing: 1.4,
    textTransform: 'uppercase',
    paddingHorizontal: 18,
    paddingTop: 12,
    paddingBottom: 6,
  },
  drawerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderLeftWidth: 3,
    borderLeftColor: 'transparent',
  },
  drawerItemActive: {
    backgroundColor: colors.primarySoft,
    borderLeftColor: colors.primary,
  },
  drawerItemText: {
    fontFamily: fontFamily.sansSemibold,
    fontSize: 13.5,
    color: colors.ink,
  },
  drawerItemTextActive: {
    color: colors.primaryDark,
    fontFamily: fontFamily.sansBold,
  },

  drawerFooter: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
    padding: 12,
    gap: 10,
  },
  drawerUser: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: colors.bgSoft,
    borderRadius: radius.md,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: colors.borderSoft,
  },
  drawerAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.primarySoft,
    borderWidth: 1,
    borderColor: colors.primaryBorder,
    alignItems: 'center',
    justifyContent: 'center',
  },
  drawerAvatarText: {
    fontFamily: fontFamily.sansBold,
    fontSize: 11.5,
    color: colors.primaryDark,
  },
  drawerUserName: {
    fontFamily: fontFamily.sansSemibold,
    fontSize: 13,
    color: colors.ink,
  },
  drawerUserRole: {
    fontFamily: fontFamily.sansRegular,
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 1,
  },
  drawerLogout: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: colors.dangerBorder,
    borderRadius: radius.md,
    backgroundColor: colors.bg,
  },
  drawerLogoutText: {
    fontFamily: fontFamily.sansSemibold,
    fontSize: 12.5,
    color: colors.danger,
  },
});
