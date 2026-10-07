"use client";

import { useState } from "react";
import { loginSocial, type AuthProvider, type Session } from "@/lib/auth";
import { useLang } from "./LangContext";
import LangSwitcher from "./LangSwitcher";
import AuthCard from "./AuthCard";
import LandingFooter from "./LandingFooter";

interface Props {
  onAuthed: (session: Session, pendingCode?: string) => void;
}

type View = "signup" | "login" | "socialName";

export default function AuthGate({ onAuthed }: Props) {
  const { t } = useLang();
  const [view, setView] = useState<View>("signup");
  const [provider, setProvider] = useState<AuthProvider>("google");
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [codeDigits, setCodeDigits] = useState(["", "", "", ""]);

  const pendingCode = codeDigits.join("").toUpperCase();

  const finish = (session: Session) => {
    onAuthed(session, pendingCode.length === 4 ? pendingCode : undefined);
  };

  const startSocial = (p: AuthProvider) => {
    setError("");
    setProvider(p);
    setView("socialName");
  };

  const confirmSocial = () => {
    if (!name.trim()) {
      setError("…");
      return;
    }
    finish(loginSocial(provider, name.trim()));
  };

  const onCodeChange = (i: number, v: string) => {
    const ch = v.replace(/[^a-zA-Z0-9]/g, "").slice(-1).toUpperCase();
    const next = [...codeDigits];
    next[i] = ch;
    setCodeDigits(next);
    if (ch && i < 3) {
      document.getElementById(`code-box-${i + 1}`)?.focus();
    }
  };

  const goLogin = () => {
    setError("");
    setView("login");
  };
  const goSignup = () => {
    setError("");
    setView("signup");
  };

  return (
    <main className="landing scroll-landing">
      <header className="landing-nav fixed-nav">
        <div className="landing-nav-left">
          <div className="logo-mark sm" />
          <nav className="landing-links">
            <a href="#explore">{t.navExplore}</a>
            <a href="#friends">{t.navFriends}</a>
            <a href="#compete">{t.navCompete}</a>
            <a href="#orgs">{t.navOrgs}</a>
            <a href="#modes">{t.navModes}</a>
            <a href="#play">{t.navPlay}</a>
          </nav>
        </div>

        <div className="landing-nav-right">
          <LangSwitcher />
          <div className="landing-code">
            <span>{t.code.toUpperCase()}</span>
            <div className="landing-code-boxes">
              {codeDigits.map((d, i) => (
                <input
                  key={i}
                  id={`code-box-${i}`}
                  className="landing-code-box"
                  value={d}
                  maxLength={1}
                  onChange={(e) => onCodeChange(i, e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Backspace" && !codeDigits[i] && i > 0) {
                      document.getElementById(`code-box-${i - 1}`)?.focus();
                    }
                  }}
                  aria-label={`Code digit ${i + 1}`}
                />
              ))}
            </div>
          </div>
          <button type="button" className="auth-nav-login" onClick={goLogin}>
            {t.logIn}
          </button>
          <span className="auth-nav-sep" aria-hidden />
          <button type="button" className="auth-nav-signup" onClick={goSignup}>
            {t.signUp}
          </button>
        </div>
      </header>

      <div className="landing-scroll-layout">
        <div className="landing-sticky-col">
          <div className="landing-signup-sticky">
            <AuthCard
              view={view}
              setView={(v) => {
                setError("");
                setView(v);
              }}
              name={name}
              setName={setName}
              error={error}
              startSocial={startSocial}
              confirmSocial={confirmSocial}
            />
          </div>
        </div>

        <div className="landing-sections">
          {/* —— TEAL : Explore —— */}
          <section className="story-section story-teal" id="explore">
            <div className="story-inner">
              <div className="story-art">
                <svg className="doodle bulb" viewBox="0 0 64 64" aria-hidden>
                  <path
                    d="M32 8c-9 0-16 7-16 16 0 6 3 11 8 14v6h16v-6c5-3 8-8 8-14 0-9-7-16-16-16z"
                    fill="none"
                    stroke="#fff"
                    strokeWidth="3"
                    strokeLinecap="round"
                  />
                  <path d="M26 50h12M28 56h8" stroke="#fff" strokeWidth="3" strokeLinecap="round" />
                  <path d="M32 4v2M14 16l-2-2M50 16l2-2" stroke="#fff" strokeWidth="3" strokeLinecap="round" />
                </svg>
                <svg className="doodle cloud c1" viewBox="0 0 80 40" aria-hidden>
                  <path
                    d="M20 28c-8 0-12-6-10-12 2-6 10-8 16-4 2-6 12-8 18-2 8-2 16 4 14 12H20z"
                    fill="none"
                    stroke="#fff"
                    strokeWidth="2.5"
                  />
                </svg>
                <svg className="doodle cloud c2" viewBox="0 0 80 40" aria-hidden>
                  <path
                    d="M20 28c-8 0-12-6-10-12 2-6 10-8 16-4 2-6 12-8 18-2 8-2 16 4 14 12H20z"
                    fill="none"
                    stroke="#fff"
                    strokeWidth="2.5"
                  />
                </svg>
                <svg className="doodle sign" viewBox="0 0 48 64" aria-hidden>
                  <rect x="20" y="28" width="6" height="32" fill="#fff" opacity="0.9" />
                  <path d="M8 8h28l-4 12 4 12H8l4-12z" fill="none" stroke="#fff" strokeWidth="3" />
                </svg>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="/landing/hero-explorer.png"
                  alt=""
                  className="story-char explorer"
                />
              </div>
              <div className="story-copy">
                <h2>{t.exploreTitle}</h2>
                <p>{t.exploreBody}</p>
              </div>
            </div>
          </section>

          {/* —— BLUE : Friends —— */}
          <section className="story-section story-blue" id="friends">
            <div className="story-inner">
              <div className="story-art">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="/landing/friends-bump.png"
                  alt=""
                  className="story-char friends"
                />
              </div>
              <div className="story-copy">
                <h2>{t.friendsTitle}</h2>
                <p>{t.friendsBody}</p>
              </div>
            </div>
          </section>

          {/* —— PURPLE : Compete / VS —— */}
          <section className="story-section story-purple" id="compete">
            <div className="story-inner">
              <div className="story-art vs-art">
                <div className="vs-bolts" aria-hidden>
                  <span /><span /><span /><span />
                </div>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="/landing/vs-duel.png"
                  alt=""
                  className="story-char vs"
                />
              </div>
              <div className="story-copy">
                <h2>{t.competeTitle}</h2>
                <p>{t.competeBody}</p>
              </div>
            </div>
          </section>

          {/* —— PINK : Organizations —— */}
          <section className="story-section story-pink" id="orgs">
            <div className="story-inner">
              <div className="story-copy top-first">
                <h2>{t.orgsTitle}</h2>
                <p>{t.orgsBody}</p>
                <a href="#play" className="story-outline-btn">
                  {t.readMore}
                </a>
              </div>
              <div className="story-art orgs-art">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="/landing/orgs-crew.png"
                  alt=""
                  className="story-char orgs"
                />
              </div>
            </div>
          </section>

          {/* —— ORANGE : Modes —— */}
          <section className="story-section story-orange" id="modes">
            <div className="story-inner">
              <div className="story-art modes-art">
                <div className="mode-chip">{t.modeStandard}</div>
                <div className="mode-chip hot">{t.modeHardcore}</div>
                <div className="mode-chip wild">{t.modeRandom}</div>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="/landing/hero-explorer.png"
                  alt=""
                  className="story-char explorer small"
                />
              </div>
              <div className="story-copy">
                <h2>{t.modesTitle}</h2>
                <p>{t.modesBody}</p>
              </div>
            </div>
          </section>

          {/* —— RED : CTA —— */}
          <section className="story-section story-red" id="solo">
            <div className="story-inner">
              <div className="story-copy wide">
                <h2>{t.readyTitle}</h2>
                <p>{t.readyBody}</p>
                <button type="button" className="auth-btn primary story-cta" onClick={goSignup}>
                  {t.signUp}
                </button>
              </div>
            </div>
          </section>
        </div>

      </div>

      <LandingFooter />
    </main>
  );
}
