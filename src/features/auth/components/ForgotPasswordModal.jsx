import React, { useState, memo } from 'react';
import { X, Mail, ArrowRight, Loader2, CheckCircle2 } from 'lucide-react';

function ForgotPasswordModal({ isOpen, onClose }) {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSent, setIsSent] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    setIsLoading(true);
    setTimeout(() => {
      setIsLoading(false);
      setIsSent(true);
    }, 200);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div
        onClick={onClose}
        className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
      />
      <div
        className="relative w-full max-w-md bg-white rounded-[32px] shadow-2xl overflow-hidden"
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute top-6 right-6 p-2 rounded-full hover:bg-slate-100 transition-colors text-slate-400 cursor-pointer"
        >
          <X size={20} />
        </button>

        <div className="p-8 sm:p-10">
          {!isSent ? (
            <div>
              <div className="w-16 h-16 bg-emerald-50 rounded-2xl flex items-center justify-center mb-6">
                <Mail className="text-emerald-600" size={32} />
              </div>
              <h3 className="text-2xl font-bold text-slate-900 mb-2">Forgot Password?</h3>
              <p className="text-slate-500 mb-8 leading-relaxed">
                Enter your email address and we&apos;ll send you a link to reset your password.
              </p>

              <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                  <label className="block text-sm font-bold uppercase tracking-wider text-slate-400 mb-3">
                    Email Address
                  </label>
                  <div className="relative group">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                      <Mail className="text-slate-400 group-focus-within:text-emerald-600 transition-colors" size={20} />
                    </div>
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full pl-11 pr-4 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:border-emerald-500 focus:bg-white focus:ring-4 focus:ring-emerald-500/5 outline-none transition-all text-slate-800 font-medium"
                      placeholder="admin@veggofresh.com"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full py-4 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-400 text-white font-bold rounded-2xl shadow-lg shadow-emerald-600/20 flex items-center justify-center gap-2 transition-all cursor-pointer"
                >
                  {isLoading ? (
                    <Loader2 className="animate-spin" size={20} />
                  ) : (
                    <>
                      Send Reset Link
                      <ArrowRight size={18} />
                    </>
                  )}
                </button>
              </form>
            </div>
          ) : (
            <div className="text-center py-4">
              <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <CheckCircle2 className="text-emerald-600" size={40} />
              </div>
              <h3 className="text-2xl font-bold text-slate-900 mb-2">Check your email</h3>
              <p className="text-slate-500 mb-8 leading-relaxed">
                We have sent a password recovery link to <br />
                <span className="font-semibold text-slate-900">{email}</span>
              </p>
              <button
                type="button"
                onClick={onClose}
                className="w-full py-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-2xl transition-all cursor-pointer"
              >
                Back to Login
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default memo(ForgotPasswordModal);