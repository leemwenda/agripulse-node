import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { ArrowLeft, Baby, Heart, Milk, Info } from 'lucide-react';
import api from '../lib/api';
import { PageLoader } from '../components/ui';
import { useTheme } from '../context/ThemeContext';
import { getBreedingStage } from '../lib/breedingStage';

const TABS = [
  { id: 'overview', label: 'Overview', icon: Info },
  { id: 'breeding', label: 'Breeding', icon: Baby },
  { id: 'health',   label: 'Health',   icon: Heart },
  { id: 'milk',     label: 'Milk',     icon: Milk },
];

function InfoCard({ label, value, dark }: { label: string; value: string; dark: boolean }) {
  return (
    <div className={`rounded-xl p-4 border ${dark ? 'border-white/8 bg-white/3' : 'border-gray-200 bg-gray-50'}`}>
      <div className={`text-xs font-bold uppercase tracking-widest mb-1.5 ${dark ? 'text-white/35' : 'text-gray-400'}`}>{label}</div>
      <div className={`text-sm font-semibold capitalize ${dark ? 'text-white/85' : 'text-gray-800'}`}>{value}</div>
    </div>
  );
}

function StatBadge({ value, label, color }: { value: string | number; label: string; color: string }) {
  return (
    <div className="rounded-xl p-4 border border-white/8 bg-white/3">
      <div className="text-xs font-bold uppercase tracking-widest mb-1.5 text-white/35">{label}</div>
      <div className="text-2xl font-black" style={{ color }}>{value}</div>
    </div>
  );
}

export function AnimalDetailPage() {  useEffect(() => { document.title = 'Animal Detail — AgriPulse'; }, []);

  const { id } = useParams();
  const navigate = useNavigate();
  const { isDark } = useTheme();
  const [animal, setAnimal] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('overview');

  useEffect(() => {
    api.get(`/animals/${id}`)
      .then(r => setAnimal(r.data.animal))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <PageLoader />;
  if (!animal) return (
    <div className="flex flex-col items-center justify-center min-h-64 gap-4">
      <p className="text-gray-400">Animal not found.</p>
      <button onClick={() => navigate('/animals')} className="btn-primary">Back to Animals</button>
    </div>
  );

  const stage = getBreedingStage(animal.breeding?.[0] || null, animal.dateOfBirth, animal.gender);
  const statusColors: Record<string, string> = { active: '#10b981', sold: '#f59e0b', deceased: '#ef4444' };
  const breedingColors: Record<string, string> = { pending: '#818cf8', pregnant: '#6366f1', gave_birth: '#10b981', failed: '#ef4444' };
  const ageMonths = Math.floor((Date.now() - new Date(animal.dateOfBirth).getTime()) / (86400000 * 30.44));
  const ageStr = ageMonths >= 12 ? `${Math.floor(ageMonths / 12)}y ${ageMonths % 12}m` : `${ageMonths} months`;

  return (
    <div className={`min-h-screen ${isDark ? 'bg-[#0d1117]' : 'bg-gray-50'}`}>

      {/* Sticky header */}
      <div className={`sticky top-0 z-10 border-b px-4 py-3 flex items-center gap-3 flex-wrap
        ${isDark ? 'bg-[#0d1526]/90 border-white/5 backdrop-blur-xl' : 'bg-white/90 border-gray-200 backdrop-blur-xl'}`}>

        <button onClick={() => navigate('/animals')}
          className={`flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-lg transition-colors flex-shrink-0
            ${isDark ? 'text-white/50 hover:bg-white/6 hover:text-white/80' : 'text-gray-500 hover:bg-gray-100 hover:text-gray-800'}`}>
          <ArrowLeft className="w-4 h-4" /> Back
        </button>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className={`text-lg font-black truncate ${isDark ? 'text-white' : 'text-gray-900'}`}>{animal.name}</h1>
            <span className={`text-xs font-mono px-2 py-0.5 rounded-md flex-shrink-0
              ${isDark ? 'text-white/40 bg-white/5 border border-white/8' : 'text-gray-400 bg-gray-100 border border-gray-200'}`}>
              {animal.tagNumber}
            </span>
            <span className="text-xs font-bold px-2.5 py-0.5 rounded-full flex-shrink-0"
              style={{ background: `${statusColors[animal.status]}20`, color: statusColors[animal.status], border: `1px solid ${statusColors[animal.status]}40` }}>
              {animal.status}
            </span>
          </div>
          <p className={`text-xs mt-0.5 ${isDark ? 'text-white/30' : 'text-gray-400'}`}>{animal.breed} · {animal.gender} · {ageStr}</p>
        </div>

        {stage && (
          <div className="flex-shrink-0 rounded-xl px-3 py-2 text-right"
            style={{ background: stage.glowColor, border: `1px solid ${stage.color}40`, boxShadow: stage.urgent ? `0 0 16px ${stage.glowColor}` : undefined }}>
            <div className="text-xs font-bold" style={{ color: stage.color }}>{stage.stage}</div>
            <div className="text-xs opacity-75" style={{ color: stage.color }}>{stage.detail}</div>
          </div>
        )}
      </div>

      <div className="max-w-3xl mx-auto px-3 sm:px-6 py-4 sm:py-6">

        {/* Tab bar */}
        <div className={`flex gap-1 rounded-xl p-1 mb-5 overflow-x-auto ${isDark ? 'bg-white/4' : 'bg-gray-100'}`}>
          {TABS.map(({ id: tid, label, icon: Icon }) => (
            <button key={tid} onClick={() => setTab(tid)}
              className={`flex-1 min-w-16 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg
                text-xs sm:text-sm font-semibold transition-all whitespace-nowrap
                ${tab === tid
                  ? isDark
                    ? 'bg-indigo-500/20 text-indigo-400 shadow-sm'
                    : 'bg-white text-indigo-600 shadow-sm'
                  : isDark
                    ? 'text-white/40 hover:text-white/60'
                    : 'text-gray-500 hover:text-gray-700'
                }`}>
              <Icon className="w-3.5 h-3.5 flex-shrink-0" />{label}
            </button>
          ))}
        </div>

        {/* OVERVIEW */}
        {tab === 'overview' && (
          <div className="flex flex-col gap-4">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <InfoCard label="Breed"         value={animal.breed}                                              dark={isDark} />
              <InfoCard label="Gender"        value={animal.gender}                                             dark={isDark} />
              <InfoCard label="Date of Birth" value={format(new Date(animal.dateOfBirth), 'dd MMM yyyy')}       dark={isDark} />
              <InfoCard label="Color"         value={animal.color || '—'}                                       dark={isDark} />
              <InfoCard label="Status"        value={animal.status}                                             dark={isDark} />
              <InfoCard label="Age"           value={ageStr}                                                    dark={isDark} />
            </div>

            {animal.notes && (
              <div className={`rounded-xl p-4 border ${isDark ? 'border-white/8 bg-white/3' : 'border-gray-200 bg-white'}`}>
                <div className={`text-xs font-bold uppercase tracking-widest mb-2 ${isDark ? 'text-white/35' : 'text-gray-400'}`}>Notes</div>
                <p className={`text-sm leading-relaxed ${isDark ? 'text-white/60' : 'text-gray-600'}`}>{animal.notes}</p>
              </div>
            )}

            <div className="grid grid-cols-3 gap-3">
              {isDark ? (
                <>
                  <StatBadge value={animal.breeding?.length || 0}      label="Breeding"  color="#6366f1" />
                  <StatBadge value={animal.healthRecords?.length || 0}  label="Health"    color="#ef4444" />
                  <StatBadge value={animal.milkProduction?.length || 0} label="Milk"      color="#3b82f6" />
                </>
              ) : (
                <>
                  <div className="rounded-xl p-4 border border-gray-200 bg-white">
                    <div className="text-xs font-bold uppercase tracking-widest mb-1.5 text-gray-400">Breeding</div>
                    <div className="text-2xl font-black text-indigo-500">{animal.breeding?.length || 0}</div>
                  </div>
                  <div className="rounded-xl p-4 border border-gray-200 bg-white">
                    <div className="text-xs font-bold uppercase tracking-widest mb-1.5 text-gray-400">Health</div>
                    <div className="text-2xl font-black text-red-500">{animal.healthRecords?.length || 0}</div>
                  </div>
                  <div className="rounded-xl p-4 border border-gray-200 bg-white">
                    <div className="text-xs font-bold uppercase tracking-widest mb-1.5 text-gray-400">Milk</div>
                    <div className="text-2xl font-black text-blue-500">{animal.milkProduction?.length || 0}</div>
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        {/* BREEDING */}
        {tab === 'breeding' && (
          <div className="flex flex-col gap-3">
            {!animal.breeding?.length ? (
              <div className={`rounded-xl p-10 border text-center text-sm ${isDark ? 'border-white/5 text-white/25' : 'border-gray-200 text-gray-400'}`}>
                No breeding records
              </div>
            ) : animal.breeding.map((b: any) => {
              const daysSince = Math.floor((Date.now() - new Date(b.serviceDate).getTime()) / 86400000);
              const col = breedingColors[b.pregnancyStatus] || '#818cf8';
              const progress = Math.min(100, Math.round(daysSince / 283 * 100));
              const isActive = b.pregnancyStatus === 'pregnant' || b.pregnancyStatus === 'pending';
              return (
                <div key={b.id} className={`rounded-xl p-4 sm:p-5 border ${isDark ? 'border-white/8 bg-white/3' : 'border-gray-200 bg-white'}`}>
                  <div className="flex items-start justify-between gap-3 mb-4 flex-wrap">
                    <div>
                      <div className={`text-sm font-bold ${isDark ? 'text-white/85' : 'text-gray-800'}`}>
                        Service: {format(new Date(b.serviceDate), 'dd MMM yyyy')}
                      </div>
                      {b.bullName && <div className={`text-xs mt-0.5 ${isDark ? 'text-white/35' : 'text-gray-400'}`}>Bull: {b.bullName}</div>}
                    </div>
                    <span className="text-xs font-bold px-3 py-1 rounded-full flex-shrink-0"
                      style={{ background: `${col}20`, color: col, border: `1px solid ${col}40` }}>
                      {b.pregnancyStatus.replace('_', ' ')}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mb-3">
                    <div className={`rounded-lg p-3 border ${isDark ? 'border-white/6 bg-white/2' : 'border-gray-100 bg-gray-50'}`}>
                      <div className={`text-xs font-semibold uppercase tracking-wide mb-1 ${isDark ? 'text-white/30' : 'text-gray-400'}`}>Day</div>
                      <div className={`text-base font-black ${isDark ? 'text-white/80' : 'text-gray-800'}`}>{daysSince} / 283</div>
                    </div>
                    {b.expectedBirthDate && (
                      <div className={`rounded-lg p-3 border ${isDark ? 'border-white/6 bg-white/2' : 'border-gray-100 bg-gray-50'}`}>
                        <div className={`text-xs font-semibold uppercase tracking-wide mb-1 ${isDark ? 'text-white/30' : 'text-gray-400'}`}>Expected</div>
                        <div className={`text-sm font-bold ${isDark ? 'text-white/80' : 'text-gray-800'}`}>{format(new Date(b.expectedBirthDate), 'dd MMM yyyy')}</div>
                      </div>
                    )}
                    {b.actualBirthDate && (
                      <div className="rounded-lg p-3 border border-emerald-500/20 bg-emerald-500/8">
                        <div className="text-xs font-semibold uppercase tracking-wide mb-1 text-emerald-500">Calved</div>
                        <div className="text-sm font-bold text-emerald-400">{format(new Date(b.actualBirthDate), 'dd MMM yyyy')}</div>
                      </div>
                    )}
                  </div>

                  {isActive && (
                    <div>
                      <div className="flex justify-between text-xs mb-1.5">
                        <span className={isDark ? 'text-white/30' : 'text-gray-400'}>Gestation progress</span>
                        <span className="font-bold" style={{ color: col }}>{progress}%</span>
                      </div>
                      <div className={`h-1.5 rounded-full overflow-hidden ${isDark ? 'bg-white/6' : 'bg-gray-100'}`}>
                        <div className="h-full rounded-full transition-all"
                          style={{ width: `${progress}%`, background: 'linear-gradient(90deg,#6366f1,#8b5cf6)', boxShadow: '0 0 8px rgba(99,102,241,.4)' }} />
                      </div>
                    </div>
                  )}

                  {b.notes && (
                    <p className={`mt-3 pt-3 text-xs leading-relaxed border-t ${isDark ? 'border-white/5 text-white/35' : 'border-gray-100 text-gray-400'}`}>{b.notes}</p>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* HEALTH */}
        {tab === 'health' && (
          <div className="flex flex-col gap-3">
            {!animal.healthRecords?.length ? (
              <div className={`rounded-xl p-10 border text-center text-sm ${isDark ? 'border-white/5 text-white/25' : 'border-gray-200 text-gray-400'}`}>
                No health records
              </div>
            ) : animal.healthRecords.map((h: any) => (
              <div key={h.id} className={`rounded-xl p-4 sm:p-5 border ${isDark ? 'border-white/8 bg-white/3' : 'border-gray-200 bg-white'}`}>
                <div className="flex items-start justify-between gap-3 mb-3 flex-wrap">
                  <div className={`text-sm font-bold ${isDark ? 'text-white/85' : 'text-gray-800'}`}>{h.condition}</div>
                  <div className={`text-xs flex-shrink-0 ${isDark ? 'text-white/30' : 'text-gray-400'}`}>{format(new Date(h.recordDate), 'dd MMM yyyy')}</div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {h.treatment && (
                    <div className={`rounded-lg p-3 border ${isDark ? 'border-white/6 bg-white/2' : 'border-gray-100 bg-gray-50'}`}>
                      <div className={`text-xs font-semibold uppercase tracking-wide mb-1 ${isDark ? 'text-white/30' : 'text-gray-400'}`}>Treatment</div>
                      <div className={`text-sm ${isDark ? 'text-white/75' : 'text-gray-700'}`}>{h.treatment}</div>
                    </div>
                  )}
                  {h.vaccination && (
                    <div className="rounded-lg p-3 border border-emerald-500/20 bg-emerald-500/6">
                      <div className="text-xs font-semibold uppercase tracking-wide mb-1 text-emerald-500">Vaccination</div>
                      <div className="text-sm text-emerald-400">{h.vaccination}</div>
                    </div>
                  )}
                  {h.doctorName && (
                    <div className={`rounded-lg p-3 border ${isDark ? 'border-white/6 bg-white/2' : 'border-gray-100 bg-gray-50'}`}>
                      <div className={`text-xs font-semibold uppercase tracking-wide mb-1 ${isDark ? 'text-white/30' : 'text-gray-400'}`}>Veterinarian</div>
                      <div className={`text-sm ${isDark ? 'text-white/75' : 'text-gray-700'}`}>Dr. {h.doctorName}</div>
                    </div>
                  )}
                </div>
                {h.notes && (
                  <p className={`mt-3 pt-3 text-xs leading-relaxed border-t ${isDark ? 'border-white/5 text-white/35' : 'border-gray-100 text-gray-400'}`}>{h.notes}</p>
                )}
              </div>
            ))}
          </div>
        )}

        {/* MILK */}
        {tab === 'milk' && (
          <div className="flex flex-col gap-3">
            {!animal.milkProduction?.length ? (
              <div className={`rounded-xl p-10 border text-center text-sm ${isDark ? 'border-white/5 text-white/25' : 'border-gray-200 text-gray-400'}`}>
                No milk records
              </div>
            ) : (
              <>
                <div className="grid grid-cols-2 gap-3">
                  <div className={`rounded-xl p-4 border ${isDark ? 'border-white/8 bg-white/3' : 'border-gray-200 bg-white'}`}>
                    <div className={`text-xs font-bold uppercase tracking-widest mb-1.5 ${isDark ? 'text-white/35' : 'text-gray-400'}`}>Total Recorded</div>
                    <div className="text-2xl font-black text-blue-500">
                      {animal.milkProduction.reduce((s: number, m: any) => s + Number(m.quantityLiters), 0).toFixed(1)} L
                    </div>
                  </div>
                  <div className={`rounded-xl p-4 border ${isDark ? 'border-white/8 bg-white/3' : 'border-gray-200 bg-white'}`}>
                    <div className={`text-xs font-bold uppercase tracking-widest mb-1.5 ${isDark ? 'text-white/35' : 'text-gray-400'}`}>Daily Average</div>
                    <div className="text-2xl font-black text-blue-500">
                      {(animal.milkProduction.reduce((s: number, m: any) => s + Number(m.quantityLiters), 0) / animal.milkProduction.length).toFixed(1)} L
                    </div>
                  </div>
                </div>

                <div className={`rounded-xl border overflow-auto ${isDark ? 'border-white/8 bg-white/3' : 'border-gray-200 bg-white'}`}>
                  <table className="w-full text-sm" style={{ minWidth: 340 }}>
                    <thead>
                      <tr className={`border-b ${isDark ? 'border-white/5' : 'border-gray-100'}`}>
                        <th className={`px-4 py-3 text-left text-xs font-bold uppercase tracking-wider ${isDark ? 'text-white/30 bg-white/2' : 'text-gray-400 bg-gray-50'}`}>Date</th>
                        <th className={`px-4 py-3 text-right text-xs font-bold uppercase tracking-wider ${isDark ? 'text-white/30 bg-white/2' : 'text-gray-400 bg-gray-50'}`}>Quantity</th>
                        <th className={`px-4 py-3 text-left text-xs font-bold uppercase tracking-wider ${isDark ? 'text-white/30 bg-white/2' : 'text-gray-400 bg-gray-50'}`}>Notes</th>
                      </tr>
                    </thead>
                    <tbody>
                      {animal.milkProduction.map((m: any) => (
                        <tr key={m.id} className={`border-b last:border-0 ${isDark ? 'border-white/4 hover:bg-white/2' : 'border-gray-50 hover:bg-gray-50'}`}>
                          <td className={`px-4 py-3 ${isDark ? 'text-white/75' : 'text-gray-700'}`}>{format(new Date(m.productionDate), 'dd MMM yyyy')}</td>
                          <td className="px-4 py-3 text-right font-bold text-blue-500">{Number(m.quantityLiters).toFixed(1)} L</td>
                          <td className={`px-4 py-3 text-xs ${isDark ? 'text-white/30' : 'text-gray-400'}`}>{m.notes || '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
