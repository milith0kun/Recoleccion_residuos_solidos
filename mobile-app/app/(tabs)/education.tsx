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
import api from '../../src/api/client';
import { colors, radius, spacing } from '../../src/theme/tokens';

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
  { key: 'organic', label: 'Orgánico', color: '#92400E' },
  { key: 'recyclable', label: 'Reciclable', color: colors.info },
  { key: 'non_recyclable', label: 'No reciclable', color: '#475569' },
  { key: 'hazardous', label: 'Peligroso', color: colors.danger },
];

interface AnimatedItemProps {
  index: number;
  children: React.ReactNode;
}

function AnimatedItem({ index, children }: AnimatedItemProps) {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(20)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration: 320,
        delay: index * 60,
        useNativeDriver: true,
      }),
      Animated.timing(translateY, {
        toValue: 0,
        duration: 320,
        delay: index * 60,
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
      <View
        style={[
          s.card,
          { borderColor: `${wt.colorCode}40`, backgroundColor: `${wt.colorCode}0A` },
        ]}
      >
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
          style={[s.moreBtn, { borderColor: `${wt.colorCode}60` }]}
          onPress={() => setSelected(wt)}
          activeOpacity={0.8}
        >
          <Text style={[s.moreBtnText, { color: wt.colorCode }]}>Ver más</Text>
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
              ? `No encontramos "${query}". ¿Quieres sugerirlo a la municipalidad?`
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
            <View style={[s.groupDot, { backgroundColor: meta?.color || colors.textFaint }]} />
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
        <Text style={s.pageTitle}>Guía de Reciclaje</Text>
        <Text style={s.pageSub}>NTP 900.058 — busca, filtra y aprende a separar.</Text>

        <View style={s.searchBox}>
          <TextInput
            style={s.searchInput}
            placeholder="Buscar residuo (ej: papel, pilas...)"
            placeholderTextColor={colors.textFaint}
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
                    {
                      borderColor: active ? `${c.color}80` : colors.border,
                      backgroundColor: active ? `${c.color}25` : 'rgba(30,41,59,0.6)',
                    },
                  ]}
                >
                  <Text style={[s.chipLabel, { color: active ? c.color : colors.textMuted }]}>
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
                    <Text style={s.modalClose}>×</Text>
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
                        backgroundColor: `${selected.colorCode}15`,
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
  },
  loadingBox: { paddingVertical: 80, alignItems: 'center' },

  pageTitle: { fontSize: 26, fontWeight: '900', color: colors.textPrimary, marginBottom: 4, letterSpacing: -0.5 },
  pageSub: { fontSize: 13, color: colors.textMuted, marginBottom: spacing.md, fontWeight: '500' },

  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(30,41,59,0.8)',
    borderRadius: radius.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: Platform.OS === 'ios' ? 12 : 4,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.md,
  },
  searchInput: {
    flex: 1,
    color: colors.textPrimary,
    fontSize: 14,
    paddingVertical: Platform.OS === 'ios' ? 0 : 8,
  },
  searchClear: { color: colors.textMuted, fontSize: 22, fontWeight: '300', paddingHorizontal: 4 },

  chipsRow: { gap: spacing.sm, paddingRight: spacing.sm, paddingBottom: 4 },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: radius.pill,
    borderWidth: 1,
  },
  chipLabel: { fontSize: 12, fontWeight: '700' },

  groupHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
  },
  groupDot: { width: 8, height: 8, borderRadius: 4, marginRight: spacing.sm },
  groupTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.textMuted,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    flex: 1,
  },
  groupCount: { fontSize: 12, fontWeight: '700', color: colors.textFaint },

  sectionLabel: {
    fontSize: 12,
    color: colors.textMuted,
    fontWeight: '700',
    marginTop: spacing.md,
    marginBottom: spacing.sm,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },

  card: { borderRadius: radius.xl, padding: spacing.lg, marginBottom: spacing.md, borderWidth: 1 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: spacing.sm },
  colorBox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    marginRight: spacing.md,
    borderWidth: 2,
    borderColor: colors.bgElevated,
  },
  cardTitle: { fontSize: 16, fontWeight: '800', color: colors.textPrimary, flex: 1 },
  descText: { fontSize: 13, color: colors.textSecondary, marginBottom: spacing.sm, lineHeight: 19 },
  examplesText: { fontSize: 12, color: colors.textMuted, marginBottom: spacing.md, fontStyle: 'italic' },

  moreBtn: {
    alignSelf: 'flex-start',
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: radius.pill,
    borderWidth: 1,
    backgroundColor: 'rgba(15,23,42,0.5)',
  },
  moreBtnText: { fontSize: 12, fontWeight: '700' },

  tagsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  tag: {
    backgroundColor: 'rgba(30,41,59,0.8)',
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  tagText: { color: colors.textSecondary, fontSize: 12, fontWeight: '600' },

  instructionBox: {
    padding: spacing.lg,
    borderRadius: radius.lg,
    borderWidth: 1,
    marginTop: spacing.md,
  },
  instructionLabel: {
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.5,
    marginBottom: spacing.sm,
    textTransform: 'uppercase',
  },
  instructionText: { color: colors.textPrimary, fontSize: 14, lineHeight: 20, fontWeight: '500' },

  emptyBox: { alignItems: 'center', justifyContent: 'center', paddingVertical: 60 },
  emptyTitle: { color: colors.textPrimary, fontSize: 16, fontWeight: '800', marginBottom: 6 },
  emptyText: {
    color: colors.textMuted,
    fontSize: 13,
    fontWeight: '500',
    textAlign: 'center',
    marginBottom: spacing.xl,
    paddingHorizontal: 30,
  },
  retryBtn: {
    backgroundColor: colors.primary,
    paddingHorizontal: 22,
    paddingVertical: 10,
    borderRadius: radius.pill,
  },
  retryBtnText: { color: '#FFF', fontSize: 13, fontWeight: '700' },

  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.65)', justifyContent: 'flex-end' },
  modalCard: {
    backgroundColor: colors.bg,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: spacing.xxl,
    borderTopWidth: 1,
    borderColor: colors.border,
    maxHeight: '85%',
  },
  modalHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: spacing.lg },
  modalTitle: { fontSize: 20, fontWeight: '900', color: colors.textPrimary, flex: 1 },
  modalClose: { color: colors.textMuted, fontSize: 26, fontWeight: '300', paddingHorizontal: 4 },
  modalDesc: { fontSize: 14, color: colors.textSecondary, lineHeight: 21, marginBottom: spacing.lg },
  modalSection: { marginBottom: spacing.md },
  modalSectionLabel: {
    fontSize: 12,
    color: colors.textMuted,
    fontWeight: '800',
    marginBottom: spacing.sm,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
});
