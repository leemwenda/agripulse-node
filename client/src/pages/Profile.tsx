import { useEffect, useState, FormEvent } from 'react';
import { User, Lock, Shield } from 'lucide-react';
import api from '../lib/api';
import { useAuth } from '../context/AuthContext';

export function ProfilePage() {  useEffect(() => { document.title = 'My Profile — AgriPulse'; }, []);

  const { user: authUser } = useAuth();
  const [profile, setProfile] = useState<any>(null);
  const [name, setName] = useState('');
  const [saving, setSaving] = useState(false);
  const [nameMsg, setNameMsg] = useState('');

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [pwSaving, setPwSaving] = useState(false);
  const [pwMsg, setPwMsg] = useState('');
  const [pwError, setPwError] = useState('');

  useEffect(() => {
    api.get('/profile').then(r => { setProfile(r.data.user); setName(r.data.user.name); });
  }, []);

  async function saveName(e: FormEvent) {
    e.preventDefault();
    setSaving(true); setNameMsg('');
    try {
      const { data } = await api.put('/profile', { name });
      setProfile((p: any) => ({ ...p, name: data.user.name }));
      
      setNameMsg('Name updated successfully.');
    } catch { setNameMsg('Failed to update name.'); }
    finally { setSaving(false); }
  }

  async function savePassword(e: FormEvent) {
    e.preventDefault();
    setPwError(''); setPwMsg('');
    if (newPassword !== confirmPassword) { setPwError('Passwords do not match.'); return; }
    if (newPassword.length < 8) { setPwError('Password must be at least 8 characters.'); return; }
    setPwSaving(true);
    try {
      await api.put('/profile/password', { currentPassword, newPassword });
      setPwMsg('Password changed successfully.');
      setCurrentPassword(''); setNewPassword(''); setConfirmPassword('');
    } catch (err: any) { setPwError(err?.response?.data?.error || 'Failed to change password.'); }
    finally { setPwSaving(false); }
  }

  const initials = (n: string) => n.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);

  return (
    <div className="animate-in max-w-2xl space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">My Profile</h1>

      {/* Avatar + meta */}
      <div className="card p-6 flex items-center gap-4">
        <div className="w-16 h-16 rounded-full bg-farm-green flex items-center justify-center text-white text-xl font-bold flex-shrink-0">
          {profile ? initials(profile.name) : '?'}
        </div>
        <div>
          <div className="text-lg font-semibold text-gray-900">{profile?.name}</div>
          <div className="text-sm text-gray-500">{profile?.email}</div>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-xs bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full capitalize">{profile?.role}</span>
            <span className="text-xs text-gray-400">Member since {profile?.createdAt?.slice(0,10)}</span>
          </div>
        </div>
      </div>

      {/* Edit name */}
      <div className="card p-6">
        <div className="flex items-center gap-2 mb-4">
          <User className="w-4 h-4 text-gray-500" />
          <h2 className="font-semibold text-gray-900">Personal information</h2>
        </div>
        <form onSubmit={saveName} className="space-y-4">
          <div>
            <label className="block text-sm text-gray-600 mb-1">Full name</label>
            <input className="input w-full" value={name} onChange={e => setName(e.target.value)} required minLength={2} />
          </div>
          <div>
            <label className="block text-sm text-gray-600 mb-1">Email address</label>
            <input className="input w-full opacity-60 cursor-not-allowed" value={profile?.email || ''} disabled />
            <p className="text-xs text-gray-400 mt-1">Email cannot be changed.</p>
          </div>
          {nameMsg && <p className="text-sm text-emerald-600">{nameMsg}</p>}
          <button type="submit" className="btn-primary" disabled={saving}>{saving ? 'Saving...' : 'Save changes'}</button>
        </form>
      </div>

      {/* Change password */}
      <div className="card p-6">
        <div className="flex items-center gap-2 mb-4">
          <Lock className="w-4 h-4 text-gray-500" />
          <h2 className="font-semibold text-gray-900">Change password</h2>
        </div>
        <form onSubmit={savePassword} className="space-y-4">
          <div>
            <label className="block text-sm text-gray-600 mb-1">Current password</label>
            <input type="password" className="input w-full" value={currentPassword} onChange={e => setCurrentPassword(e.target.value)} required />
          </div>
          <div>
            <label className="block text-sm text-gray-600 mb-1">New password</label>
            <input type="password" className="input w-full" value={newPassword} onChange={e => setNewPassword(e.target.value)} required minLength={8} />
          </div>
          <div>
            <label className="block text-sm text-gray-600 mb-1">Confirm new password</label>
            <input type="password" className="input w-full" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} required />
          </div>
          {pwError && <p className="text-sm text-red-500">{pwError}</p>}
          {pwMsg && <p className="text-sm text-emerald-600">{pwMsg}</p>}
          <button type="submit" className="btn-primary" disabled={pwSaving}>{pwSaving ? 'Changing...' : 'Change password'}</button>
        </form>
      </div>

      {/* Account info */}
      <div className="card p-6">
        <div className="flex items-center gap-2 mb-4">
          <Shield className="w-4 h-4 text-gray-500" />
          <h2 className="font-semibold text-gray-900">Account details</h2>
        </div>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between"><span className="text-gray-500">Role</span><span className="capitalize font-medium">{profile?.role}</span></div>
          <div className="flex justify-between"><span className="text-gray-500">Status</span><span className={`font-medium ${profile?.isActive ? 'text-emerald-600' : 'text-red-500'}`}>{profile?.isActive ? 'Active' : 'Inactive'}</span></div>
          <div className="flex justify-between"><span className="text-gray-500">Last login</span><span>{profile?.lastLogin?.slice(0,10) || 'N/A'}</span></div>
          <div className="flex justify-between"><span className="text-gray-500">Joined</span><span>{profile?.createdAt?.slice(0,10)}</span></div>
        </div>
      </div>
    </div>
  );
}
