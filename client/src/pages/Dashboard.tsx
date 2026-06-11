import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import {
  Beef, Milk, Baby, Wallet, TrendingUp, TrendingDown,
  CalendarClock, Heart, Cloud, Sun, CloudRain, CloudSnow,
  Wind, Droplets, Eye, Thermometer, CloudLightning, CloudDrizzle,
  AlertTriangle,
} from 'lucide-react';
import api from '../lib/api';
import { PageLoader } from '../components/ui';
import { useTheme } from '../context/ThemeContext';
import { DashboardStats } from '../types';
import { format, differenceInDays } from 'date-fns';
import { getAnimalCategory } from '../lib/animalUtils';

// Exact colors from PHP version CSS
const D = {
  pageBg:  '#0d1117',
  cardBg:  'linear-gradient(135deg,rgba(255,255,255,.04) 0%,rgba(255,255,255,.01) 100%)',
  cardBorder: 'rgba(255,255,255,.07)',
  cardShadow: '0 4px 32px rgba(0,0,0,.4), 0 0 0 1px rgba(255,255,255,.04) inset',
  glowIndigo: '0 0 24px rgba(99,102,241,.15), 0 4px 32px rgba(0,0,0,.4)',
  glowGreen:  '0 0 24px rgba(16,185,129,.12), 0 4px 32px rgba(0,0,0,.4)',
  hoverBg: 'rgba(255,255,255,.03)',
  border:  'rgba(255,255,255,.07)',
  text:    '#e2ede6',
  text2:   '#8aab94',
  text3:   '#4d6b57',
  green:   '#10b981',
  greenLt: 'rgba(16,185,129,.12)',
};

interface DashData {
  stats: DashboardStats;
  upcomingBirths: Array<{ id: number; expectedBirthDate: string; animal: { name: string; tagNumber: string } }>;
  recentHealth:   Array<{ id: number; recordDate: string; condition: string; animal: { name: string } }>;
  topProducers:   Array<{ animalId: number; _sum: { quantityLiters: number }; animal?: { name: string; tagNumber: string } }>;
  weeklyTrend:    Array<{ productionDate: string; _sum: { quantityLiters: number } }>;
  recentTransactions: Array<{ id: number; type: string; category: string; amount: number; transactionDate: string }>;
  // Optionally returned by API; computed client-side as fallback
  allAnimals?: Array<{ id: number; gender: 'male' | 'female'; dateOfBirth: string; latestBreeding?: { pregnancyStatus: string; expectedBirthDate?: string | null } | null }>;
}

interface WeatherData {
  temp: number; feelsLike: number; condition: string; description: string;
  humidity: number; windSpeed: number; visibility: number; city: string; country: string;
}

function wmoToCondition(code: number): { condition: string; description: string } {
  if (code === 0)  return { condition: 'Clear',         description: 'Clear sky' };
  if (code <= 2)   return { condition: 'Partly Cloudy', description: 'Partly cloudy' };
  if (code === 3)  return { condition: 'Cloudy',        description: 'Overcast' };
  if (code <= 9)   return { condition: 'Cloudy',        description: 'Foggy' };
  if (code <= 19)  return { condition: 'Drizzle',       description: 'Light drizzle' };
  if (code <= 29)  return { condition: 'Rain',          description: 'Moderate rain' };
  if (code <= 39)  return { condition: 'Snow',          description: 'Snow' };
  if (code <= 49)  return { condition: 'Cloudy',        description: 'Fog' };
  if (code <= 59)  return { condition: 'Drizzle',       description: 'Drizzle' };
  if (code <= 69)  return { condition: 'Rain',          description: 'Rain' };
  if (code <= 79)  return { condition: 'Snow',          description: 'Snow showers' };
  if (code <= 84)  return { condition: 'Rain',          description: 'Rain showers' };
  if (code <= 94)  return { condition: 'Thunder',       description: 'Thunderstorm' };
  return           { condition: 'Thunder',              description: 'Heavy thunderstorm' };
}

function WeatherIcon({ condition, size = 'w-5 h-5' }: { condition: string; size?: string }) {
  const c = condition.toLowerCase();
  if (c.includes('thunder')) return <CloudLightning className={size} />;
  if (c.includes('drizzle')) return <CloudDrizzle   className={size} />;
  if (c.includes('rain'))    return <CloudRain       className={size} />;
  if (c.includes('snow'))    return <CloudSnow       className={size} />;
  if (c.includes('clear'))   return <Sun             className={size} />;
  if (c.includes('cloud'))   return <Cloud           className={size} />;
  return <Sun className={size} />;
}

// ── Weather widget ──────────────────────────────────────────────────────────
function WeatherWidget({ isDark }: { isDark: boolean }) {
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState<string | null>(null);

  const fetchWeatherByCoords = async (lat: number, lon: number) => {
    try {
      const [wRes, gRes] = await Promise.all([
        fetch(
          `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}` +
          `&current=temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,wind_speed_10m,visibility` +
          `&temperature_unit=celsius&wind_speed_unit=kmh&timezone=auto`
        ),
        fetch(`https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json`),
      ]);
      const wJson = await wRes.json();
      const gJson = await gRes.json();
      const { condition, description } = wmoToCondition(wJson.current.weather_code);
      setWeather({
        temp:       Math.round(wJson.current.temperature_2m),
        feelsLike:  Math.round(wJson.current.apparent_temperature),
        condition, description,
        humidity:   wJson.current.relative_humidity_2m,
        windSpeed:  Math.round(wJson.current.wind_speed_10m),
        visibility: Math.round((wJson.current.visibility || 10000) / 1000),
        city:    gJson.address?.city || gJson.address?.town || gJson.address?.village || 'Nairobi',
        country: gJson.address?.country_code?.toUpperCase() || 'KE',
      });
    } catch { setError('Weather unavailable'); }
    finally  { setLoading(false); }
  };

  useEffect(() => {
    if (!navigator.geolocation) { fetchWeatherByCoords(-1.2921, 36.8219); return; }
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => { fetchWeatherByCoords(coords.latitude, coords.longitude); },
      () => { fetchWeatherByCoords(-1.2921, 36.8219); },
      { timeout: 5000 }
    );
  }, []);

  const cond    = weather?.condition || '';
  const isClear = cond === 'Clear';
  const isRain  = cond === 'Rain' || cond === 'Drizzle';

  const bg = isDark
    ? isClear ? 'linear-gradient(135deg,#0d2117 0%,#0a1a10 100%)'
    : isRain  ? 'linear-gradient(135deg,#0d1526 0%,#0a1020 100%)'
    : `${D.cardBg}`
    : isClear ? 'linear-gradient(135deg,#fffbeb,#fef3c7)'
    : isRain  ? 'linear-gradient(135deg,#eff6ff,#dbeafe)'
    : '#f9fafb';

  const accent = isDark
    ? isClear ? '#fbbf24' : isRain ? '#60a5fa' : D.green
    : isClear ? '#d97706' : isRain ? '#2563eb' : '#059669';

  if (loading) {
    return (
      <div className="rounded-xl p-5 border animate-pulse"
        style={isDark ? { background: D.cardBg, borderColor: D.cardBorder, boxShadow: D.cardShadow, backdropFilter: 'blur(12px)' } : { background: '#f9fafb', borderColor: '#e5e7eb' }}
      >
        <div className="h-4 w-28 rounded mb-4" style={{ background: isDark ? D.hoverBg : '#e5e7eb' }} />
        <div className="h-10 w-20 rounded mb-3" style={{ background: isDark ? D.hoverBg : '#e5e7eb' }} />
        <div className="grid grid-cols-2 gap-2">
          {[1,2,3,4].map(i => <div key={i} className="h-10 rounded" style={{ background: isDark ? D.hoverBg : '#e5e7eb' }} />)}
        </div>
      </div>
    );
  }

  if (error || !weather) {
    return (
      <div className="rounded-xl p-5 border"
        style={isDark ? { background: D.cardBg, borderColor: D.cardBorder, boxShadow: D.cardShadow, backdropFilter: 'blur(12px)' } : { background: '#fff', borderColor: '#e5e7eb' }}
      >
        <div className="flex items-center gap-2 mb-2">
          <Cloud className="w-4 h-4" style={{ color: isDark ? D.text3 : '#9ca3af' }} />
          <span className="text-sm font-semibold" style={{ color: isDark ? D.text2 : '#374151' }}>Weather</span>
        </div>
        <p className="text-xs" style={{ color: isDark ? D.text3 : '#9ca3af' }}>{error || 'Unable to load weather'}</p>
        <p className="text-xs mt-1" style={{ color: isDark ? D.text3 : '#9ca3af' }}>Allow location access to see weather</p>
      </div>
    );
  }

  return (
    <div className="rounded-xl p-5 border relative overflow-hidden"
      style={{ background: bg, borderColor: isDark ? D.cardBorder : (isClear ? '#fde68a' : isRain ? '#bfdbfe' : '#e5e7eb') }}
    >
      <div className="absolute -right-8 -top-8 w-28 h-28 rounded-full opacity-10" style={{ background: accent }} />
      <div className="flex items-center justify-between mb-3 relative">
        <div className="flex items-center gap-2">
          <WeatherIcon condition={weather.condition} size="w-4 h-4" />
          <span className="text-sm font-semibold" style={{ color: isDark ? D.text : '#111827' }}>
            {weather.city}{weather.country ? `, ${weather.country}` : ''}
          </span>
        </div>
        <span className="text-xs px-2 py-0.5 rounded-full font-medium"
          style={{ background: isDark ? 'rgba(16,185,129,.12)' : 'rgba(255,255,255,.7)', color: isDark ? D.green : '#059669' }}>
          Live
        </span>
      </div>
      <div className="flex items-end gap-3 mb-4 relative">
        <span className="text-4xl font-bold" style={{ color: isDark ? D.text : '#111827' }}>{weather.temp}°C</span>
        <div className="mb-1">
          <div className="text-sm font-semibold" style={{ color: accent }}>{weather.condition}</div>
          <div className="text-xs" style={{ color: isDark ? D.text3 : '#9ca3af' }}>{weather.description}</div>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2 relative">
        {[
          { icon: Thermometer, label: 'Feels like', value: `${weather.feelsLike}°C` },
          { icon: Droplets,    label: 'Humidity',   value: `${weather.humidity}%`   },
          { icon: Wind,        label: 'Wind',        value: `${weather.windSpeed} km/h` },
          { icon: Eye,         label: 'Visibility',  value: `${weather.visibility} km`  },
        ].map(({ icon: Icon, label, value }) => (
          <div key={label} className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg"
            style={{ background: isDark ? 'rgba(0,0,0,.3)' : 'rgba(255,255,255,.6)' }}>
            <Icon className="w-3 h-3 flex-shrink-0" style={{ color: accent }} />
            <div>
              <div className="text-[10px]" style={{ color: isDark ? D.text3 : '#9ca3af' }}>{label}</div>
              <div className="text-xs font-semibold" style={{ color: isDark ? D.text2 : '#374151' }}>{value}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Stat card ───────────────────────────────────────────────────────────────
function StatCard({
  icon, label, value, sub, iconBgDark, iconBgLight, isDark, glowColor,
}: {
  icon: React.ReactNode; label: string; value: string | number; sub?: string;
  iconBgDark: string; iconBgLight: string; isDark: boolean; glowColor?: string;
}) {
  return (
    <div className="stat-card" style={{
      position: 'relative', overflow: 'hidden',
      ...(isDark ? {
        background: 'linear-gradient(135deg,rgba(255,255,255,.06) 0%,rgba(255,255,255,.01) 100%)',
        borderColor: 'rgba(255,255,255,.08)',
        boxShadow: glowColor
          ? `0 0 24px ${glowColor}22, 0 4px 32px rgba(0,0,0,.4), 0 0 0 1px rgba(255,255,255,.04) inset`
          : D.glowIndigo,
        backdropFilter: 'blur(20px)',
      } : {
        boxShadow: glowColor ? `0 4px 16px ${glowColor}20, 0 1px 4px rgba(0,0,0,.06)` : undefined,
        borderColor: glowColor ? `${glowColor}30` : undefined,
      }),
    }}>
      {glowColor && (
        <div style={{
          position: 'absolute', bottom: 0, left: 0, right: 0, height: 3,
          background: `linear-gradient(90deg, ${glowColor}00, ${glowColor}, ${glowColor}00)`,
          boxShadow: isDark ? `0 0 12px ${glowColor}, 0 0 24px ${glowColor}80` : `0 0 8px ${glowColor}60`,
        }} />
      )}
      <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
        style={{ background: isDark ? iconBgDark : iconBgLight }}>
        {icon}
      </div>
      <div>
        <p className="text-sm" style={isDark ? { color: D.text2 } : { color: '#6b7280' }}>{label}</p>
        <p className="text-2xl font-bold" style={isDark ? { color: D.text } : { color: '#111827' }}>{value}</p>
        {sub && <p className="text-xs mt-0.5" style={isDark ? { color: D.text3 } : { color: '#9ca3af' }}>{sub}</p>}
      </div>
    </div>
  );
}

// ── Dashboard ───────────────────────────────────────────────────────────────
export function DashboardPage() {
  useEffect(() => { document.title = 'Dashboard — AgriPulse'; }, []);

  const [data,    setData]    = useState<DashData | null>(null);
  const [loading, setLoading] = useState(true);
  const { isDark } = useTheme();

  useEffect(() => {
    Promise.all([
      api.get('/dashboard'),
      // Fetch all active animals for client-side calf/due-soon counts
      api.get('/animals?status=active&limit=200'),
    ]).then(([dashRes, animalsRes]) => {
      setData({ ...dashRes.data, allAnimals: animalsRes.data.animals });
    }).finally(() => setLoading(false));
  }, []);

  if (loading) return <PageLoader />;
  if (!data)   return <p className="text-center" style={{ color: D.text2 }}>Failed to load dashboard.</p>;

  const { stats, upcomingBirths, recentHealth, topProducers, weeklyTrend, recentTransactions, allAnimals = [] } = data;

  // Derive calf count and due-soon count client-side
  const calfCount = allAnimals.filter(a =>
    getAnimalCategory(a.dateOfBirth, a.gender, a.latestBreeding?.pregnancyStatus === 'gave_birth') === 'Calf'
  ).length;

  const dueSoonCount = allAnimals.filter(a => {
    const lb = a.latestBreeding;
    if (!lb || (lb.pregnancyStatus !== 'pregnant' && lb.pregnancyStatus !== 'pending')) return false;
    if (!lb.expectedBirthDate) return false;
    const days = differenceInDays(new Date(lb.expectedBirthDate), new Date());
    return days >= 0 && days <= 14;
  }).length;

  const trendData = weeklyTrend.map(d => ({
    day:    format(new Date(d.productionDate), 'EEE'),
    liters: Number(d._sum.quantityLiters || 0),
  }));

  const card = {
    background:   isDark ? D.cardBg : '#fff',
    borderColor:  isDark ? D.cardBorder : '#e5e7eb',
    borderWidth:  1, borderStyle: 'solid', borderRadius: 16,
    boxShadow:    isDark ? D.cardShadow : '0 1px 4px rgba(0,0,0,.06)',
    backdropFilter: isDark ? 'blur(12px)' : undefined,
  } as React.CSSProperties;

  return (
    <div className="space-y-6 animate-in">
      <div>
        <h1 className="page-title" style={isDark ? { color: D.text } : {}}>Dashboard</h1>
        <p className="text-sm" style={isDark ? { color: D.text3 } : { color: '#6b7280' }}>
          Farm overview for {format(new Date(), 'MMMM yyyy')}
        </p>
      </div>

      {/* Stats grid — 6 cards: 3 cols on md, 6 on xl */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
        <StatCard isDark={isDark}
          icon={<Beef className="w-6 h-6 text-emerald-500" />}
          label="Active Animals" value={stats.totalAnimals}
          sub={`${stats.femaleAnimals}F · ${stats.maleAnimals}M`}
          iconBgDark="rgba(16,185,129,.15)" iconBgLight="#ecfdf5" glowColor="#10b981" />

        <StatCard isDark={isDark}
          icon={<Milk className="w-6 h-6 text-blue-500" />}
          label="Today's Milk" value={`${stats.todayMilk.toFixed(1)} L`}
          sub={`${stats.monthMilk.toFixed(0)} L this month`}
          iconBgDark="rgba(59,130,246,.15)" iconBgLight="#eff6ff" glowColor="#3b82f6" />

        <StatCard isDark={isDark}
          icon={<Baby className="w-6 h-6 text-pink-500" />}
          label="Pregnant" value={stats.activePregnant}
          sub="Active pregnancies"
          iconBgDark="rgba(236,72,153,.15)" iconBgLight="#fdf2f8" glowColor="#ec4899" />

        {/* NEW — Calves */}
        <StatCard isDark={isDark}
          icon={<Beef className="w-6 h-6 text-sky-400" />}
          label="Calves" value={calfCount}
          sub="Under 12 months"
          iconBgDark="rgba(56,189,248,.15)" iconBgLight="#f0f9ff" glowColor="#38bdf8" />

        {/* NEW — Due Soon */}
        <StatCard isDark={isDark}
          icon={<AlertTriangle className={`w-6 h-6 ${dueSoonCount > 0 ? 'text-amber-400' : 'text-gray-400'}`} />}
          label="Due Soon" value={dueSoonCount}
          sub="Calving within 14 days"
          iconBgDark={dueSoonCount > 0 ? 'rgba(245,158,11,.15)' : 'rgba(107,114,128,.1)'}
          iconBgLight={dueSoonCount > 0 ? '#fffbeb' : '#f9fafb'}
          glowColor={dueSoonCount > 0 ? '#f59e0b' : undefined} />

        <StatCard isDark={isDark}
          icon={<Wallet className={`w-6 h-6 ${stats.monthProfit >= 0 ? 'text-emerald-500' : 'text-red-500'}`} />}
          label="Month Profit" value={`KSh ${stats.monthProfit.toLocaleString()}`}
          sub={`${stats.monthProfit >= 0 ? '▲' : '▼'} Income vs Expense`}
          iconBgDark={stats.monthProfit >= 0 ? 'rgba(16,185,129,.15)' : 'rgba(239,68,68,.15)'}
          iconBgLight={stats.monthProfit >= 0 ? '#ecfdf5' : '#fef2f2'}
          glowColor={stats.monthProfit >= 0 ? '#10b981' : '#ef4444'} />
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="p-5 lg:col-span-2" style={card}>
          <h2 className="font-semibold mb-4" style={isDark ? { color: D.text } : { color: '#111827' }}>
            7-Day Milk Trend
          </h2>
          {trendData.length > 0 ? (
            <ResponsiveContainer width="100%" height={180}>
              <AreaChart data={trendData}>
                <defs>
                  <linearGradient id="milkGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor={D.green} stopOpacity={isDark ? 0.35 : 0.2} />
                    <stop offset="95%" stopColor={D.green} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke={isDark ? D.border : '#f0f0f0'} />
                <XAxis dataKey="day" tick={{ fontSize: 12, fill: isDark ? D.text3 : '#6b7280' }} />
                <YAxis tick={{ fontSize: 12, fill: isDark ? D.text3 : '#6b7280' }} />
                <Tooltip
                  formatter={(v: number) => [`${v} L`, 'Milk']}
                  contentStyle={{
                    background: isDark ? D.cardBg : '#fff',
                    border: `1px solid ${isDark ? D.border : '#e5e7eb'}`,
                    borderRadius: 8, color: isDark ? D.text : '#111',
                  }}
                />
                <Area type="monotone" dataKey="liters" stroke={D.green} strokeWidth={2} fill="url(#milkGrad)" />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[180px] flex items-center justify-center text-sm" style={{ color: isDark ? D.text3 : '#9ca3af' }}>
              No milk records this week
            </div>
          )}
        </div>

        <div className="p-5" style={card}>
          <h2 className="font-semibold mb-4" style={isDark ? { color: D.text } : { color: '#111827' }}>
            Top Producers
          </h2>
          {topProducers.length > 0 ? (
            <div className="space-y-3">
              {topProducers.map((p, i) => (
                <div key={p.animalId} className="flex items-center gap-3">
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white ${i === 0 ? 'bg-amber-500' : i === 1 ? 'bg-gray-400' : 'bg-amber-700'}`}>
                    {i + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate" style={isDark ? { color: D.text } : { color: '#111827' }}>
                      {p.animal?.name || 'Unknown'}
                    </p>
                    <p className="text-xs" style={isDark ? { color: D.text3 } : { color: '#9ca3af' }}>{p.animal?.tagNumber}</p>
                  </div>
                  <span className="text-sm font-bold" style={{ color: D.green }}>
                    {Number(p._sum.quantityLiters).toFixed(0)}L
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-center py-8" style={isDark ? { color: D.text3 } : { color: '#9ca3af' }}>No data this month</p>
          )}
        </div>
      </div>

      {/* Bottom row */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">

        <WeatherWidget isDark={isDark} />

        <div className="p-5" style={card}>
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold" style={isDark ? { color: D.text } : { color: '#111827' }}>Upcoming Births</h2>
            <Link to="/breeding" className="text-xs font-medium hover:underline" style={{ color: D.green }}>View all</Link>
          </div>
          {upcomingBirths.length > 0 ? (
            <div className="space-y-3">
              {upcomingBirths.map(b => {
                const days = differenceInDays(new Date(b.expectedBirthDate), new Date());
                const urgent = days <= 14;
                return (
                  <div key={b.id} className="flex items-center gap-3">
                    <CalendarClock className="w-4 h-4 flex-shrink-0" style={{ color: urgent ? '#f59e0b' : '#a78bfa' }} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate" style={isDark ? { color: D.text } : { color: '#111827' }}>
                        {b.animal.name}
                      </p>
                      <p className="text-xs" style={isDark ? { color: D.text3 } : { color: '#9ca3af' }}>
                        {format(new Date(b.expectedBirthDate), 'dd MMM yyyy')}
                        {urgent && (
                          <span style={{ marginLeft: 4, color: '#f59e0b', fontWeight: 700 }}>
                            · {days === 0 ? 'today' : `${days}d`}
                          </span>
                        )}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-sm text-center py-6" style={isDark ? { color: D.text3 } : { color: '#9ca3af' }}>No births in next 30 days</p>
          )}
        </div>

        <div className="p-5" style={card}>
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold" style={isDark ? { color: D.text } : { color: '#111827' }}>Recent Health</h2>
            <Link to="/health" className="text-xs font-medium hover:underline" style={{ color: D.green }}>View all</Link>
          </div>
          {recentHealth.length > 0 ? (
            <div className="space-y-3">
              {recentHealth.map(h => (
                <div key={h.id} className="flex items-center gap-3">
                  <Heart className="w-4 h-4 flex-shrink-0 text-red-400" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate" style={isDark ? { color: D.text } : { color: '#111827' }}>{h.animal.name}</p>
                    <p className="text-xs truncate" style={isDark ? { color: D.text3 } : { color: '#9ca3af' }}>{h.condition}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-center py-6" style={isDark ? { color: D.text3 } : { color: '#9ca3af' }}>No records this week</p>
          )}
        </div>

        <div className="p-5" style={card}>
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold" style={isDark ? { color: D.text } : { color: '#111827' }}>Recent Transactions</h2>
            <Link to="/financial" className="text-xs font-medium hover:underline" style={{ color: D.green }}>View all</Link>
          </div>
          {recentTransactions.length > 0 ? (
            <div className="space-y-3">
              {recentTransactions.map(t => (
                <div key={t.id} className="flex items-center gap-3">
                  {t.type === 'income'
                    ? <TrendingUp   className="w-4 h-4 flex-shrink-0 text-emerald-500" />
                    : <TrendingDown className="w-4 h-4 flex-shrink-0 text-red-400" />}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate" style={isDark ? { color: D.text } : { color: '#111827' }}>{t.category}</p>
                    <p className="text-xs" style={isDark ? { color: D.text3 } : { color: '#9ca3af' }}>{format(new Date(t.transactionDate), 'dd MMM')}</p>
                  </div>
                  <span className={`text-sm font-bold ${t.type === 'income' ? 'text-emerald-500' : 'text-red-400'}`}>
                    {t.type === 'income' ? '+' : '-'}KSh {Number(t.amount).toLocaleString()}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-center py-6" style={isDark ? { color: D.text3 } : { color: '#9ca3af' }}>No transactions yet</p>
          )}
        </div>
      </div>
    </div>
  );
}
