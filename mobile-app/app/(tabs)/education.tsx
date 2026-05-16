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
import { Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

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
  icon: keyof typeof Feather.glyphMap;
}

const CATEGORIES: CategoryChip[] = [
  { key: 'all', label: 'Todos', color: '#10B981', icon: 'grid' },
  { key: 'organic', label: 'Orgánico', color: '#92400E', icon: 'feather' },
  { key: 'recyclable', label: 'Reciclable', color: '#3B82F6', icon: 'refresh-cw' },
  { key: 'non_recyclable', label: 'No reciclable', color: '#475569', icon: 'trash-2' },
  { key: 'hazardous', label: 'Peligroso', color: '#EF4444', icon: 'alert-octagon' },
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

  return (
    <Animated.View style={{ opacity, transform: [{ translateY }] }}>{children}</Animated.View>
  );
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
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWasteTypes('', 'all');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Debounce search
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
      <View style={[s.card, { borderColor: `${wt.colorCode}40`, backgroundColor: `${wt.colorCode}0A` }]}>
        <View style={s.cardHeader}>
          <View style={[s.colorBox, { backgroundColor: wt.colorCode }]} />
          <Text style={s.cardTitle}>{wt.name}</Text>
        </View>

        {wt.description ? <Text style={s.descText}>{wt.description}</Text> : null}

        {wt.examples && wt.examples.length > 0 ? (
          <View style={s.examplesRow}>
            <Feather name="list" size={12} color="#64748B" style={{ marginRight: 6 }} />
            <Text style={s.examplesText} numberOfLines={2}>
              Ejemplos: {wt.examples.join(', ')}
            </Text>
          </View>
        ) : null}

        <TouchableOpacity
          style={[s.moreBtn, { borderColor: `${wt.colorCode}60` }]}
          onPress={() => setSelected(wt)}
          activeOpacity={0.8}
        >
          <Text style={[s.moreBtnText, { color: wt.colorCode }]}>Ver más</Text>
          <Feather name="chevron-right" size={14} color={wt.colorCode} style={{ marginLeft: 4 }} />
        </TouchableOpacity>
      </View>
    </AnimatedItem>
  );

  const renderResults = () => {
    if (error) {
      return (
        <View style={s.emptyBox}>
          <Feather name="wifi-off" size={48} color="#EF4444" style={{ marginBottom: 16 }} />
          <Text style={s.emptyTitle}>Algo salió mal</Text>
          <Text style={s.emptyText}>{error}</Text>
          <TouchableOpacity
            style={s.retryBtn}
            onPress={() => {
              setLoading(true);
              fetchWasteTypes(query, activeCategory);
            }}
          >
            <Feather name="refresh-cw" size={14} color="#FFF" style={{ marginRight: 6 }} />
            <Text style={s.retryBtnText}>Reintentar</Text>
          </TouchableOpacity>
        </View>
      );
    }

    if (wasteTypes.length === 0) {
      return (
        <View style={s.emptyBox}>
          <Feather name="search" size={48} color="#334155" style={{ marginBottom: 16 }} />
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
            >
              <Feather name="send" size={14} color="#FFF" style={{ marginRight: 6 }} />
              <Text style={s.retryBtnText}>Sugerir residuo</Text>
            </TouchableOpacity>
          )}
        </View>
      );
    }

    if (query.trim().length > 0) {
      return (
        <View>
          <Text style={s.sectionLabel}>{wasteTypes.length} resultado{wasteTypes.length === 1 ? '' : 's'}</Text>
          {wasteTypes.map((wt, idx) => renderCard(wt, idx))}
        </View>
      );
    }

    // Grouped by category
    let counter = 0;
    return Object.entries(grouped).map(([cat, items]) => {
      const meta = CATEGORIES.find((c) => c.key === (cat as Category));
      return (
        <View key={cat} style={{ marginBottom: 8 }}>
          <View style={s.groupHeader}>
            {meta ? (
              <View style={[s.groupDot, { backgroundColor: meta.color }]} />
            ) : (
              <View style={[s.groupDot, { backgroundColor: '#64748B' }]} />
            )}
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
          <Feather name="search" size={16} color="#94A3B8" style={{ marginRight: 8 }} />
          <TextInput
            style={s.searchInput}
            placeholder="Buscar residuo (ej: papel, pilas...)"
            placeholderTextColor="#64748B"
            value={query}
            onChangeText={setQuery}
            autoCapitalize="none"
            autoCorrect={false}
            clearButtonMode="while-editing"
            returnKeyType="search"
          />
          {query.length > 0 && Platform.OS !== 'ios' ? (
            <TouchableOpacity onPress={() => setQuery('')} hitSlop={8}>
              <Feather name="x" size={16} color="#94A3B8" />
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
                style={s.chipTouch}
              >
                <LinearGradient
                  colors={active ? [`${c.color}40`, `${c.color}15`] : ['rgba(30,41,59,0.6)', 'rgba(30,41,59,0.3)']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={[
                    s.chip,
                    { borderColor: active ? `${c.color}80` : '#334155' },
                  ]}
                >
                  <Feather name={c.icon} size={12} color={active ? c.color : '#94A3B8'} />
                  <Text style={[s.chipLabel, { color: active ? c.color : '#94A3B8' }]}>{c.label}</Text>
                </LinearGradient>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      <ScrollView
        style={s.scroll}
        contentContainerStyle={s.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#10B981" />}
        keyboardShouldPersistTaps="handled"
      >
        {loading ? (
          <View style={s.loadingBox}>
            <ActivityIndicator size="large" color="#10B981" />
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
                    <Feather name="x" size={20} color="#94A3B8" />
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
                      { backgroundColor: `${selected.colorCode}15`, borderColor: `${selected.colorCode}40` },
                    ]}
                  >
                    <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
                      <Feather name="info" size={16} color={selected.colorCode} style={{ marginRight: 6 }} />
                      <Text style={[s.instructionLabel, { color: selected.colorCode }]}>¿Cómo desechar?</Text>
                    </View>
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
  container: { flex: 1, backgroundColor: '#0F172A' },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 24, paddingBottom: 40 },
  stickyHeader: { paddingHorizontal: 24, paddingTop: 60, paddingBottom: 12, backgroundColor: '#0F172A' },
  loadingBox: { paddingVertical: 80, alignItems: 'center' },
  pageTitle: { fontSize: 26, fontWeight: '900', color: '#F8FAFC', marginBottom: 4, letterSpacing: -0.5 },
  pageSub: { fontSize: 13, color: '#94A3B8', marginBottom: 14, fontWeight: '500' },
  searchBox: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(30,41,59,0.8)',
    borderRadius: 16, paddingHorizontal: 14, paddingVertical: Platform.OS === 'ios' ? 12 : 4,
    borderWidth: 1, borderColor: '#334155', marginBottom: 12,
  },
  searchInput: { flex: 1, color: '#F8FAFC', fontSize: 14, paddingVertical: Platform.OS === 'ios' ? 0 : 8 },
  chipsRow: { gap: 8, paddingRight: 8, paddingBottom: 4 },
  chipTouch: {},
  chip: {
    flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 8,
    borderRadius: 999, borderWidth: 1,
  },
  chipLabel: { fontSize: 12, fontWeight: '700' },
  groupHeader: { flexDirection: 'row', alignItems: 'center', marginTop: 16, marginBottom: 10 },
  groupDot: { width: 10, height: 10, borderRadius: 5, marginRight: 8 },
  groupTitle: { fontSize: 14, fontWeight: '800', color: '#F8FAFC', letterSpacing: 0.3, flex: 1 },
  groupCount: { fontSize: 12, fontWeight: '700', color: '#64748B' },
  sectionLabel: { fontSize: 12, color: '#94A3B8', fontWeight: '700', marginTop: 12, marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 },
  card: { borderRadius: 20, padding: 18, marginBottom: 14, borderWidth: 1 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  colorBox: {
    width: 28, height: 28, borderRadius: 14, marginRight: 12, borderWidth: 2, borderColor: '#1E293B',
  },
  cardTitle: { fontSize: 17, fontWeight: '800', color: '#F8FAFC', flex: 1 },
  descText: { fontSize: 13, color: '#CBD5E1', marginBottom: 10, lineHeight: 19 },
  examplesRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  examplesText: { fontSize: 12, color: '#94A3B8', flex: 1 },
  moreBtn: {
    flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', paddingHorizontal: 12,
    paddingVertical: 6, borderRadius: 999, borderWidth: 1, backgroundColor: 'rgba(15,23,42,0.5)',
  },
  moreBtnText: { fontSize: 12, fontWeight: '700' },
  tagsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  tag: {
    backgroundColor: 'rgba(30,41,59,0.8)', paddingHorizontal: 12, paddingVertical: 6,
    borderRadius: 10, borderWidth: 1, borderColor: '#334155',
  },
  tagText: { color: '#CBD5E1', fontSize: 12, fontWeight: '600' },
  instructionBox: { padding: 16, borderRadius: 16, borderWidth: 1, marginTop: 12 },
  instructionLabel: { fontSize: 13, fontWeight: '800', letterSpacing: 0.5 },
  instructionText: { color: '#F8FAFC', fontSize: 14, lineHeight: 20, fontWeight: '500' },
  emptyBox: { alignItems: 'center', justifyContent: 'center', paddingVertical: 60 },
  emptyTitle: { color: '#F8FAFC', fontSize: 16, fontWeight: '800', marginBottom: 6 },
  emptyText: { color: '#94A3B8', fontSize: 13, fontWeight: '500', textAlign: 'center', marginBottom: 20, paddingHorizontal: 30 },
  retryBtn: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#10B981',
    paddingHorizontal: 18, paddingVertical: 10, borderRadius: 999,
  },
  retryBtnText: { color: '#FFF', fontSize: 13, fontWeight: '700' },
  modalBackdrop: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.65)', justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: '#0F172A', borderTopLeftRadius: 28, borderTopRightRadius: 28,
    padding: 24, borderTopWidth: 1, borderColor: '#334155', maxHeight: '85%',
  },
  modalHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  modalTitle: { fontSize: 20, fontWeight: '900', color: '#F8FAFC', flex: 1 },
  modalDesc: { fontSize: 14, color: '#CBD5E1', lineHeight: 21, marginBottom: 16 },
  modalSection: { marginBottom: 14 },
  modalSectionLabel: { fontSize: 12, color: '#94A3B8', fontWeight: '800', marginBottom: 8, letterSpacing: 0.5, textTransform: 'uppercase' },
});
