"use client";

import React, { useState } from "react";
import { useNotes } from "@/context/NotesContext";
import { isFirebaseConfigured } from "@/lib/firebase";
import { Mail, Lock, Loader2, Sparkles, X, ShieldAlert } from "lucide-react";
import { cn } from "@/lib/utils";

interface AuthOverlayProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AuthOverlay: React.FC<AuthOverlayProps> = ({ isOpen, onClose }) => {
  const { signIn, signUp, signInWithGoogle, theme } = useNotes();
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [loading, setLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");
    setSuccessMsg("");
    setLoading(true);

    try {
      if (isSignUp) {
        const { error } = await signUp(email, password);
        if (error) {
          setErrorMsg(error.message || "Failed to sign up.");
        } else {
          setSuccessMsg("Successfully signed up! You are now logged in.");
          setEmail("");
          setPassword("");
          setTimeout(() => onClose(), 1000);
        }
      } else {
        const { error } = await signIn(email, password);
        if (error) {
          setErrorMsg(error.message || "Failed to sign in.");
        } else {
          onClose();
        }
      }
    } catch (err: any) {
      setErrorMsg(err.message || "An unexpected error occurred.");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setErrorMsg("");
    setSuccessMsg("");
    setLoading(true);
    try {
      const { error } = await signInWithGoogle();
      if (error) {
        setErrorMsg(error.message || "Failed to sign in with Google.");
      } else {
        onClose();
      }
    } catch (err: any) {
      setErrorMsg(err.message || "An unexpected error occurred.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md animate-fade-in select-none">
      <div 
        className={cn(
          "relative w-full max-w-md overflow-hidden rounded-2xl border bg-[#050505]/90 p-8 shadow-2xl backdrop-blur-2xl animate-fade-in-up",
          theme === "reflect" && "border-purple-500/10 shadow-purple-500/5",
          theme === "granola" && "border-emerald-500/10 shadow-emerald-500/5",
          theme === "solar" && "border-amber-500/10 shadow-amber-500/5"
        )}
      >
        {/* Glow overlay */}
        <div className={cn(
          "absolute -right-20 -top-20 -z-10 h-40 w-40 rounded-full blur-2xl opacity-20",
          theme === "reflect" && "bg-purple-600",
          theme === "granola" && "bg-emerald-600",
          theme === "solar" && "bg-amber-600"
        )} />

        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute right-4 top-4 rounded-full p-1.5 text-zinc-500 hover:bg-white/10 hover:text-white transition-all cursor-pointer"
        >
          <X className="h-4.5 w-4.5" />
        </button>

        <div className="flex flex-col items-center text-center">
          <div className={cn(
            "flex h-11 w-11 items-center justify-center rounded-xl bg-white/5 border border-white/10 mb-4",
            theme === "reflect" && "text-purple-400",
            theme === "granola" && "text-emerald-400",
            theme === "solar" && "text-amber-400"
          )}>
            <Sparkles className="h-5 w-5 animate-pulse" />
          </div>
          <h2 className="text-xl font-bold tracking-tight text-white font-sans">
            {isSignUp ? "Create your Account" : "Sync with Cloud"}
          </h2>
          <p className="mt-1 text-xs text-zinc-500 font-medium">
            {isSignUp
              ? "Backup and synchronize your notes securely"
              : "Access your documents across devices securely"}
          </p>
        </div>

        {!isFirebaseConfigured && (
          <div className="mt-5 flex gap-2.5 rounded-lg border border-yellow-500/20 bg-yellow-500/5 p-3 text-[10px] text-yellow-200">
            <ShieldAlert className="h-4.5 w-4.5 shrink-0 text-yellow-400 mt-0.5" />
            <div>
              <span className="font-bold">Firebase credentials missing.</span>
              <p className="mt-0.5 text-zinc-500 leading-normal">
                Setup your environment variables in <code className="rounded bg-black/60 px-1 font-mono text-[9px]">.env.local</code> first to activate account creation and sync:
              </p>
              <div className="mt-1.5 font-mono bg-black/30 p-1.5 rounded space-y-0.5 text-[8px] text-zinc-400 select-all border border-white/5">
                <div>NEXT_PUBLIC_FIREBASE_API_KEY=...</div>
                <div>NEXT_PUBLIC_FIREBASE_PROJECT_ID=...</div>
                <div>NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=...</div>
              </div>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-5 space-y-3.5">
          <div>
            <label className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest block mb-1">
              Email Address
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-3 flex items-center text-zinc-600">
                <Mail className="h-4 w-4" />
              </span>
              <input
                type="email"
                required
                disabled={!isFirebaseConfigured}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-lg border border-white/5 bg-white/[0.02] py-2 pl-9 pr-4 text-xs text-white placeholder-zinc-700 outline-none focus:border-white/20 focus:bg-white/[0.04] transition-all disabled:opacity-30"
                placeholder="you@example.com"
              />
            </div>
          </div>

          <div>
            <label className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest block mb-1">
              Password
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-3 flex items-center text-zinc-600">
                <Lock className="h-4 w-4" />
              </span>
              <input
                type="password"
                required
                disabled={!isFirebaseConfigured}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-lg border border-white/5 bg-white/[0.02] py-2 pl-9 pr-4 text-xs text-white placeholder-zinc-700 outline-none focus:border-white/20 focus:bg-white/[0.04] transition-all disabled:opacity-30"
                placeholder="••••••••"
              />
            </div>
          </div>

          {errorMsg && (
            <p className="text-[10px] text-rose-400 font-bold text-center bg-rose-500/10 py-1.5 rounded-lg border border-rose-500/20">
              {errorMsg}
            </p>
          )}

          {successMsg && (
            <p className="text-[10px] text-emerald-400 font-bold text-center bg-emerald-500/10 py-1.5 rounded-lg border border-emerald-500/20">
              {successMsg}
            </p>
          )}

          <button
            type="submit"
            disabled={loading || !isFirebaseConfigured}
            className={cn(
              "w-full flex items-center justify-center gap-2 rounded-lg py-2 text-xs font-bold text-white shadow-lg focus:outline-none disabled:opacity-30 disabled:cursor-not-allowed transition-all cursor-pointer hover:scale-[1.01] active:scale-95",
              theme === "reflect" && "bg-gradient-to-r from-purple-500 to-indigo-600",
              theme === "granola" && "bg-gradient-to-r from-emerald-500 to-teal-600",
              theme === "solar" && "bg-gradient-to-r from-amber-500 to-orange-600"
            )}
          >
            {loading ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : isSignUp ? (
              "Sign Up"
            ) : (
              "Sign In"
            )}
          </button>
        </form>

        {/* Divider */}
        <div className="mt-4.5 flex items-center gap-3">
          <div className="h-px flex-1 bg-white/5" />
          <span className="text-[8px] font-bold text-zinc-700 uppercase tracking-widest select-none">or</span>
          <div className="h-px flex-1 bg-white/5" />
        </div>

        {/* Google Authentication */}
        <button
          onClick={handleGoogleSignIn}
          disabled={loading || !isFirebaseConfigured}
          className="mt-3.5 w-full flex items-center justify-center gap-2 rounded-lg border border-white/5 bg-white/[0.01] py-2 text-xs font-bold text-zinc-300 hover:bg-white/[0.03] transition-all disabled:opacity-30 cursor-pointer"
        >
          <svg className="h-3.5 w-3.5 shrink-0" viewBox="0 0 24 24">
            <path
              fill="#EA4335"
              d="M5.266 9.765A7.077 7.077 0 0 1 12 4.909c1.69 0 3.218.6 4.418 1.582L19.91 3C17.782 1.145 15.055 0 12 0 7.27 0 3.18 2.73 1.18 6.702l4.086 3.063z"
            />
            <path
              fill="#34A853"
              d="M16.04 15.345c-1.07.728-2.43 1.164-4.04 1.164-3.555 0-6.564-2.4-7.636-5.636L1.244 13.92C3.27 17.92 7.32 20.655 12 20.655c3.08 0 5.864-1.09 7.973-2.955l-3.933-2.355z"
            />
            <path
              fill="#4285F4"
              d="M23.49 12.273c0-.818-.073-1.609-.209-2.373H12v4.582h6.482A5.542 5.542 0 0 1 16.04 15.345l3.933 2.355c2.29-2.11 3.517-5.21 3.517-8.982z"
            />
            <path
              fill="#FBBC05"
              d="M4.364 12.873A7.098 7.098 0 0 1 4.364 11.13L.278 8.067a11.96 11.96 0 0 0 0 7.868l4.086-3.062z"
            />
          </svg>
          <span>Continue with Google</span>
        </button>

        <div className="mt-4.5 text-center text-[10px] text-zinc-500 font-bold">
          {isSignUp ? "Already have an account? " : "New to sync? "}
          <button
            disabled={!isFirebaseConfigured}
            onClick={() => {
              setIsSignUp(!isSignUp);
              setErrorMsg("");
              setSuccessMsg("");
            }}
            className={cn(
              "font-bold transition-colors disabled:opacity-30 cursor-pointer",
              theme === "reflect" && "text-purple-400 hover:text-purple-300",
              theme === "granola" && "text-emerald-400 hover:text-emerald-300",
              theme === "solar" && "text-amber-400 hover:text-amber-300"
            )}
          >
            {isSignUp ? "Sign In instead" : "Create Account"}
          </button>
        </div>

        <div className="mt-5 border-t border-white/5 pt-3.5 text-center font-bold">
          <button
            onClick={onClose}
            className="text-[10px] text-zinc-500 hover:text-zinc-300 transition-colors cursor-pointer"
          >
            Continue in Guest Mode (Offline)
          </button>
        </div>
      </div>
    </div>
  );
};
