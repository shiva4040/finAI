import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { Input } from '../components/common/Input';
import { Button } from '../components/common/Button';
import { Sparkles, Lock, Mail, User, ShieldCheck } from 'lucide-react';

export const SignupPage = () => {
  const [formData, setFormData] = useState({
    name: 'Shiva Sharma',
    email: 'shiva@finai.io',
    password: 'SecurePassword123!',
    confirmPassword: 'SecurePassword123!',
    terms: true,
  });

  const [errors, setErrors] = useState({});
  const [isLoading, setIsLoading] = useState(false);

  const { signup } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();

  // Password strength calculation
  const getPasswordStrength = (pass) => {
    if (!pass) return { score: 0, label: 'Empty', color: 'bg-slate-700' };
    let score = 0;
    if (pass.length >= 8) score++;
    if (/[A-Z]/.test(pass)) score++;
    if (/[0-9]/.test(pass)) score++;
    if (/[^A-Za-z0-9]/.test(pass)) score++;

    if (score === 1) return { score: 25, label: 'Weak', color: 'bg-rose-500' };
    if (score === 2) return { score: 50, label: 'Fair', color: 'bg-amber-500' };
    if (score === 3) return { score: 75, label: 'Good', color: 'bg-sky-500' };
    return { score: 100, label: 'Strong', color: 'bg-emerald-500' };
  };

  const strength = getPasswordStrength(formData.password);

  const validate = () => {
    const errs = {};
    if (!formData.name.trim()) errs.name = 'Full name is required';
    if (!formData.email.trim()) errs.email = 'Email address is required';
    else if (!/\S+@\S+\.\S+/.test(formData.email)) errs.email = 'Invalid email format';
    if (!formData.password) errs.password = 'Password is required';
    else if (formData.password.length < 6) errs.password = 'Password must be at least 6 characters';
    if (formData.password !== formData.confirmPassword) {
      errs.confirmPassword = 'Passwords do not match';
    }
    if (!formData.terms) errs.terms = 'You must accept the terms of service';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSignup = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    setIsLoading(true);
    try {
      await signup({
        name: formData.name,
        email: formData.email,
        password: formData.password,
      });
      showToast({
        title: 'Account Created',
        message: 'Welcome to FinAI! Your treasury workspace is initialized.',
        type: 'success',
      });
      navigate('/dashboard');
    } catch (err) {
      showToast({
        title: 'Signup Failed',
        message: err.message || 'Unable to create account',
        type: 'error',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen relative flex items-center justify-center p-4 sm:p-6 bg-fin-bg-light dark:bg-fin-bg-dark overflow-hidden">
      <div className="ambient-glow" aria-hidden="true">
        <div className="ambient-circle-1" />
        <div className="ambient-circle-2" />
      </div>

      <div className="w-full max-w-md relative z-10 animate-fade-in my-8">
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-500 via-indigo-600 to-indigo-800 text-white shadow-xl shadow-indigo-600/30 border border-indigo-400/30 mb-3 animate-pulse-subtle">
            <Sparkles className="w-6 h-6 text-indigo-100" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-100 font-sans">
            Start with Fin<span className="text-indigo-400">AI</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Deploy your enterprise intelligent financial suite in 60 seconds
          </p>
        </div>

        <div className="glass-panel rounded-2xl border border-white/10 shadow-2xl p-6 sm:p-8 backdrop-blur-xl">
          <form onSubmit={handleSignup} className="space-y-3.5">
            <Input
              label="Full Name"
              placeholder="Shiva Sharma"
              icon={User}
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              error={errors.name}
              required
            />

            <Input
              label="Work Email"
              type="email"
              placeholder="shiva@finai.io"
              icon={Mail}
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              error={errors.email}
              required
            />

            <Input
              label="Password"
              type="password"
              placeholder="••••••••••••"
              icon={Lock}
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              error={errors.password}
              required
            />

            {/* Password strength meter */}
            {formData.password && (
              <div className="space-y-1 pt-0.5">
                <div className="flex justify-between items-center text-[10px] text-slate-400">
                  <span>Password strength:</span>
                  <span className="font-semibold text-slate-200">{strength.label}</span>
                </div>
                <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
                  <div
                    className={`h-full transition-all duration-300 ${strength.color}`}
                    style={{ width: `${strength.score}%` }}
                  />
                </div>
              </div>
            )}

            <Input
              label="Confirm Password"
              type="password"
              placeholder="••••••••••••"
              icon={Lock}
              value={formData.confirmPassword}
              onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
              error={errors.confirmPassword}
              required
            />

            <div className="pt-1">
              <label className="flex items-start gap-2 cursor-pointer select-none text-xs text-slate-300">
                <input
                  type="checkbox"
                  checked={formData.terms}
                  onChange={(e) => setFormData({ ...formData, terms: e.target.checked })}
                  className="rounded border-slate-700 bg-slate-800 text-indigo-600 focus:ring-indigo-500/30 mt-0.5"
                />
                <span>
                  I agree to the{' '}
                  <span className="text-indigo-400 hover:underline">FinAI Terms of Service</span> and{' '}
                  <span className="text-indigo-400 hover:underline">Privacy Policy</span>
                </span>
              </label>
              {errors.terms && <p className="text-xs text-rose-400 mt-1">{errors.terms}</p>}
            </div>

            <Button
              type="submit"
              variant="primary"
              size="lg"
              className="w-full mt-2"
              isLoading={isLoading}
            >
              Initialize Workspace
            </Button>
          </form>

          <div className="mt-5 pt-4 border-t border-white/10 text-center">
            <p className="text-xs text-slate-400">
              Already have an enterprise account?{' '}
              <Link
                to="/login"
                className="font-medium text-indigo-400 hover:text-indigo-300 transition-colors"
              >
                Sign In
              </Link>
            </p>
          </div>
        </div>

        <div className="mt-5 flex items-center justify-center gap-2 text-[11px] text-slate-500">
          <ShieldCheck className="w-4 h-4 text-emerald-500/80" />
          <span>No credit card required for 14-day full enterprise trial</span>
        </div>
      </div>
    </div>
  );
};
