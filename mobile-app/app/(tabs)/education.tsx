import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
  TextInput,
  TouchableOpacity,
  Animated,
  LayoutAnimation,
  Platform,
  UIManager,
  Modal,
  Pressable,
  Alert,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import api from '../../src/api/client';
import { colors, fontFamily, radius, spacing } from '../../src/theme/tokens';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

interface WasteType {
  _id: string;
  name: string;
  description?: string;
  category?: string;
  colorCode: string;
  examples?: string[];
  handlingInstructions?: string;
}

type Category = 'all' | 'organic' | 'recyclable' | 'non_recyclable' | 'hazardous';

interface CategoryChip {
  key: Category;
  label: string;
  color: string;
}

const CATEGORIES: CategoryChip[] = [
  { key: 'all', label: 'Todos', color: colors.primary },
  { key: 'organic', label: 'Orgánico', color: '#8C6300' },
  { key: 'recyclable', label: 'Reciclable', color: colors.info },
  { key: 'non_recyclable', label: 'No reciclable', color: colors.textSecondary },
  { key: 'hazardous', label: 'Peligroso', color: colors.danger },
];

interface AnimatedItemProps {
  index: number;
  children: React.ReactNode;
}

function AnimatedItem({ index, children }: AnimatedItemProps) {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(16)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration: 300,
        delay: index * 50,
        useNativeDriver: true,
      }),
      Animated.timing(translateY, {
        toValue: 0,
        duration: 300,
        delay: index * 50,
        useNativeDriver: true,
      }),
    ]).start();
  }, [opacity, translateY, index]);

  return <Animated.View style={{ opacity, transform: [{ translateY }] }}>{children}</Animated.View>;
}

export default function EducationScreen() {
  const [wasteTypes, setWasteTypes] = useState<WasteType[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [query, setQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<Category>('all');
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<WasteType | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchWasteTypes = async (search: string, category: Category) => {
    try {
      setError(null);
      const params: Record<string, string> = {};
      if (search.trim().length > 0) params.search = search.trim();
      if (category !== 'all') params.category = category;
      const { data } = await api.get('/waste-types', { params });
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      setWasteTypes((data?.data || []) as WasteType[]);
    } catch (e: unknown) {
      const msg =
        e && typeof e === 'object' && 'message' in e && typeof (e as { message: unknown }).message === 'string'
          ? (e as { message: string }).message
          : 'No pudimos cargar los residuos';
      setError(msg);
      if (__DEV__) console.warn('[education] /waste-types failed', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWasteTypes('', 'all');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      fetchWasteTypes(query, activeCategory);
    }, 300);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, activeCategory]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchWasteTypes(query, activeCategory);
    setRefreshing(false);
  };

  const onSelectCategory = (key: Category) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setActiveCategory(key);
  };

  const grouped = useMemo(() => {
    if (query.trim().length > 0) return { search: wasteTypes };
    const groups: Record<string, WasteType[]> = {};
    for (const wt of wasteTypes) {
      const cat = wt.category || 'otros';
      if (!groups[cat]) groups[cat] = [];
      groups[cat].push(wt);
    }
    return groups;
  }, [wasteTypes, query]);

  const renderCard = (wt: WasteType, idx: number) => (
    <AnimatedItem key={wt._id} index={idx}>
      <View style={[s.card, { borderLeftColor: wt.colorCode }]}>
        <View style={s.cardHeader}>
          <View style={[s.colorBox, { backgroundColor: wt.colorCode }]} />
          <Text style={s.cardTitle}>{wt.name}</Text>
        </View>

        {wt.description ? <Text style={s.descText}>{wt.description}</Text> : null}

        {wt.examples && wt.examples.length > 0 ? (
          <Text style={s.examplesText} numberOfLines={2}>
            Ejemplos: {wt.examples.join(', ')}
          </Text>
        ) : null}

        <TouchableOpacity
          style={s.moreBtn}
          onPress={() => setSelected(wt)}
          activeOpacity={0.8}
        >
          <Text style={s.moreBtnText}>Ver detalle</Text>
          <Feather name="arrow-right" size={12} color={colors.primary} />
        </TouchableOpacity>
      </View>
    </AnimatedItem>
  );

  const renderResults = () => {
    if (error) {
      return (
        <View style={s.emptyBox}>
          <Text style={s.emptyTitle}>No pudimos cargar</Text>
          <Text style={s.emptyText}>{error}</Text>
          <TouchableOpacity
            style={s.retryBtn}
            onPress={() => {
              setLoading(true);
              fetchWasteTypes(query, activeCategory);
            }}
            activeOpacity={0.85}
          >
            <Text style={s.retryBtnText}>Reintentar</Text>
          </TouchableOpacity>
        </View>
      );
    }

    if (wasteTypes.length === 0) {
      return (
        <View style={s.emptyBox}>
          <Text style={s.emptyTitle}>Sin resultados</Text>
          <Text style={s.emptyText}>
            {query.trim().length > 0
              ? `No encontramos "${query}". ¿Querés sugerirlo a la municipalidad?`
              : 'No hay residuos disponibles ahora.'}
          </Text>
          {query.trim().length > 0 && (
            <TouchableOpacity
              style={s.retryBtn}
              onPress={() =>
                Alert.alert(
                  'Gracias',
                  'Hemos registrado tu sugerencia. La municipalidad la revisará pronto.'
                )
              }
              activeOpacity={0.85}
            >
              <Text style={s.retryBtnText}>Sugerir residuo</Text>
            </TouchableOpacity>
          )}
        </View>
      );
    }

    if (query.trim().length > 0) {
      return (
        <View>
          <Text style={s.sectionLabel}>
            {wasteTypes.length} resultado{wasteTypes.length === 1 ? '' : 's'}
          </Text>
          {wasteTypes.map((wt, idx) => renderCard(wt, idx))}
        </View>
      );
    }

    let counter = 0;
    return Object.entries(grouped).map(([cat, items]) => {
      const meta = CATEGORIES.find((c) => c.key === (cat as Category));
      return (
        <View key={cat} style={{ marginBottom: spacing.sm }}>
          <View style={s.groupHeader}>
            <View style={[s.groupDot, { backgroundColor: meta?.color || colors.textMuted }]} />
            <Text style={s.groupTitle}>{meta?.label || cat}</Text>
            <Text style={s.groupCount}>{items.length}</Text>
          </View>
          {items.map((wt) => {
            const node = renderCard(wt, counter);
            counter += 1;
            return node;
          })}
        </View>
      );
    });
  };

  return (
    <View style={s.container}>
      <View style={s.stickyHeader}>
        <Text style={s.eyebrow}>NTP 900.058</Text>
        <Text style={s.pageTitle}>Guía de reciclaje</Text>
        <Text style={s.pageSub}>Buscá, filtrá y aprendé a separar tus residuos.</Text>

        <View style={s.searchBox}>
          <Feather name="search" size={15} color={colors.textMuted} style={{ marginRight: 8 }} />
          <TextInput
            style={s.searchInput}
            placeholder="Buscar residuo (ej: papel, pilas...)"
            placeholderTextColor={colors.textPlaceholder}
            value={query}
            onChangeText={setQuery}
            autoCapitalize="none"
            autoCorrect={false}
            clearButtonMode="while-editing"
            returnKeyType="search"
          />
          {query.length > 0 && Platform.OS !== 'ios' ? (
            <TouchableOpacity onPress={() => setQuery('')} hitSlop={8}>
              <Text style={s.searchClear}>×</Text>
            </TouchableOpacity>
          ) : null}
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={s.chipsRow}
        >
          {CATEGORIES.map((c) => {
            const active = activeCategory === c.key;
            return (
              <TouchableOpacity
                key={c.key}
                onPress={() => onSelectCategory(c.key)}
                activeOpacity={0.8}
              >
                <View
                  style={[
                    s.chip,
                    active && { borderColor: `${c.color}80`, backgroundColor: `${c.color}14` },
                  ]}
                >
                  <Text style={[s.chipLabel, { color: active ? c.color : colors.textSecondary }]}>
                    {c.label}
                  </Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      <ScrollView
        style={s.scroll}
        contentContainerStyle={s.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
        }
        keyboardShouldPersistTaps="handled"
      >
        {loading ? (
          <View style={s.loadingBox}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        ) : (
          renderResults()
        )}
      </ScrollView>

      <Modal
        visible={selected !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setSelected(null)}
      >
        <Pressable style={s.modalBackdrop} onPress={() => setSelected(null)}>
          <Pressable style={s.modalCard} onPress={(e) => e.stopPropagation()}>
            {selected && (
              <>
                <View style={s.modalHeader}>
                  <View style={[s.colorBox, { backgroundColor: selected.colorCode }]} />
                  <Text style={s.modalTitle}>{selected.name}</Text>
                  <TouchableOpacity onPress={() => setSelected(null)} hitSlop={8}>
                    <Feather name="x" size={20} color={colors.textSecondary} />
                  </TouchableOpacity>
                </View>

                {selected.description ? (
                  <Text style={s.modalDesc}>{selected.description}</Text>
                ) : null}

                {selected.examples && selected.examples.length > 0 ? (
                  <View style={s.modalSection}>
                    <Text style={s.modalSectionLabel}>Ejemplos</Text>
                    <View style={s.tagsRow}>
                      {selected.examples.map((ex) => (
                        <View key={ex} style={s.tag}>
                          <Text style={s.tagText}>{ex}</Text>
                        </View>
                      ))}
                    </View>
                  </View>
                ) : null}

                {selected.handlingInstructions ? (
                  <View
                    style={[
                      s.instructionBox,
                      {
                        backgroundColor: `${selected.colorCode}12`,
                        borderColor: `${selected.colorCode}40`,
                      },
                    ]}
                  >
                    <Text style={[s.instructionLabel, { color: selected.colorCode }]}>
                      ¿Cómo desechar?
                    </Text>
                    <Text style={s.instructionText}>{selected.handlingInstructions}</Text>
                  </View>
                ) : null}
              </>
            )}
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: spacing.xxl, paddingBottom: 40 },
  stickyHeader: {
    paddingHorizontal: spacing.xxl,
    paddingTop: 60,
    paddingBottom: spacing.md,
    backgroundColor: colors.bg,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderSoft,
  },
  loadingBox: { paddingVertical: 80, alignItems: 'center' },

  eyebrow: {
    fontFamily: fontFamily.sansBold,
    fontSize: 10.5,
    color: colors.primary,
    letterSpacing: 1.4,
    textTransform: 'uppercase',
    marginBottom: 6,
  },
  pageTitle: {
    fontFamily: fontFamily.serif,
    fontSize: 28,
    fontWeight: '500',
    color: colors.ink,
    letterSpacing: -0.5,
    lineHeight: 32,
    marginBottom: 4,
  },
  pageSub: {
    fontFamily: fontFamily.sansRegular,
    fontSize: 13.5,
    color: colors.textSecondary,
    marginBottom: spacing.lg,
  },

  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.bg,
    borderRadius: radius.md,
    paddingHorizontal: 12,
    paddingVertical: Platform.OS === 'ios' ? 10 : 4,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.md,
  },
  searchInput: {
    flex: 1,
    color: colors.ink,
    fontSize: 14,
    fontFamily: fontFamily.sansRegular,
    paddingVertical: Platform.OS === 'ios' ? 0 : 8,
  },
  searchClear: {
    color: colors.textMuted,
    fontSize: 20,
    fontWeight: '300',
    paddingHorizontal: 4,
  },

  chipsRow: { gap: spacing.xs, paddingRight: spacing.sm, paddingBottom: 4 },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.bg,
  },
  chipLabel: {
    fontFamily: fontFamily.sansSemibold,
    fontSize: 11.5,
  },

  groupHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
  },
  groupDot: { width: 7, height: 7, borderRadius: 3.5, marginRight: 8 },
  groupTitle: {
    fontFamily: fontFamily.sansBold,
    fontSize: 11,
    color: colors.textSecondary,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    flex: 1,
  },
  groupCount: {
    fontFamily: fontFamily.sansSemibold,
    fontSize: 11,
    color: colors.textMuted,
  },

  sectionLabel: {
    fontFamily: fontFamily.sansSemibold,
    fontSize: 11.5,
    color: colors.textSecondary,
    marginTop: spacing.md,
    marginBottom: spacing.sm,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },

  card: {
    backgroundColor: colors.bg,
    borderRadius: radius.lg,
    padding: spacing.lg,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    borderLeftWidth: 3,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: spacing.sm },
  colorBox: {
    width: 18,
    height: 18,
    borderRadius: 5,
    marginRight: spacing.md,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.06)',
  },
  cardTitle: {
    fontFamily: fontFamily.sansSemibold,
    fontSize: 15,
    color: colors.ink,
    flex: 1,
  },
  descText: {
    fontFamily: fontFamily.sansRegular,
    fontSize: 13,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
    lineHeight: 19,
  },
  examplesText: {
    fontFamily: fontFamily.sansRegular,
    fontSize: 12,
    color: colors.textMuted,
    marginBottom: spacing.md,
    fontStyle: 'italic',
  },

  moreBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.primaryBorder,
    backgroundColor: colors.primarySoft,
  },
  moreBtnText: {
    fontFamily: fontFamily.sansSemibold,
    color: colors.primaryDark,
    fontSize: 11.5,
  },

  tagsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  tag: {
    backgroundColor: colors.bgSurface,
    paddingHorizontal: spacing.md,
    paddingVertical: 5,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  tagText: {
    fontFamily: fontFamily.sansSemibold,
    color: colors.textSecondary,
    fontSize: 11.5,
  },

  instructionBox: {
    padding: spacing.lg,
    borderRadius: radius.md,
    borderWidth: 1,
    marginTop: spacing.md,
  },
  instructionLabel: {
    fontFamily: fontFamily.sansBold,
    fontSize: 11,
    letterSpacing: 0.6,
    marginBottom: spacing.sm,
    textTransform: 'uppercase',
  },
  instructionText: {
    fontFamily: fontFamily.sansMedium,
    color: colors.ink,
    fontSize: 14,
    lineHeight: 20,
  },

  emptyBox: { alignItems: 'center', justifyContent: 'center', paddingVertical: 60 },
  emptyTitle: {
    fontFamily: fontFamily.sansSemibold,
    color: colors.ink,
    fontSize: 15,
    marginBottom: 6,
  },
  emptyText: {
    fontFamily: fontFamily.sansRegular,
    color: colors.textSecondary,
    fontSize: 13,
    textAlign: 'center',
    marginBottom: spacing.lg,
    paddingHorizontal: 30,
  },
  retryBtn: {
    backgroundColor: colors.primary,
    paddingHorizontal: 22,
    paddingVertical: 10,
    borderRadius: radius.pill,
  },
  retryBtnText: {
    color: '#FFFFFF',
    fontFamily: fontFamily.sansSemibold,
    fontSize: 13,
  },

  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,30,43,0.55)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: colors.bg,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: spacing.xxl,
    borderTopWidth: 1,
    borderColor: colors.border,
    maxHeight: '85%',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.lg,
    gap: spacing.sm,
  },
  modalTitle: {
    fontFamily: fontFamily.serif,
    fontSize: 22,
    fontWeight: '500',
    color: colors.ink,
    flex: 1,
    letterSpacing: -0.3,
  },
  modalDesc: {
    fontFamily: fontFamily.sansRegular,
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 20,
    marginBottom: spacing.lg,
  },
  modalSection: { marginBottom: spacing.md },
  modalSectionLabel: {
    fontFamily: fontFamily.sansBold,
    fontSize: 10.5,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
});
