import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useFinance } from '../context/FinanceContext';
import { useToast } from '../context/ToastContext';
import { GlassCard } from '../components/common/GlassCard';
import { Button } from '../components/common/Button';
import { Input, Select } from '../components/common/Input';
import { Badge } from '../components/common/Badge';
import {
  User,
  Shield,
  Sliders,
  Palette,
  Bell,
  Check,
  Laptop,
  Smartphone,
  Trash2,
  Lock,
  Moon,
  Sun,
  Globe,
} from 'lucide-react';

export const SettingsPage = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, updateProfile } = useAuth();
  const { theme, setTheme } = useTheme();
  const { currency, setCurrency } = useFinance();
  const { showToast } = useToast();

  // Determine active tab from URL path (e.g. /settings/security -> 'security')
  const pathParts = location.pathname.split('/');
  const subRoute = pathParts[2] || 'profile';
  const [activeTab, setActiveTab] = useState(subRoute);

  useEffect(() => {
    if (pathParts[2]) {
      setActiveTab(pathParts[2]);
    }
  }, [location.pathname]);

  const handleTabChange = (tabId) => {
    setActiveTab(tabId);
    navigate(`/settings/${tabId}`);
  };

  // Form states
  const [profileForm, setProfileForm] = useState({
    name: user?.name || 'Shiva',
    fullName: user?.fullName || 'Shiva Sharma',
    email: user?.email || 'shiva@finai.io',
    role: user?.role || 'Chief Financial Officer',
    company: user?.company || 'FinAI Technologies Inc.',
    avatar: user?.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&q=80',
  });

  const [twoFactor, setTwoFactor] = useState(user?.twoFactorEnabled ?? true);
  const [sessions, setSessions] = useState(user?.sessions || []);
  const [notificationsConfig, setNotificationsConfig] = useState(
    user?.notificationsConfig || {
      emailAlerts: true,
      invoiceAlerts: true,
      aiWeeklyBriefing: true,
      paymentReceipts: true,
      anomalyDetection: true,
    }
  );

  const [dateFormat, setDateFormat] = useState(user?.dateFormat || 'DD MMM YYYY');
  const [language, setLanguage] = useState(user?.language || 'English (US)');

  const handleSaveProfile = (e) => {
    e.preventDefault();
    updateProfile(profileForm);
    showToast({
      title: 'Profile Updated',
      message: 'Your personal information has been saved.',
      type: 'success',
    });
  };

  const handleRevokeSession = (sessionId) => {
    setSessions((prev) => prev.filter((s) => s.id !== sessionId));
    showToast({
      title: 'Session Revoked',
      message: 'The selected device session has been signed out.',
      type: 'info',
    });
  };

  const tabs = [
    { id: 'profile', label: 'Profile', icon: User },
    { id: 'security', label: 'Security & 2FA', icon: Shield },
    { id: 'preferences', label: 'Preferences', icon: Sliders },
    { id: 'appearance', label: 'Appearance', icon: Palette },
    { id: 'notifications', label: 'Notifications', icon: Bell },
  ];

  return (
    <div className="space-y-6 sm:space-y-8 animate-fade-in max-w-5xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-100 font-sans">
          Workspace Settings & Configuration
        </h1>
        <p className="text-xs sm:text-sm text-slate-400 mt-1">
          Manage corporate credentials, multi-factor authentication, localization, and appearance
        </p>
      </div>

      {/* Tabs Bar */}
      <div className="flex items-center gap-1.5 border-b border-white/10 pb-2 overflow-x-auto no-scrollbar">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => handleTabChange(tab.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                isActive
                  ? 'bg-indigo-600/20 text-white border border-indigo-500/30 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Profile Tab */}
      {activeTab === 'profile' && (
        <GlassCard>
          <form onSubmit={handleSaveProfile} className="space-y-6 max-w-2xl">
            <div className="flex items-center gap-4 pb-4 border-b border-white/10">
              <img
                src={profileForm.avatar}
                alt="Avatar Preview"
                className="w-16 h-16 rounded-2xl object-cover ring-2 ring-indigo-500/40"
              />
              <div className="flex-1">
                <Input
                  label="Avatar Image URL"
                  value={profileForm.avatar}
                  onChange={(e) =>
                    setProfileForm({ ...profileForm, avatar: e.target.value })
                  }
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Full Name"
                value={profileForm.fullName}
                onChange={(e) =>
                  setProfileForm({ ...profileForm, fullName: e.target.value })
                }
                required
              />
              <Input
                label="Short Name / Display"
                value={profileForm.name}
                onChange={(e) =>
                  setProfileForm({ ...profileForm, name: e.target.value })
                }
                required
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Corporate Email"
                type="email"
                value={profileForm.email}
                onChange={(e) =>
                  setProfileForm({ ...profileForm, email: e.target.value })
                }
                required
              />
              <Input
                label="Job Title / Role"
                value={profileForm.role}
                onChange={(e) =>
                  setProfileForm({ ...profileForm, role: e.target.value })
                }
              />
            </div>

            <Input
              label="Company Legal Entity"
              value={profileForm.company}
              onChange={(e) =>
                setProfileForm({ ...profileForm, company: e.target.value })
              }
            />

            <div className="flex justify-end pt-3">
              <Button type="submit" variant="primary" icon={Check}>
                Save Profile Changes
              </Button>
            </div>
          </form>
        </GlassCard>
      )}

      {/* Security Tab */}
      {activeTab === 'security' && (
        <div className="space-y-6 max-w-3xl">
          {/* Two-Factor Authentication */}
          <GlassCard className="space-y-4">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-base font-semibold text-slate-100">
                  Two-Factor Authentication (2FA)
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Protect your treasury assets with mandatory biometric or authenticator TOTP keys
                </p>
              </div>
              <Badge variant={twoFactor ? 'income' : 'warning'} size="sm">
                {twoFactor ? 'Enabled' : 'Disabled'}
              </Badge>
            </div>

            <div className="p-4 rounded-xl glass-subtle flex items-center justify-between">
              <div>
                <span className="text-xs font-semibold text-slate-200">
                  Authenticator App (Google / 1Password)
                </span>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Require 6-digit cryptographic verification code on sign-in
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  const nextVal = !twoFactor;
                  setTwoFactor(nextVal);
                  showToast({
                    title: '2FA Updated',
                    message: nextVal ? 'Two-factor authentication enabled' : '2FA disabled',
                    type: nextVal ? 'success' : 'warning',
                  });
                }}
                className={`w-12 h-6 rounded-full transition-colors relative p-0.5 ${
                  twoFactor ? 'bg-indigo-600' : 'bg-slate-700'
                }`}
              >
                <div
                  className={`w-5 h-5 rounded-full bg-white transition-transform ${
                    twoFactor ? 'translate-x-6' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>
          </GlassCard>

          {/* Password Change */}
          <GlassCard className="space-y-4">
            <h3 className="text-base font-semibold text-slate-100">Change Master Password</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input label="Current Password" type="password" placeholder="••••••••••••" />
              <Input label="New Password" type="password" placeholder="••••••••••••" />
            </div>
            <div className="flex justify-end pt-2">
              <Button
                variant="secondary"
                size="md"
                onClick={() =>
                  showToast({
                    title: 'Password Updated',
                    message: 'Your master login password was changed.',
                    type: 'success',
                  })
                }
              >
                Update Password
              </Button>
            </div>
          </GlassCard>

          {/* Active Sessions UI */}
          <GlassCard className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-semibold text-slate-100">Active Authorized Sessions</h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Devices currently signed into this FinAI workspace
                </p>
              </div>
            </div>

            <div className="divide-y divide-white/5 space-y-2">
              {sessions.map((sess) => (
                <div key={sess.id} className="pt-2 flex items-center justify-between text-xs gap-3">
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div className="p-2 rounded-xl glass-subtle text-slate-400 shrink-0">
                      {sess.device.includes('iPhone') ? (
                        <Smartphone className="w-4 h-4" />
                      ) : (
                        <Laptop className="w-4 h-4" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-slate-200 truncate">{sess.device}</span>
                        {sess.active && (
                          <Badge variant="income" size="sm">Current</Badge>
                        )}
                      </div>
                      <p className="text-[10px] text-slate-400 font-mono truncate">
                        {sess.ip} • {sess.location} • Last active: {sess.lastActive}
                      </p>
                    </div>
                  </div>

                  {!sess.active && (
                    <button
                      onClick={() => handleRevokeSession(sess.id)}
                      className="text-xs text-rose-400 hover:text-rose-300 transition-colors p-2 shrink-0"
                      title="Revoke session"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </GlassCard>
        </div>
      )}

      {/* Preferences Tab */}
      {activeTab === 'preferences' && (
        <GlassCard className="space-y-6 max-w-2xl">
          <div>
            <h3 className="text-base font-semibold text-slate-100">Regional & Financial Formatting</h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Configure base ledger currency display and date serialization
            </p>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                Primary Financial Currency
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setCurrency('INR');
                    showToast({ title: 'Currency Changed', message: 'Set to Indian Rupee (₹)', type: 'info' });
                  }}
                  className={`p-3.5 rounded-xl border text-left transition-all ${
                    currency === 'INR'
                      ? 'bg-indigo-600/20 border-indigo-500/50 text-white font-semibold'
                      : 'glass-subtle text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <span className="text-base font-bold font-mono">₹ INR</span>
                  <p className="text-[11px] text-slate-400 mt-0.5">Indian Rupee (Lakhs & Crores)</p>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setCurrency('USD');
                    showToast({ title: 'Currency Changed', message: 'Set to US Dollar ($)', type: 'info' });
                  }}
                  className={`p-3.5 rounded-xl border text-left transition-all ${
                    currency === 'USD'
                      ? 'bg-indigo-600/20 border-indigo-500/50 text-white font-semibold'
                      : 'glass-subtle text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <span className="text-base font-bold font-mono">$ USD</span>
                  <p className="text-[11px] text-slate-400 mt-0.5">US Dollar ($)</p>
                </button>
              </div>
            </div>

            <Select
              label="Date Display Format"
              value={dateFormat}
              onChange={(e) => setDateFormat(e.target.value)}
              options={[
                { value: 'DD MMM YYYY', label: '30 Sep 2026 (Standard British/Indian)' },
                { value: 'MM/DD/YYYY', label: '09/30/2026 (US Format)' },
                { value: 'YYYY-MM-DD', label: '2026-09-30 (ISO 8601)' },
              ]}
            />

            <Select
              label="Application Language"
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
              options={[
                { value: 'English (US)', label: 'English (US & Global)' },
                { value: 'English (UK)', label: 'English (UK & Commonwealth)' },
                { value: 'Hindi', label: 'हिंदी (Hindi)' },
              ]}
            />
          </div>

          <div className="flex justify-end pt-2">
            <Button
              variant="primary"
              onClick={() =>
                showToast({
                  title: 'Preferences Saved',
                  message: 'Localization and formatting settings updated.',
                  type: 'success',
                })
              }
            >
              Save Preferences
            </Button>
          </div>
        </GlassCard>
      )}

      {/* Appearance Tab */}
      {activeTab === 'appearance' && (
        <GlassCard className="space-y-6 max-w-2xl">
          <div>
            <h3 className="text-base font-semibold text-slate-100">Interface Theme System</h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Select between subtle translucent dark glass or crisp clean light glass
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Dark Theme Card */}
            <div
              onClick={() => setTheme('dark')}
              className={`p-5 rounded-2xl border cursor-pointer transition-all ${
                theme === 'dark'
                  ? 'border-indigo-500 bg-indigo-950/20 shadow-glass-glow ring-1 ring-indigo-500'
                  : 'glass-subtle hover:border-white/20'
              }`}
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Moon className="w-5 h-5 text-indigo-400" />
                  <h4 className="text-sm font-semibold text-slate-100">Deep Obsidian Glass</h4>
                </div>
                {theme === 'dark' && <Badge variant="purple" size="sm">Active</Badge>}
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">
                Charcoal obsidian glass with emerald and indigo high-contrast financial accents.
              </p>
              <div className="mt-4 h-12 rounded-xl bg-[#090d16] border border-white/10 p-2 flex items-center gap-2">
                <span className="w-4 h-4 rounded-full bg-emerald-500/20 border border-emerald-500/40" />
                <span className="w-16 h-2 rounded bg-white/20" />
              </div>
            </div>

            {/* Light Theme Card */}
            <div
              onClick={() => setTheme('light')}
              className={`p-5 rounded-2xl border cursor-pointer transition-all ${
                theme === 'light'
                  ? 'border-indigo-500 bg-white/90 shadow-glass-glow ring-1 ring-indigo-500 text-slate-900'
                  : 'glass-subtle hover:border-white/20'
              }`}
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Sun className="w-5 h-5 text-amber-500" />
                  <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                    Opal Swiss Light
                  </h4>
                </div>
                {theme === 'light' && <Badge variant="purple" size="sm">Active</Badge>}
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                Clean off-white translucency with frosted glass panels and high readability.
              </p>
              <div className="mt-4 h-12 rounded-xl bg-[#ffffff] border border-slate-200 p-2 flex items-center gap-2">
                <span className="w-4 h-4 rounded-full bg-emerald-500/30 border border-emerald-500" />
                <span className="w-16 h-2 rounded bg-slate-300" />
              </div>
            </div>
          </div>
        </GlassCard>
      )}

      {/* Notifications Tab */}
      {activeTab === 'notifications' && (
        <GlassCard className="space-y-6 max-w-2xl">
          <div>
            <h3 className="text-base font-semibold text-slate-100">Notification Alerts & Digest</h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Control automated triggers for overdue invoices, bank credits, and AI anomaly alerts
            </p>
          </div>

          <div className="space-y-4">
            {[
              {
                key: 'emailAlerts',
                title: 'Critical Email Dispatch',
                desc: 'Receive immediate security and treasury drawdown notices by email',
              },
              {
                key: 'invoiceAlerts',
                title: 'Invoice Overdue Automated Warnings',
                desc: 'Alert when client invoices remain unpaid after scheduled due dates',
              },
              {
                key: 'aiWeeklyBriefing',
                title: 'FinAI Weekly Intelligence Briefing',
                desc: 'Executive summary of cash flow velocity delivered every Monday morning',
              },
              {
                key: 'paymentReceipts',
                title: 'Bank Credit Reconciliations',
                desc: 'Instant notifications when incoming client payments are verified in ledger',
              },
              {
                key: 'anomalyDetection',
                title: 'Autonomous Spend Anomaly Alerts',
                desc: 'Real-time alert if cloud or vendor costs accelerate more than 15% WoW',
              },
            ].map((item) => (
              <div
                key={item.key}
                className="p-3.5 rounded-xl glass-subtle flex items-center justify-between text-xs"
              >
                <div>
                  <span className="font-semibold text-slate-200 block">{item.title}</span>
                  <p className="text-slate-400 mt-0.5 text-[11px]">{item.desc}</p>
                </div>
                <button
                  type="button"
                  onClick={() =>
                    setNotificationsConfig((prev) => ({
                      ...prev,
                      [item.key]: !prev[item.key],
                    }))
                  }
                  className={`w-11 h-6 rounded-full transition-colors relative p-0.5 shrink-0 ${
                    notificationsConfig[item.key] ? 'bg-indigo-600' : 'bg-slate-700'
                  }`}
                >
                  <div
                    className={`w-5 h-5 rounded-full bg-white transition-transform ${
                      notificationsConfig[item.key] ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>
            ))}
          </div>

          <div className="flex justify-end pt-2">
            <Button
              variant="primary"
              onClick={() =>
                showToast({
                  title: 'Preferences Saved',
                  message: 'Notification trigger rules updated successfully.',
                  type: 'success',
                })
              }
            >
              Update Triggers
            </Button>
          </div>
        </GlassCard>
      )}
    </div>
  );
};
