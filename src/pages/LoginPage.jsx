import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { Input } from '../components/common/Input';
import { Button } from '../components/common/Button';
import { Sparkles, Lock, Mail, ArrowRight, ShieldCheck } from 'lucide-react';

export const LoginPage = () => {
  const [email, setEmail] = useState('shiva@finai.io');
  const [password, setPassword] = useState('password123');
  const [rememberMe, setRememberMe] = useState(true);
  const [errors, setErrors] = useState({});
  const [isLoading, setIsLoading] = useState(false);

  const { login } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();

  const validate = () => {
    const errs = {};
    if (!email) errs.email = 'Email address is required';
    else if (!/\S+@\S+\.\S+/.test(email)) errs.email = 'Invalid email format';
    if (!password) errs.password = 'Password is required';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    setIsLoading(true);
    try {
      await login(email, password, rememberMe);
      showToast({
        title: 'Welcome Back',
        message: 'Successfully authenticated to FinAI Command Center',
        type: 'success',
      });
      navigate('/dashboard');
    } catch (err) {
      showToast({
        title: 'Authentication Error',
        message: err.message || 'Invalid credentials provided',
        type: 'error',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDemoFill = () => {
    setEmail('shiva@finai.io');
    setPassword('enterprise_key_2026');
    setErrors({});
  };

  return (
    <div className="min-h-[100dvh] relative flex items-center justify-center p-4 sm:p-6 bg-fin-bg-light dark:bg-fin-bg-dark overflow-x-hidden">
      {/* Subtle ambient orbs */}
      <div className="ambient-glow" aria-hidden="true">
        <div className="ambient-circle-1" />
        <div className="ambient-circle-2" />
      </div>

      <div className="w-full max-w-md relative z-10 animate-fade-in my-auto py-6">
        {/* Brand Banner */}
        <div className="text-center mb-6 sm:mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-500 via-indigo-600 to-indigo-800 text-white shadow-xl shadow-indigo-600/30 border border-indigo-400/30 mb-4 animate-pulse-subtle">
            <Sparkles className="w-7 h-7 text-indigo-100" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-100 font-sans">
            Fin<span className="text-indigo-400">AI</span> Operating System
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1.5">
            Autonomous Financial Intelligence & Treasury Operations
          </p>
        </div>

        {/* Card */}
        <div className="glass-panel rounded-2xl border border-white/10 shadow-2xl p-5 sm:p-8 backdrop-blur-xl">
          <div className="mb-6 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-slate-100">Sign in to FinAI</h2>
              <p className="text-xs text-slate-400 mt-0.5">Enter your corporate credentials</p>
            </div>
            <button
              type="button"
              onClick={handleDemoFill}
              className="text-[11px] font-semibold text-indigo-400 hover:text-indigo-300 bg-indigo-500/10 px-2.5 py-1 rounded-lg border border-indigo-500/20 transition-colors"
            >
              Demo Auto-Fill
            </button>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <Input
              label="Corporate Email"
              type="email"
              placeholder="shiva@finai.io"
              icon={Mail}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              error={errors.email}
              autoComplete="email"
            />

            <Input
              label="Password"
              type="password"
              placeholder="••••••••••••"
              icon={Lock}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              error={errors.password}
              autoComplete="current-password"
            />

            <div className="flex items-center justify-between text-xs pt-1">
              <label className="flex items-center gap-2 cursor-pointer select-none text-slate-300">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="rounded border-slate-700 bg-slate-800 text-indigo-600 focus:ring-indigo-500/30"
                />
                <span>Remember session</span>
              </label>

              <button
                type="button"
                onClick={() =>
                  showToast({
                    title: 'Password Reset',
                    message: 'Demo mode: Please sign in with default credentials.',
                    type: 'info',
                  })
                }
                className="text-indigo-400 hover:text-indigo-300 transition-colors"
              >
                Forgot password?
              </button>
            </div>

            <Button
              type="submit"
              variant="primary"
              size="lg"
              className="w-full mt-2"
              isLoading={isLoading}
              icon={ArrowRight}
            >
              Sign In to Command Center
            </Button>
          </form>

          {/* Footnote */}
          <div className="mt-6 pt-5 border-t border-white/10 text-center">
            <p className="text-xs text-slate-400">
              Don't have an enterprise account?{' '}
              <Link
                to="/signup"
                className="font-medium text-indigo-400 hover:text-indigo-300 transition-colors"
              >
                Create Account
              </Link>
            </p>
          </div>
        </div>

        {/* Security badge */}
        <div className="mt-6 flex items-center justify-center gap-2 text-[11px] text-slate-500">
          <ShieldCheck className="w-4 h-4 text-emerald-500/80" />
          <span>256-bit AES Financial Encryption & SOC2 Type II Certified</span>
        </div>
      </div>
    </div>
  );
};
