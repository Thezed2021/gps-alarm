import { useState, useEffect, useRef, useCallback, FormEvent, MouseEvent, KeyboardEvent } from 'react';
import { MapPin, Search, Navigation, BellRing, X, AlertTriangle, Loader2, Volume2, Map as MapIcon, Crosshair } from 'lucide-react';

// Interfaces TypeScript para definir os tipos de dados
interface Coordinates {
  lat: number;
  lon: number;
}

interface Destination extends Coordinates {
  name: string;
}

interface Place {
  display_name: string;
  lat: string;
  lon: string;
}

interface MapProps {
  mapCenter: [number, number];
  isTracking: boolean;
  destination: Destination | null;
  currentLocation: Coordinates | null;
  radius: number;
}

// Fórmula de Haversine com os tipos declarados explicitamente
const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
  const R = 6371e3;
  const rad = (deg: number): number => (deg * Math.PI) / 180;
  const dLat = rad(lat2 - lat1);
  const dLon = rad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(rad(lat1)) * Math.cos(rad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

// Componente de Mapa Nativo
const NativeLeafletMap = ({ mapCenter, isTracking, destination, currentLocation, radius }: MapProps) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const elementsRef = useRef<any>({ destMarker: null, destCircle: null, userMarker: null, line: null });
  const [isLeafletLoaded, setIsLeafletLoaded] = useState<boolean>(false);

  const centerLat = mapCenter[0];
  const centerLon = mapCenter[1];
  const destLat = destination?.lat;
  const destLon = destination?.lon;
  const currLat = currentLocation?.lat;
  const currLon = currentLocation?.lon;

  useEffect(() => {
    if ((window as any).L) {
      setIsLeafletLoaded(true);
      return;
    }

    const loadLeaflet = () => {
      if (!document.getElementById('leaflet-css')) {
        const link = document.createElement('link');
        link.id = 'leaflet-css';
        link.rel = 'stylesheet';
        link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
        document.head.appendChild(link);
      }

      if (!document.getElementById('leaflet-js')) {
        const script = document.createElement('script');
        script.id = 'leaflet-js';
        script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
        script.onload = () => setIsLeafletLoaded(true);
        document.head.appendChild(script);
      }
    };
    loadLeaflet();
  }, []);

  useEffect(() => {
    if (!isLeafletLoaded || !mapContainerRef.current) return;

    const L = (window as any).L;

    if (!mapInstanceRef.current) {
      mapInstanceRef.current = L.map(mapContainerRef.current, {
        zoomControl: false,
        attributionControl: false
      }).setView([centerLat, centerLon], 13);

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(mapInstanceRef.current);
    }

    const map = mapInstanceRef.current;
    map.flyTo([centerLat, centerLon], isTracking ? 16 : 13, { animate: true, duration: 1.5 });

    const destIcon = L.icon({
      iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
      iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
      shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
      iconSize: [25, 41], iconAnchor: [12, 41], popupAnchor: [1, -34],
    });

    const userIcon = L.icon({
      iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
      shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
      iconSize: [25, 41], iconAnchor: [12, 41], popupAnchor: [1, -34],
    });

    const els = elementsRef.current;

    if (destLat !== undefined && destLon !== undefined) {
      if (!els.destMarker) {
        els.destMarker = L.marker([destLat, destLon], { icon: destIcon }).addTo(map);
        els.destCircle = L.circle([destLat, destLon], {
          radius: radius, color: '#ef4444', fillColor: '#ef4444', fillOpacity: 0.2
        }).addTo(map);
      } else {
        els.destMarker.setLatLng([destLat, destLon]);
        els.destCircle.setLatLng([destLat, destLon]);
        els.destCircle.setRadius(radius);
      }
    } else {
      if (els.destMarker) { map.removeLayer(els.destMarker); els.destMarker = null; }
      if (els.destCircle) { map.removeLayer(els.destCircle); els.destCircle = null; }
    }

    if (currLat !== undefined && currLon !== undefined) {
      if (!els.userMarker) {
        els.userMarker = L.marker([currLat, currLon], { icon: userIcon }).addTo(map);
      } else {
        els.userMarker.setLatLng([currLat, currLon]);
      }
    } else {
      if (els.userMarker) { map.removeLayer(els.userMarker); els.userMarker = null; }
    }

    if (isTracking && currLat !== undefined && currLon !== undefined && destLat !== undefined && destLon !== undefined) {
      if (!els.line) {
        els.line = L.polyline([
          [currLat, currLon],
          [destLat, destLon]
        ], { color: '#3b82f6', dashArray: '5, 10', weight: 3 }).addTo(map);
      } else {
        els.line.setLatLngs([
          [currLat, currLon],
          [destLat, destLon]
        ]);
      }
    } else {
      if (els.line) { map.removeLayer(els.line); els.line = null; }
    }

  }, [isLeafletLoaded, centerLat, centerLon, isTracking, destLat, destLon, currLat, currLon, radius]);

  return <div ref={mapContainerRef} className="w-full h-full" />;
};

export default function App() {
  // AQUI ESTÁ O SEGREDO: Usar Generics <Tipo> garante que o TypeScript não falha
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [searchResults, setSearchResults] = useState<Place[]>([]);
  const [isSearching, setIsSearching] = useState<boolean>(false);
  const [destination, setDestination] = useState<Destination | null>(null);
  const [radius, setRadius] = useState<number>(500);

  const [isTracking, setIsTracking] = useState<boolean>(false);
  const [currentLocation, setCurrentLocation] = useState<Coordinates | null>(null);
  const [distance, setDistance] = useState<number | null>(null);
  const [isRinging, setIsRinging] = useState<boolean>(false);
  const [permissionStatus, setPermissionStatus] = useState<string>('prompt');
  const [error, setError] = useState<string>('');

  const watchIdRef = useRef<number | null>(null);
  const audioCtxRef = useRef<any>(null);
  const alarmIntervalRef = useRef<any>(null);
  const wakeLockRef = useRef<any>(null);

  useEffect(() => {
    if ('permissions' in navigator) {
      navigator.permissions.query({ name: 'geolocation' as PermissionName }).then((result) => {
        setPermissionStatus(result.state);
        result.onchange = () => setPermissionStatus(result.state);
      }).catch(() => {});
    }
  }, []);

  useEffect(() => {
    if (permissionStatus === 'granted' && !currentLocation && !isTracking) {
      navigator.geolocation.getCurrentPosition(
        (pos: GeolocationPosition) => setCurrentLocation({ lat: pos.coords.latitude, lon: pos.coords.longitude }),
        (err: GeolocationPositionError) => console.warn('Aviso de localização prévia:', err)
      );
    }
  }, [permissionStatus, isTracking, currentLocation]);

  const requestWakeLock = async () => {
    try {
      if ('wakeLock' in navigator) {
        wakeLockRef.current = await (navigator as any).wakeLock.request('screen');
      }
    } catch (err) {
      console.warn('Wake Lock não suportado ou bloqueado:', err);
    }
  };

  const releaseWakeLock = () => {
    if (wakeLockRef.current !== null) {
      wakeLockRef.current.release();
      wakeLockRef.current = null;
    }
  };

  const handleSearch = async (e?: any) => {
    if (e && typeof e.preventDefault === 'function') {
      e.preventDefault();
    }
    
    if (!searchQuery.trim()) return;

    setIsSearching(true);
    setError('');
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery)}&limit=5&addressdetails=1`
      );
      const data = await response.json();
      setSearchResults(data);
      if (data.length === 0) setError('Nenhum local encontrado. Tente ser mais específico.');
    } catch (err) {
      setError('Erro ao pesquisar o endereço. Verifique a sua ligação.');
    } finally {
      setIsSearching(false);
    }
  };

  const selectDestination = (place: Place) => {
    setDestination({
      name: place.display_name,
      lat: parseFloat(place.lat),
      lon: parseFloat(place.lon),
    });
    setSearchResults([]);
    setSearchQuery('');
    setError('');
  };

  const startAlarm = useCallback(() => {
    if (isRinging) return;
    setIsRinging(true);

    if (!audioCtxRef.current) {
      audioCtxRef.current = new ((window as any).AudioContext || (window as any).webkitAudioContext)();
    }
    const ctx = audioCtxRef.current;
    if (ctx.state === 'suspended') ctx.resume();

    const playBeep = () => {
      const osc = ctx.createOscillator();
      const gainNode = ctx.createGain();
      
      osc.type = 'square';
      osc.frequency.setValueAtTime(880, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(440, ctx.currentTime + 0.3);
      
      gainNode.gain.setValueAtTime(1, ctx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
      
      osc.connect(gainNode);
      gainNode.connect(ctx.destination);
      
      osc.start();
      osc.stop(ctx.currentTime + 0.3);
    };

    playBeep();
    alarmIntervalRef.current = setInterval(() => {
      playBeep();
      if ('vibrate' in navigator) navigator.vibrate([500, 200, 500]);
    }, 1000);
  }, [isRinging]);

  const stopAlarm = () => {
    setIsRinging(false);
    setIsTracking(false);
    
    if (alarmIntervalRef.current) clearInterval(alarmIntervalRef.current);
    if ('vibrate' in navigator) navigator.vibrate(0);
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    releaseWakeLock();
  };

  const startTracking = () => {
    const activeDestination = destination;
    
    if (!activeDestination) {
      setError('Por favor, selecione um destino primeiro.');
      return;
    }
    if (!('geolocation' in navigator)) {
      setError('O seu navegador não suporta geolocalização.');
      return;
    }

    if (!audioCtxRef.current) {
      audioCtxRef.current = new ((window as any).AudioContext || (window as any).webkitAudioContext)();
    }
    audioCtxRef.current.resume();

    setError('');
    setIsTracking(true);
    requestWakeLock();

    watchIdRef.current = navigator.geolocation.watchPosition(
      (position: GeolocationPosition) => {
        const { latitude, longitude } = position.coords;
        setCurrentLocation({ lat: latitude, lon: longitude });
        setPermissionStatus('granted');

        const currentDist = calculateDistance(latitude, longitude, activeDestination.lat, activeDestination.lon);
        setDistance(currentDist);

        if (currentDist <= radius) {
          startAlarm();
        }
      },
      (err: GeolocationPositionError) => {
        let errorMsg = 'Erro de GPS.';
        if (err.code === 1) errorMsg = 'Permissão de localização negada pelo utilizador ou navegador.';
        if (err.code === 2) errorMsg = 'Posição GPS indisponível no momento.';
        if (err.code === 3) errorMsg = 'Tempo limite de pedido de localização esgotado.';
        
        setError(`${errorMsg} Por favor, verifique as permissões no ícone de cadeado na barra de endereço.`);
        setIsTracking(false);
        setPermissionStatus('denied');
        releaseWakeLock();
      },
      { enableHighAccuracy: true, maximumAge: 0, timeout: 10000 }
    );
  };

  useEffect(() => {
    return () => stopAlarm();
  }, []);

  const formatDistance = (meters: number | null): string => {
    if (meters === null) return '--';
    if (meters < 1000) return `${Math.round(meters)} m`;
    return `${(meters / 1000).toFixed(2)} km`;
  };

  const defaultCenter: [number, number] = [38.7223, -9.1393];
  const mapCenter: [number, number] = isTracking && currentLocation 
    ? [currentLocation.lat, currentLocation.lon] 
    : destination 
      ? [destination.lat, destination.lon] 
      : currentLocation 
        ? [currentLocation.lat, currentLocation.lon]
        : defaultCenter;

  return (
    <div className="relative h-screen w-full bg-slate-100 overflow-hidden flex flex-col">
      <div className="absolute inset-0 z-0">
        <NativeLeafletMap 
          mapCenter={mapCenter}
          isTracking={isTracking}
          destination={destination}
          currentLocation={currentLocation}
          radius={radius}
        />
      </div>

      {isRinging && (
        <div className="absolute inset-0 z-50 bg-red-600/90 backdrop-blur-sm flex flex-col items-center justify-center p-6 animate-pulse">
          <BellRing size={100} className="text-white animate-bounce mb-6" />
          <h2 className="text-5xl font-extrabold text-white text-center mb-2 shadow-sm">CHEGOU!</h2>
          <p className="text-red-100 text-xl text-center mb-10">
            Encontra-se a {formatDistance(distance)} do seu destino.
          </p>
          <button
            onClick={stopAlarm}
            className="w-full max-w-sm py-5 bg-white text-red-600 rounded-full font-bold text-2xl shadow-2xl active:scale-95 flex justify-center items-center gap-3 transition-transform"
          >
            <Volume2 size={28} /> DESLIGAR ALARME
          </button>
        </div>
      )}

      {!isRinging && (
        <div className="relative z-10 flex flex-col h-full pointer-events-none">
          <div className="pt-6 pb-2 px-4 flex justify-center pointer-events-auto drop-shadow-md">
            <div className="bg-white/90 backdrop-blur-md px-6 py-3 rounded-full flex items-center gap-2 border border-slate-200">
              <MapIcon className="text-blue-600" size={24} />
              <h1 className="text-xl font-bold text-slate-800 tracking-tight">Alarme GPS</h1>
            </div>
          </div>

          <div className="flex-grow"></div>

          <div className="bg-white rounded-t-3xl shadow-[0_-10px_40px_rgba(0,0,0,0.1)] pointer-events-auto border-t border-slate-200 w-full max-w-xl mx-auto pb-safe">
            <div className="p-6">
              
              {permissionStatus === 'denied' && (
                <div className="bg-red-50 text-red-700 p-3 rounded-xl flex gap-2 items-start mb-4 border border-red-200 text-sm">
                  <AlertTriangle size={18} className="shrink-0 mt-0.5" />
                  <p>O navegador bloqueou a localização. Clique no cadeado (🔒) na barra de endereço, permita a <strong>Localização</strong> e atualize a página.</p>
                </div>
              )}

              {error && permissionStatus !== 'denied' && (
                <div className="bg-amber-50 text-amber-700 p-3 rounded-xl mb-4 border border-amber-200 text-sm">
                  {error}
                </div>
              )}

              {!isTracking ? (
                <div className="space-y-4">
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="Pesquisar destino (ex: Torre de Belém)..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleSearch(e)}
                      className="w-full pl-11 pr-12 py-3.5 bg-slate-100 border border-slate-200 focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-100 rounded-2xl transition-all outline-none text-slate-700 shadow-inner"
                    />
                    <Search className="absolute left-4 top-4 text-slate-400" size={20} />
                    <button 
                      onClick={(e) => handleSearch(e)}
                      disabled={isSearching}
                      className="absolute right-2 top-2 p-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors shadow-sm"
                    >
                      {isSearching ? <Loader2 size={18} className="animate-spin" /> : <Navigation size={18} />}
                    </button>
                  </div>

                  {searchResults.length > 0 && (
                    <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden max-h-48 overflow-y-auto shadow-lg absolute z-20 w-[calc(100%-3rem)] max-w-[calc(36rem-3rem)] bottom-full mb-2">
                      {searchResults.map((place, idx) => (
                        <button
                          key={idx}
                          onClick={() => selectDestination(place)}
                          className="w-full text-left px-4 py-3 text-sm text-slate-700 hover:bg-blue-50 border-b border-slate-100 last:border-0 transition-colors flex items-center gap-3"
                        >
                          <MapPin size={18} className="text-blue-500 shrink-0" />
                          <span className="line-clamp-2">{place.display_name}</span>
                        </button>
                      ))}
                    </div>
                  )}

                  {destination && (
                    <div className="bg-blue-50/50 p-4 rounded-2xl border border-blue-100 relative">
                      <button 
                        onClick={() => setDestination(null)}
                        className="absolute top-3 right-3 text-slate-400 hover:text-red-500 bg-white p-1 rounded-full shadow-sm"
                      >
                        <X size={16} />
                      </button>
                      <p className="text-xs font-bold text-blue-600 uppercase tracking-wider mb-1">Destino</p>
                      <p className="text-sm font-medium text-slate-800 pr-8 truncate">{destination.name}</p>
                    </div>
                  )}

                  {destination && (
                    <div className="space-y-3 pt-2">
                      <div className="flex justify-between items-center">
                        <label className="text-sm font-semibold text-slate-700">
                          Despertar a que distância?
                        </label>
                        <span className="text-blue-700 font-bold bg-blue-100 px-3 py-1 rounded-full text-sm">
                          {radius >= 1000 ? `${radius/1000} km` : `${radius} m`}
                        </span>
                      </div>
                      <input
                        type="range"
                        min="100"
                        max="5000"
                        step="100"
                        value={radius}
                        onChange={(e) => setRadius(Number(e.target.value))}
                        className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                      />
                    </div>
                  )}

                  <button
                    onClick={startTracking}
                    disabled={!destination}
                    className={`w-full py-4 mt-2 rounded-2xl font-bold text-lg transition-all shadow-md flex justify-center items-center gap-2
                      ${destination 
                        ? 'bg-blue-600 hover:bg-blue-700 text-white hover:shadow-lg active:scale-95' 
                        : 'bg-slate-100 text-slate-400 cursor-not-allowed'}`}
                  >
                    <Crosshair size={20} />
                    INICIAR NAVEGAÇÃO
                  </button>
                </div>
              ) : (
                <div className="space-y-6">
                  <div className="flex justify-between items-center bg-slate-50 p-4 rounded-2xl border border-slate-100">
                    <div>
                      <p className="text-xs text-slate-500 font-bold uppercase tracking-wider mb-1">Distância Restante</p>
                      <p className="text-4xl font-extrabold text-blue-600">
                        {distance !== null ? formatDistance(distance) : <Loader2 className="animate-spin" size={32} />}
                      </p>
                    </div>
                    <div className="w-16 h-16 rounded-full bg-blue-100 flex items-center justify-center animate-pulse">
                      <Navigation size={28} className="text-blue-600" />
                    </div>
                  </div>

                  <button
                    onClick={stopAlarm}
                    className="w-full py-4 bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 rounded-2xl font-bold text-lg transition-all active:scale-95 flex justify-center items-center gap-2"
                  >
                    <X size={20} />
                    CANCELAR ALARME
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}