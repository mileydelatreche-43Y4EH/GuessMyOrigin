"use client";

import type { AuthProvider } from "@/lib/auth";
import { useLang } from "./LangContext";

type View = "signup" | "login" | "emailForm";

interface Props {
  view: View;
  setView: (v: View) => void;
  name: string;
  setName: (v: string) => void;
  email: string;
  setEmail: (v: string) => void;
  password: string;
  setPassword: (v: string) => void;
  error: string;
  startSocial: (p: AuthProvider) => void;
  startEmail: () => void;
  submitEmail: () => void;
  emailMode: "signup" | "login";
}

export default function AuthCard({
  view,
  setView,
  name,
  setName,
  email,
  setEmail,
  password,
  setPassword,
  error,
  startSocial,
  startEmail,
  submitEmail,
  emailMode,
}: Props) {
  const { t } = useLang();

  const socialButtons = (
    <div className="auth-stack">
      <button
        type="button"
        className="auth-btn google"
        onClick={() => startSocial("google")}
      >
        <GoogleIcon />
        <span>{t.continueGoogle}</span>
      </button>
      <button
        type="button"
        className="auth-btn microsoft"
        onClick={() => startSocial("microsoft")}
      >
        <MicrosoftIcon />
        <span>{t.continueMicrosoft}</span>
      </button>
      <button type="button" className="auth-btn email" onClick={startEmail}>
        <span>{t.continueEmail}</span>
      </button>
    </div>
  );

  return (
    <aside className="auth-modal landing-card sticky-card" id="play">
      {view === "signup" && (
        <>
          <h2>{t.signupTitle}</h2>
          {socialButtons}
          <div className="auth-or">
            <span>{t.or}</span>
          </div>
          <div className="auth-footer-row">
            <span>{t.alreadyAccount}</span>
            <button
              type="button"
              className="auth-login-pill"
              onClick={() => setView("login")}
            >
              {t.logIn}
            </button>
          </div>
        </>
      )}

      {view === "login" && (
        <>
          <h2>{t.loginTitle}</h2>
          {socialButtons}
          <div className="auth-or">
            <span>{t.or}</span>
          </div>
          <div className="auth-footer-row">
            <span>{t.newHere}</span>
            <button
              type="button"
              className="auth-login-pill"
              onClick={() => setView("signup")}
            >
              {t.signUp}
            </button>
          </div>
        </>
      )}

      {view === "emailForm" && (
        <>
          <h2>{emailMode === "signup" ? t.signupEmail : t.loginEmail}</h2>
          {emailMode === "signup" && (
            <label className="auth-field">
              <span>{t.nickLabel}</span>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                maxLength={16}
                placeholder="Ex: Mila"
                autoFocus
              />
            </label>
          )}
          <label className="auth-field">
            <span>{t.email}</span>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@email.com"
              autoFocus={emailMode === "login"}
            />
          </label>
          <label className="auth-field">
            <span>{t.password}</span>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
            />
          </label>
          <button type="button" className="auth-btn primary" onClick={submitEmail}>
            {emailMode === "signup" ? t.createAccount : t.logIn}
          </button>
          <button
            type="button"
            className="auth-back"
            onClick={() => setView(emailMode)}
          >
            {t.back}
          </button>
        </>
      )}

      {error && <p className="auth-error">{error}</p>}
    </aside>
  );
}

/** Logo Google officiel (couleurs G) */
function GoogleIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 48 48" aria-hidden>
      <path
        fill="#EA4335"
        d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
      />
      <path
        fill="#4285F4"
        d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
      />
      <path
        fill="#FBBC05"
        d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"
      />
      <path
        fill="#34A853"
        d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
      />
    </svg>
  );
}

/** Logo Microsoft officiel (4 carrés) */
function MicrosoftIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 21 21" aria-hidden>
      <rect x="1" y="1" width="9" height="9" fill="#F25022" />
      <rect x="11" y="1" width="9" height="9" fill="#7FBA00" />
      <rect x="1" y="11" width="9" height="9" fill="#00A4EF" />
      <rect x="11" y="11" width="9" height="9" fill="#FFB900" />
    </svg>
  );
}
