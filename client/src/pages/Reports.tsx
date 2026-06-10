import { useEffect, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line, CartesianGrid } from 'recharts';
import { Download, TrendingUp, Heart, Baby, Wallet, Beef, FileText, Loader2 } from 'lucide-react';
import api from '../lib/api';
import { PageLoader } from '../components/ui';

const TABS = ['overview', 'milk', 'health', 'breeding', 'financial', 'export'] as const;
type Tab = typeof TABS[number];
const TAB_LABELS: Record<Tab, string> = { overview: 'Overview', milk: 'Milk', health: 'Health', breeding: 'Breeding', financial: 'Financial', export: 'Export' };

function StatCard({ label, value, sub, color }: { label: string; value: string | number; sub?: string; color: string }) {
  return (
    <div className={`card p-4 border-l-4 ${color}`}>
      <div className="text-2xl font-bold text-gray-900">{value}</div>
      <div className="text-sm text-gray-500 mt-0.5">{label}</div>
      {sub && <div className="text-xs text-gray-400 mt-1">{sub}</div>}
    </div>
  );
}

function OverviewTab() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => { api.get('/reports/overview').then(r => setData(r.data)).finally(() => setLoading(false)); }, []);
  if (loading) return <PageLoader />;
  if (!data) return null;
  const netProfit = data.finance.totalIncome - data.finance.totalExpense;
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Active Animals" value={data.animals.active} sub={`${data.animals.sold} sold · ${data.animals.deceased} deceased`} color="border-emerald-500" />
        <StatCard label="Total Milk (all time)" value={`${data.milk.total.toFixed(0)} L`} sub={`${data.milk.month.toFixed(1)} L this month`} color="border-blue-500" />
        <StatCard label="Pregnant Animals" value={data.breeding.pregnant} sub={`${data.breeding.gaveBirth} gave birth`} color="border-pink-500" />
        <StatCard label="Net Profit" value={`KSh ${netProfit.toLocaleString()}`} sub={`Income KSh ${data.finance.totalIncome.toLocaleString()}`} color={netProfit >= 0 ? 'border-green-500' : 'border-red-500'} />
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        {[
          { icon: <TrendingUp className="w-5 h-5 text-white" />, bg: 'bg-blue-500',    title: 'Milk Production', desc: 'Production trends, top producers, daily averages.' },
          { icon: <Heart      className="w-5 h-5 text-white" />, bg: 'bg-red-500',     title: 'Animal Health',   desc: 'Health conditions, treatments, vaccinations.' },
          { icon: <Baby       className="w-5 h-5 text-white" />, bg: 'bg-pink-500',    title: 'Breeding',        desc: 'Breeding success rates, pregnancies, upcoming births.' },
          { icon: <Wallet     className="w-5 h-5 text-white" />, bg: 'bg-amber-500',   title: 'Financials',      desc: 'Income, expenses, profit/loss analysis.' },
          { icon: <Beef       className="w-5 h-5 text-white" />, bg: 'bg-emerald-500', title: 'Animals',         desc: 'Full herd breakdown by status and breed.' },
          { icon: <Download   className="w-5 h-5 text-white" />, bg: 'bg-purple-500',  title: 'Export Data',     desc: 'Download CSV files for all modules.' },
        ].map(card => (
          <div key={card.title} className="card p-4 flex flex-col gap-3">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-full ${card.bg} flex items-center justify-center`}>{card.icon}</div>
              <span className="font-semibold text-gray-900">{card.title}</span>
            </div>
            <p className="text-sm text-gray-500 flex-1">{card.desc}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function MilkTab() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => { api.get('/reports/milk').then(r => setData(r.data)).finally(() => setLoading(false)); }, []);
  if (loading) return <PageLoader />;
  if (!data) return null;
  return (
    <div className="space-y-6">
      {data.trend.length > 0 && (
        <div className="card p-5">
          <h3 className="font-semibold text-gray-900 mb-4">6-month production trend</h3>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={data.trend}><CartesianGrid strokeDasharray="3 3" vertical={false} /><XAxis dataKey="month" tick={{ fontSize: 12 }} /><YAxis tick={{ fontSize: 12 }} /><Tooltip formatter={(v: number) => [`${v.toFixed(1)} L`, 'Total']} /><Bar dataKey="total" fill="#10b981" radius={[4,4,0,0]} /></BarChart>
          </ResponsiveContainer>
        </div>
      )}
      {data.topProducers.length > 0 && (
        <div className="card p-5 overflow-x-auto">
          <h3 className="font-semibold text-gray-900 mb-4">Top producers this month</h3>
          <table className="w-full text-sm min-w-[400px]">
            <thead><tr className="text-left text-gray-500 border-b"><th className="pb-2">Rank</th><th className="pb-2">Animal</th><th className="pb-2">Total (L)</th><th className="pb-2">Avg/day</th></tr></thead>
            <tbody>{data.topProducers.map((p: any, i: number) => (
              <tr key={p.animalId} className="border-b last:border-0">
                <td className="py-2 font-medium text-gray-400">#{i+1}</td>
                <td className="py-2">{p.animal?.name} <span className="text-xs text-gray-400">{p.animal?.tagNumber}</span></td>
                <td className="py-2 font-semibold text-emerald-600">{Number(p._sum.quantityLiters).toFixed(1)}</td>
                <td className="py-2">{(Number(p._sum.quantityLiters)/p._count.id).toFixed(1)}</td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      )}
      <div className="card p-5 overflow-x-auto">
        <h3 className="font-semibold text-gray-900 mb-4">Recent records</h3>
        <table className="w-full text-sm min-w-[360px]">
          <thead><tr className="text-left text-gray-500 border-b"><th className="pb-2">Date</th><th className="pb-2">Animal</th><th className="pb-2">Qty</th><th className="pb-2">By</th></tr></thead>
          <tbody>{data.recent.length === 0 ? <tr><td colSpan={4} className="py-8 text-center text-gray-400">No records yet</td></tr> : data.recent.map((r: any) => (
            <tr key={r.id} className="border-b last:border-0">
              <td className="py-2">{r.productionDate?.slice(0,10)}</td>
              <td className="py-2">{r.animal?.name}</td>
              <td className="py-2 font-semibold text-emerald-600">{Number(r.quantityLiters).toFixed(1)} L</td>
              <td className="py-2 text-gray-500">{r.recordedByUser?.name || '—'}</td>
            </tr>
          ))}</tbody>
        </table>
      </div>
    </div>
  );
}

function HealthTab() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => { api.get('/reports/health').then(r => setData(r.data)).finally(() => setLoading(false)); }, []);
  if (loading) return <PageLoader />;
  if (!data) return null;
  return (
    <div className="space-y-6">
      {data.commonConditions.length > 0 && (
        <div className="card p-5">
          <h3 className="font-semibold text-gray-900 mb-4">Common conditions</h3>
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
            {data.commonConditions.map((c: any) => (
              <div key={c.condition} className="bg-gray-50 rounded-lg p-3">
                <div className="font-medium text-gray-800">{c.condition}</div>
                <div className="text-sm text-gray-400">{c.count} occurrence{c.count !== 1 ? 's' : ''}</div>
              </div>
            ))}
          </div>
        </div>
      )}
      <div className="card p-5 overflow-x-auto">
        <h3 className="font-semibold text-gray-900 mb-4">Recent health records</h3>
        <table className="w-full text-sm min-w-[420px]">
          <thead><tr className="text-left text-gray-500 border-b"><th className="pb-2">Date</th><th className="pb-2">Animal</th><th className="pb-2">Condition</th><th className="pb-2">Doctor</th></tr></thead>
          <tbody>{data.recent.length === 0 ? <tr><td colSpan={4} className="py-8 text-center text-gray-400">No records yet</td></tr> : data.recent.map((r: any) => (
            <tr key={r.id} className="border-b last:border-0">
              <td className="py-2">{r.recordDate?.slice(0,10)}</td>
              <td className="py-2">{r.animal?.name}</td>
              <td className="py-2">{r.condition}</td>
              <td className="py-2 text-gray-500">{r.doctorName || '—'}</td>
            </tr>
          ))}</tbody>
        </table>
      </div>
    </div>
  );
}

function BreedingTab() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => { api.get('/reports/breeding').then(r => setData(r.data)).finally(() => setLoading(false)); }, []);
  if (loading) return <PageLoader />;
  if (!data) return null;
  return (
    <div className="space-y-6">
      {data.upcoming.length > 0 && (
        <div className="card p-5">
          <h3 className="font-semibold text-gray-900 mb-4">Upcoming births</h3>
          <div className="space-y-2">
            {data.upcoming.map((b: any) => {
              const daysLeft = Math.floor((new Date(b.expectedBirthDate).getTime() - Date.now()) / 86400000);
              return (
                <div key={b.id} className="flex items-center justify-between py-2 border-b last:border-0">
                  <span className="font-medium">{b.animal?.name}</span>
                  <span className="text-sm text-gray-500">{b.expectedBirthDate?.slice(0,10)}</span>
                  <span className={`text-xs px-2 py-1 rounded-full ${daysLeft <= 3 ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'}`}>{daysLeft}d left</span>
                </div>
              );
            })}
          </div>
        </div>
      )}
      <div className="card p-5 overflow-x-auto">
        <h3 className="font-semibold text-gray-900 mb-4">Breeding records</h3>
        <table className="w-full text-sm min-w-[400px]">
          <thead><tr className="text-left text-gray-500 border-b"><th className="pb-2">Service date</th><th className="pb-2">Animal</th><th className="pb-2">Status</th><th className="pb-2">Expected birth</th></tr></thead>
          <tbody>{data.records.length === 0 ? <tr><td colSpan={4} className="py-8 text-center text-gray-400">No records yet</td></tr> : data.records.map((r: any) => (
            <tr key={r.id} className="border-b last:border-0">
              <td className="py-2">{r.serviceDate?.slice(0,10)}</td>
              <td className="py-2">{r.animal?.name}</td>
              <td className="py-2"><span className={`text-xs px-2 py-1 rounded-full ${r.pregnancyStatus==='pregnant'?'bg-blue-100 text-blue-700':r.pregnancyStatus==='gave_birth'?'bg-green-100 text-green-700':r.pregnancyStatus==='failed'?'bg-red-100 text-red-700':'bg-gray-100 text-gray-600'}`}>{r.pregnancyStatus}</span></td>
              <td className="py-2 text-gray-500">{r.expectedBirthDate?.slice(0,10)||'—'}</td>
            </tr>
          ))}</tbody>
        </table>
      </div>
    </div>
  );
}

function FinancialTab() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => { api.get('/reports/financial').then(r => setData(r.data)).finally(() => setLoading(false)); }, []);
  if (loading) return <PageLoader />;
  if (!data) return null;
  return (
    <div className="space-y-6">
      {data.trend.length > 0 && (
        <div className="card p-5">
          <h3 className="font-semibold text-gray-900 mb-4">6-month income vs expenses</h3>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={data.trend}><CartesianGrid strokeDasharray="3 3" vertical={false} /><XAxis dataKey="month" tick={{ fontSize: 12 }} /><YAxis tick={{ fontSize: 12 }} /><Tooltip formatter={(v: number) => `KSh ${v.toLocaleString()}`} /><Line type="monotone" dataKey="income" stroke="#10b981" strokeWidth={2} dot={false} name="Income" /><Line type="monotone" dataKey="expense" stroke="#ef4444" strokeWidth={2} dot={false} name="Expense" /></LineChart>
          </ResponsiveContainer>
        </div>
      )}
      {data.byCategory.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {['income', 'expense'].map(type => (
            <div key={type} className="card p-5">
              <h3 className="font-semibold text-gray-900 mb-3 capitalize">{type} by category</h3>
              <div className="space-y-2">
                {data.byCategory.filter((r: any) => r.type === type).map((r: any) => (
                  <div key={r.category} className="flex justify-between text-sm">
                    <span className="text-gray-600">{r.category}</span>
                    <span className={`font-medium ${type==='income'?'text-emerald-600':'text-red-500'}`}>KSh {Number(r.total).toLocaleString()}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
      <div className="card p-5 overflow-x-auto">
        <h3 className="font-semibold text-gray-900 mb-4">Recent transactions</h3>
        <table className="w-full text-sm min-w-[400px]">
          <thead><tr className="text-left text-gray-500 border-b"><th className="pb-2">Date</th><th className="pb-2">Type</th><th className="pb-2">Amount</th><th className="pb-2">Description</th></tr></thead>
          <tbody>{data.recent.length === 0 ? <tr><td colSpan={4} className="py-8 text-center text-gray-400">No records yet</td></tr> : data.recent.map((r: any) => (
            <tr key={r.id} className="border-b last:border-0">
              <td className="py-2">{r.transactionDate?.slice(0,10)}</td>
              <td className="py-2"><span className={`text-xs px-2 py-1 rounded-full ${r.type==='income'?'bg-green-100 text-green-700':'bg-red-100 text-red-700'}`}>{r.type}</span></td>
              <td className={`py-2 font-semibold ${r.type==='income'?'text-emerald-600':'text-red-500'}`}>KSh {Number(r.amount).toLocaleString()}</td>
              <td className="py-2 text-gray-500 max-w-[140px] truncate">{r.description||'—'}</td>
            </tr>
          ))}</tbody>
        </table>
      </div>
    </div>
  );
}

function ExportTab() {
  const [downloading, setDownloading] = useState<string | null>(null);
  const [error, setError] = useState('');

  async function download(type: string, label: string) {
    setDownloading(type);
    setError('');
    try {
      // Use fetch directly to handle blob download with cookies
      const res = await fetch(`/api/reports/export/${type}`, {
        credentials: 'include',
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || `Failed to download ${label}`);
      }
      const blob = await res.blob();
      const url  = window.URL.createObjectURL(blob);
      const a    = document.createElement('a');
      a.href     = url;
      a.download = `agripulse-${type}-${new Date().toISOString().slice(0,10)}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (e: any) {
      setError(e.message || 'Download failed. Please try again.');
    } finally {
      setDownloading(null);
    }
  }

  const exports = [
    { type: 'animals',   label: 'Animals',       desc: 'All animals with tag, breed, status, and dates.' },
    { type: 'milk',      label: 'Milk Records',   desc: 'All milk production records with animal and recorder.' },
    { type: 'health',    label: 'Health Records', desc: 'All health events, treatments, and vaccinations.' },
    { type: 'breeding',  label: 'Breeding',       desc: 'Service dates, pregnancies, and birth records.' },
    { type: 'financial', label: 'Financials',     desc: 'All income and expense transactions.' },
  ];

  return (
    <div className="space-y-4">
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">{error}</div>
      )}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {exports.map(e => (
          <div key={e.type} className="card p-5 flex items-start gap-4">
            <div className="w-10 h-10 bg-purple-50 rounded-lg flex items-center justify-center flex-shrink-0">
              <FileText className="w-5 h-5 text-purple-600" />
            </div>
            <div className="flex-1">
              <div className="font-semibold text-gray-900">{e.label}</div>
              <div className="text-sm text-gray-500 mt-0.5">{e.desc}</div>
              <button
                onClick={() => download(e.type, e.label)}
                disabled={!!downloading}
                className="btn-primary mt-3 text-sm px-3 py-1.5 disabled:opacity-50"
              >
                {downloading === e.type
                  ? <><Loader2 className="w-3.5 h-3.5 animate-spin" />Downloading...</>
                  : <><Download className="w-3.5 h-3.5" />Download CSV</>
                }
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function ReportsPage() {  useEffect(() => { document.title = 'Farm Reports — AgriPulse'; }, []);

  const [tab, setTab] = useState<Tab>('overview');
  return (
    <div className="animate-in space-y-5">
      <h1 className="text-2xl font-bold text-gray-900">Reports & Analytics</h1>
      <div className="flex gap-2 flex-wrap">
        {TABS.map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${tab === t ? 'bg-farm-green text-white' : 'bg-white border text-gray-600 hover:bg-gray-50'}`}>
            {TAB_LABELS[t]}
          </button>
        ))}
      </div>
      {tab === 'overview'  && <OverviewTab />}
      {tab === 'milk'      && <MilkTab />}
      {tab === 'health'    && <HealthTab />}
      {tab === 'breeding'  && <BreedingTab />}
      {tab === 'financial' && <FinancialTab />}
      {tab === 'export'    && <ExportTab />}
    </div>
  );
}
