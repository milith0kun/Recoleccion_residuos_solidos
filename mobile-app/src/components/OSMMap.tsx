import React, {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import WebView, { WebViewMessageEvent } from 'react-native-webview';
import { colors, fontFamily } from '../theme/tokens';

export interface MapMarker {
  id: string;
  lat: number;
  lng: number;
  /** Color del marker (hex). */
  color?: string;
  /** Etiqueta corta dentro del marker (ej. número de waypoint). */
  label?: string;
  /** Texto del popup al tocar. */
  popup?: string;
  /** Tipo visual: pin (gota tradicional), dot (círculo lleno), pulse (pulsante). */
  variant?: 'pin' | 'dot' | 'pulse';
}

export interface MapPolyline {
  id: string;
  /** Coords en orden: [[lat,lng], ...]. */
  points: [number, number][];
  color?: string;
  width?: number;
  /** Si true, línea punteada. */
  dashed?: boolean;
}

export interface OSMMapRef {
  /** Centra y hace zoom suave hacia una coordenada. */
  animateTo: (lat: number, lng: number, zoom?: number) => void;
  /** Ajusta el viewport para que entren todos los puntos. */
  fitBounds: (points: [number, number][]) => void;
}

interface OSMMapProps {
  /** Coordenada inicial. */
  center: { lat: number; lng: number };
  zoom?: number;
  markers?: MapMarker[];
  polylines?: MapPolyline[];
  /** Si true, muestra un marker para la posición del usuario (azul). */
  showUserLocation?: boolean;
  userLocation?: { lat: number; lng: number } | null;
  /** Disparado al tocar un marker (recibe id del marker). */
  onMarkerPress?: (id: string) => void;
  /** Disparado cuando el mapa terminó de inicializarse. */
  onReady?: () => void;
  style?: import('react-native').StyleProp<import('react-native').ViewStyle>;
}

const TILE_URL = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
const TILE_ATTRIB = '&copy; OpenStreetMap';

/**
 * Mapa basado en Leaflet + OpenStreetMap dentro de un WebView. Sin API key.
 *
 * Funcionamiento:
 *   - Al montar, el WebView carga un HTML inline con leaflet desde CDN.
 *   - El componente envía comandos por postMessage cuando cambian props
 *     (setMarkers, setPolylines, animateTo).
 *   - El WebView emite eventos hacia React Native con
 *     `window.ReactNativeWebView.postMessage(JSON.stringify({ type, ... }))`.
 */
export const OSMMap = forwardRef<OSMMapRef, OSMMapProps>(function OSMMap(
  {
    center,
    zoom = 14,
    markers = [],
    polylines = [],
    showUserLocation = false,
    userLocation = null,
    onMarkerPress,
    onReady,
    style,
  },
  ref
) {
  const webRef = useRef<WebView>(null);
  const isReadyRef = useRef(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const sendCommand = useCallback((cmd: object) => {
    if (!webRef.current || !isReadyRef.current) return;
    try {
      const payload = JSON.stringify(cmd).replace(/</g, '\\u003c');
      webRef.current.injectJavaScript(`window.osmHandle(${payload}); true;`);
    } catch (err) {
      if (__DEV__) console.warn('[OSMMap] injectJavaScript failed', err);
    }
  }, []);

  useImperativeHandle(ref, () => ({
    animateTo: (lat, lng, z = 16) => sendCommand({ type: 'animateTo', lat, lng, zoom: z }),
    fitBounds: (pts) => sendCommand({ type: 'fitBounds', points: pts }),
  }));

  // Re-sync de markers / polylines / user location cuando cambian.
  useEffect(() => {
    sendCommand({ type: 'setMarkers', markers });
  }, [markers, sendCommand]);

  useEffect(() => {
    sendCommand({ type: 'setPolylines', polylines });
  }, [polylines, sendCommand]);

  useEffect(() => {
    sendCommand({ type: 'setUser', enabled: showUserLocation, location: userLocation });
  }, [showUserLocation, userLocation, sendCommand]);

  const html = useMemo(() => buildHtml(center, zoom), [center.lat, center.lng, zoom]);

  const handleMessage = useCallback(
    (event: WebViewMessageEvent) => {
      try {
        const data = JSON.parse(event.nativeEvent.data) as {
          type: string;
          id?: string;
          message?: string;
        };
        if (data.type === 'ready') {
          isReadyRef.current = true;
          setLoadError(null);
          // Aplicar el estado inicial completo apenas el mapa esté listo.
          sendCommand({ type: 'setMarkers', markers });
          sendCommand({ type: 'setPolylines', polylines });
          sendCommand({ type: 'setUser', enabled: showUserLocation, location: userLocation });
          onReady?.();
        } else if (data.type === 'markerPress' && data.id) {
          onMarkerPress?.(data.id);
        } else if (data.type === 'loadError' || data.type === 'jsError') {
          if (__DEV__) console.warn('[OSMMap]', data.type, data.message);
          setLoadError(data.message ?? 'Error al cargar el mapa');
        }
      } catch (e) {
        if (__DEV__) console.warn('[OSMMap] bad message', e);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [onReady, onMarkerPress]
  );

  return (
    <View style={[styles.root, style]}>
      <WebView
        ref={webRef}
        originWhitelist={['*']}
        source={{ html, baseUrl: 'https://tile.openstreetmap.org/' }}
        onMessage={handleMessage}
        javaScriptEnabled
        domStorageEnabled
        scalesPageToFit={false}
        // No usamos androidLayerType: en algunos GPUs causa crash.
        style={styles.web}
        nestedScrollEnabled
        mixedContentMode="always"
        allowsInlineMediaPlayback
        cacheEnabled
        onError={(e) => {
          setLoadError(e.nativeEvent.description || 'Error al cargar el mapa');
          if (__DEV__) console.warn('[OSMMap] webview error', e.nativeEvent);
        }}
        onHttpError={(e) => {
          if (__DEV__) console.warn('[OSMMap] webview http error', e.nativeEvent);
        }}
        renderLoading={() => (
          <View style={styles.loadingOverlay}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={styles.loadingText}>Cargando mapa…</Text>
          </View>
        )}
        startInLoadingState
      />
      {loadError ? (
        <View style={styles.errorOverlay} pointerEvents="none">
          <Text style={styles.errorText}>{loadError}</Text>
        </View>
      ) : null}
    </View>
  );
});

function buildHtml(center: { lat: number; lng: number }, zoom: number): string {
  const accent = colors.primary;
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no" />
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
  <style>
    * { box-sizing: border-box; }
    html, body { margin: 0; padding: 0; width: 100%; height: 100vh; overflow: hidden; background: #F4F6F4; }
    #map { position: absolute; top: 0; left: 0; right: 0; bottom: 0; width: 100%; height: 100%; }
    .leaflet-container { height: 100%; width: 100%; background: #F4F6F4; }
    .leaflet-control-attribution { font-size: 10px; }
    .pin {
      width: 24px; height: 24px; border-radius: 12px;
      border: 2px solid #FFFFFF;
      box-shadow: 0 2px 4px rgba(0,30,43,0.3);
      display: flex; align-items: center; justify-content: center;
      font-family: -apple-system, sans-serif; font-size: 11px; font-weight: 700;
      color: #FFFFFF;
    }
    .me {
      width: 16px; height: 16px; border-radius: 8px;
      background: #00684A; border: 3px solid #FFFFFF;
      box-shadow: 0 0 0 6px rgba(0,104,74,0.22), 0 2px 4px rgba(0,30,43,0.3);
    }
    .pulse-wrap { display:flex; align-items:center; justify-content:center; width:36px; height:36px; }
    .pulse-halo {
      position: absolute; width: 14px; height: 14px; border-radius: 7px;
      background: ${accent}; opacity: 0.4;
      animation: pulse 1.4s ease-out infinite;
    }
    .pulse-core {
      width: 14px; height: 14px; border-radius: 7px;
      border: 3px solid ${accent}; background: #FFFFFF;
      box-shadow: 0 2px 4px rgba(0,30,43,0.25);
    }
    @keyframes pulse {
      0% { transform: scale(1); opacity: 0.45; }
      100% { transform: scale(2.5); opacity: 0; }
    }
  </style>
</head>
<body>
<div id="map"></div>
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
<script>
  var map, markerLayer, polylineLayer, userMarker = null;

  function send(msg) {
    if (window.ReactNativeWebView) {
      window.ReactNativeWebView.postMessage(JSON.stringify(msg));
    }
  }

  function initMap() {
    if (!window.L) {
      send({ type: 'loadError', message: 'Leaflet no se cargó (CDN bloqueado?)' });
      return;
    }
    try {
      map = L.map('map', {
        zoomControl: false,
        attributionControl: true,
        preferCanvas: true,
      }).setView([${center.lat}, ${center.lng}], ${zoom});
      L.tileLayer('${TILE_URL}', {
        attribution: '${TILE_ATTRIB}',
        maxZoom: 19,
        crossOrigin: true,
      }).addTo(map);
      L.control.zoom({ position: 'topright' }).addTo(map);
      markerLayer = L.layerGroup().addTo(map);
      polylineLayer = L.layerGroup().addTo(map);

      // Crítico: invalidateSize despues de que el container tenga dimensión real.
      // Sin esto Leaflet calcula el tile range con tamaño 0 y NO descarga tiles → mapa blanco.
      var fixSize = function() { if (map) map.invalidateSize(true); };
      setTimeout(fixSize, 80);
      setTimeout(fixSize, 300);
      setTimeout(fixSize, 800);
      window.addEventListener('resize', fixSize);

      send({ type: 'ready' });
    } catch (err) {
      send({ type: 'loadError', message: 'init: ' + (err && err.message ? err.message : String(err)) });
    }
  }

  function buildMarkerIcon(m) {
    var color = m.color || '${accent}';
    var label = m.label || '';
    if (m.variant === 'pulse') {
      return L.divIcon({
        className: '',
        html: '<div class="pulse-wrap"><div class="pulse-halo" style="background:' + color + '"></div>'
            + '<div class="pulse-core" style="border-color:' + color + '"></div></div>',
        iconSize: [36, 36],
        iconAnchor: [18, 18],
      });
    }
    if (m.variant === 'dot') {
      return L.divIcon({
        className: '',
        html: '<div class="pin" style="background:' + color + ';width:18px;height:18px;border-radius:9px;font-size:0">' + '</div>',
        iconSize: [18, 18],
        iconAnchor: [9, 9],
      });
    }
    return L.divIcon({
      className: '',
      html: '<div class="pin" style="background:' + color + '">' + label + '</div>',
      iconSize: [24, 24],
      iconAnchor: [12, 12],
    });
  }

  window.osmHandle = function(cmd) {
    if (!cmd || !map || !markerLayer || !polylineLayer) return;
    if (cmd.type === 'setMarkers') {
      markerLayer.clearLayers();
      (cmd.markers || []).forEach(function(m) {
        var marker = L.marker([m.lat, m.lng], { icon: buildMarkerIcon(m) });
        marker.on('click', function() { send({ type: 'markerPress', id: m.id }); });
        if (m.popup) marker.bindPopup(m.popup);
        marker.addTo(markerLayer);
      });
    } else if (cmd.type === 'setPolylines') {
      polylineLayer.clearLayers();
      (cmd.polylines || []).forEach(function(p) {
        var opts = {
          color: p.color || '${accent}',
          weight: p.width || 4,
          opacity: 0.9,
        };
        if (p.dashed) opts.dashArray = '8,8';
        L.polyline((p.points || []).map(function(pt){ return [pt[0], pt[1]]; }), opts).addTo(polylineLayer);
      });
    } else if (cmd.type === 'setUser') {
      if (userMarker) { map.removeLayer(userMarker); userMarker = null; }
      if (cmd.enabled && cmd.location) {
        var icon = L.divIcon({ className: '', html: '<div class="me"></div>', iconSize: [16, 16], iconAnchor: [8, 8] });
        userMarker = L.marker([cmd.location.lat, cmd.location.lng], { icon: icon, interactive: false }).addTo(map);
      }
    } else if (cmd.type === 'animateTo') {
      map.flyTo([cmd.lat, cmd.lng], cmd.zoom || map.getZoom(), { duration: 0.6 });
    } else if (cmd.type === 'fitBounds') {
      var pts = (cmd.points || []).map(function(p){ return [p[0], p[1]]; });
      if (pts.length) {
        map.fitBounds(L.latLngBounds(pts), { padding: [40, 40], maxZoom: 16 });
      }
    }
  };

  // Atrapar errores JS no manejados.
  window.onerror = function(msg) {
    send({ type: 'jsError', message: String(msg) });
    return false;
  };

  // Esperar a que el DOM y Leaflet estén listos antes de inicializar.
  if (document.readyState === 'complete' || document.readyState === 'interactive') {
    setTimeout(initMap, 0);
  } else {
    document.addEventListener('DOMContentLoaded', initMap);
  }

  // Watchdog: si Leaflet no cargó en 8s, avisar.
  setTimeout(function() {
    if (!map) send({ type: 'loadError', message: 'El mapa tardó demasiado en cargar' });
  }, 8000);
</script>
</body>
</html>`;
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  web: { flex: 1, backgroundColor: 'transparent' },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.bg,
    gap: 10,
  },
  loadingText: {
    fontFamily: fontFamily.sansMedium,
    fontSize: 13,
    color: colors.textSecondary,
  },
  errorOverlay: {
    position: 'absolute',
    bottom: 12,
    left: 12,
    right: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: colors.dangerSoft,
    borderWidth: 1,
    borderColor: colors.dangerBorder,
  },
  errorText: {
    fontFamily: fontFamily.sansSemibold,
    fontSize: 12,
    color: colors.danger,
    textAlign: 'center',
  },
});
