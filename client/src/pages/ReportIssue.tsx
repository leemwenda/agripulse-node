import { useEffect, useState, FormEvent } from 'react';
import { AlertTriangle, Plus, ChevronDown, ChevronUp } from 'lucide-react';
import api from '../lib/api';

const CATEGORIES = ['bug', 'feature_request', 'performance', 'other'];
const PRIORITIES = ['low', 'medium', 'high', 'critical'];

const STATUS_COLORS: Record<string, string> = {
  open: 'bg-yellow-100 text-yellow-700',
  in_review: 'bg-blue-100 text-blue-700',
  resolved: 'bg-green-100 text-green-700',
  closed: 'bg-gray-100 text-gray-600',
};

const PRIORITY_COLORS: Record<string, string> = {
  low: 'bg-gray-100 text-gray-600',
  medium: 'bg-yellow-100 text-yellow-700',
  high: 'bg-orange-100 text-orange-700',
  critical: 'bg-red-100 text-red-700',
};

export function ReportIssuePage() {  useEffect(() => { document.title = 'Report Issue — AgriPulse'; }, []);

  const [issues, setIssues] = useState<any[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('bug');
  const [priority, setPriority] = useState('medium');
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  async function load() {
    const { data } = await api.get('/issues');
    setIssues(data.issues);
  }

  useEffect(() => { load(); }, []);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError(''); setSuccess('');
    setSubmitting(true);
    try {
      await api.post('/issues', { title, description, category, priority });
      setSuccess('Issue submitted successfully. Our team will review it.');
      setTitle(''); setDescription(''); setCategory('bug'); setPriority('medium');
      setShowForm(false);
      load();
    } catch (err: any) { setError(err?.response?.data?.error || 'Failed to submit issue.'); }
    finally { setSubmitting(false); }
  }

  return (
    <div className="animate-in max-w-3xl space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Report an Issue</h1>
        <button className="btn-primary" onClick={() => setShowForm(s => !s)}>
          <Plus className="w-4 h-4" />New report
        </button>
      </div>

      {showForm && (
        <div className="card p-6">
          <h2 className="font-semibold text-gray-900 mb-4 flex items-center gap-2"><AlertTriangle className="w-4 h-4 text-amber-500" />Issue report form</h2>
          <form onSubmit={submit} className="space-y-4">
            <div>
              <label className="block text-sm text-gray-600 mb-1">Title</label>
              <input className="input w-full" value={title} onChange={e => setTitle(e.target.value)} required placeholder="Briefly describe the issue" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-gray-600 mb-1">Category</label>
                <select className="input w-full" value={category} onChange={e => setCategory(e.target.value)}>
                  {CATEGORIES.map(c => <option key={c} value={c}>{c.replace('_', ' ')}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-1">Priority</label>
                <select className="input w-full" value={priority} onChange={e => setPriority(e.target.value)}>
                  {PRIORITIES.map(p => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>
            </div>
            <div>
              <label className="block text-sm text-gray-600 mb-1">Description</label>
              <textarea className="input w-full" rows={5} value={description} onChange={e => setDescription(e.target.value)} required placeholder="Describe the issue in detail — steps to reproduce, expected vs actual behaviour..." />
            </div>
            {error && <p className="text-sm text-red-500">{error}</p>}
            {success && <p className="text-sm text-emerald-600">{success}</p>}
            <div className="flex gap-2">
              <button type="submit" className="btn-primary" disabled={submitting}>{submitting ? 'Submitting...' : 'Submit issue'}</button>
              <button type="button" className="btn-secondary" onClick={() => setShowForm(false)}>Cancel</button>
            </div>
          </form>
        </div>
      )}

      {success && !showForm && <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-lg px-4 py-3 text-sm">{success}</div>}

      <div className="card p-6">
        <h2 className="font-semibold text-gray-900 mb-4">Your submitted issues</h2>
        {issues.length === 0 ? (
          <p className="text-gray-400 text-sm py-6 text-center">No issues reported yet.</p>
        ) : (
          <div className="space-y-3">
            {issues.map(issue => (
              <div key={issue.id} className="border rounded-lg p-4">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="font-medium text-gray-900">{issue.title}</div>
                    <div className="text-xs text-gray-400 mt-0.5">{issue.createdAt?.slice(0,10)} · {issue.category.replace('_',' ')}</div>
                  </div>
                  <div className="flex gap-2 flex-shrink-0">
                    <span className={`text-xs px-2 py-1 rounded-full ${PRIORITY_COLORS[issue.priority]}`}>{issue.priority}</span>
                    <span className={`text-xs px-2 py-1 rounded-full ${STATUS_COLORS[issue.status]}`}>{issue.status.replace('_',' ')}</span>
                  </div>
                </div>
                <p className="text-sm text-gray-500 mt-2 line-clamp-2">{issue.description}</p>
                {issue.adminNote && (
                  <div className="mt-2 bg-blue-50 border border-blue-100 rounded p-2 text-sm text-blue-700">
                    <span className="font-medium">Admin note: </span>{issue.adminNote}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
