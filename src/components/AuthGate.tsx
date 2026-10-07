"use client";

import { useEffect, useState } from "react";
import {
  loginEmail,
  loginSocial,
  signupEmail,
  type AuthProvider,
  type Session,
} from "@/lib/auth";
import { useLang } from "./LangContext";
import LangSwitcher from "./LangSwitcher";
import AuthCard from "./AuthCard";
import BrandLogo from "./BrandLogo";
import LandingFooter from "./LandingFooter";

interface Props {
  onAuthed: (session: Session, pendingCode?: string) => void;
}

type View = "signup" | "login" | "emailForm";

export default function AuthGate({ onAuthed }: Props) {
  const { t } = useLang();
  const [view, setView] = useState<View>("signup");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [emailMode, setEmailMode] = useState<"signup" | "login">("signup");
  const [error, setError] = useState("");
  const [codeDigits, setCodeDigits] = useState(["", "", "", ""]);

  useEffect(() => {
    const sections = document.querySelectorAll<HTMLElement>(".story-section");
    if (!sections.length) return;

    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            entry.target.classList.add("story-in");
          }
        }
      },
      { threshold: 0.28, rootMargin: "0px 0px -8% 0px" }
    );

    sections.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);

  const pendingCode = codeDigits.join("").toUpperCase();

  const finish = (session: Session) => {
    onAuthed(session, pendingCode.length === 4 ? pendingCode : undefined);
  };

  const startSocial = (p: AuthProvider) => {
    setError("");
    const saved =
      (typeof window !== "undefined" && localStorage.getItem("guessmyorigin_name")) ||
      "";
    const nick =
      saved.trim().slice(0, 16) ||
      (p === "google" ? "Google" : p === "microsoft" ? "Microsoft" : "Player");
    finish(loginSocial(p, nick));
  };

  const startEmail = () => {
    setError("");
    setEmailMode(view === "login" ? "login" : "signup");
    setView("emailForm");
  };

  const submitEmail = () => {
    setError("");
    if (emailMode === "signup") {
      const res = signupEmail(email, password, name);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      finish(res.session);
      return;
    }
    const res = loginEmail(email, password);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    finish(res.session);
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
          <a href="#play" className="nav-brand" aria-label="GuessMyOrigin">
            <BrandLogo size="sm" priority />
          </a>
          <nav className="landing-links">
            <a href="#explore">{t.navExplore}</a>
            <a href="#friends">{t.navFriends}</a>
            <a href="#compete">{t.navCompete}</a>
            <a href="#orgs">{t.navOrgs}</a>
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
              email={email}
              setEmail={setEmail}
              password={password}
              setPassword={setPassword}
              error={error}
              startSocial={startSocial}
              startEmail={startEmail}
              submitEmail={submitEmail}
              emailMode={emailMode}
            />
          </div>
        </div>

        <div className="landing-sections">
          {/* —— VIOLET : Hero GeoGuessr (pin) —— */}
          <section className="story-section story-hero-violet story-hero" id="explore">
            <div className="story-inner story-hero-inner">
              <div className="story-copy story-hero-copy">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="/logo.png"
                  alt=""
                  className="hero-pin"
                  width={200}
                  height={200}
                  draggable={false}
                  decoding="async"
                  fetchPriority="high"
                />
                <div className="hero-brand">
                  <span className="hero-brand-text">GuessMyOrigin</span>
                </div>
                <h1 className="story-title hero-title">{t.exploreTitle}</h1>
                <p className="story-body">{t.exploreBody}</p>
              </div>
            </div>
          </section>

          {/* —— TEAL : Explore + bonhomme (titre, texte en dessous, image) —— */}
          <section className="story-section story-teal" id="explore-more">
            <div className="story-deco story-deco-chalk" aria-hidden>
              <svg className="doodle chalk-bulb" viewBox="0 0 80 90" fill="none">
                <path
                  d="M40 8c-14 1-24 13-23 27 1 9 6 15 12 20v8c0 2 1 4 4 4h14c3 0 4-2 4-4v-8c7-5 12-12 12-21C64 20 54 8 40 8z"
                  stroke="#fff"
                  strokeWidth="3.2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  vectorEffect="non-scaling-stroke"
                />
                <path d="M32 68h16M34 74h12M36 80h8" stroke="#fff" strokeWidth="3" strokeLinecap="round" />
                <path d="M40 28v14M33 35h14" stroke="#fff" strokeWidth="2.6" strokeLinecap="round" />
                <path
                  d="M40 4v5M18 18l4 4M62 18l-4 4M12 40h5M63 40h5M20 58l4-3M60 58l-4-3"
                  stroke="#fff"
                  strokeWidth="2.8"
                  strokeLinecap="round"
                />
              </svg>
              <svg className="doodle chalk-cloud c1" viewBox="0 0 100 50" fill="none">
                <path
                  d="M22 36c-10 0-16-7-14-14 2-7 10-10 17-6 3-8 14-11 22-4 3-3 9-4 13-1 9-3 18 3 17 12H22z"
                  stroke="rgba(10,70,65,0.55)"
                  strokeWidth="2.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              <svg className="doodle chalk-cloud c2" viewBox="0 0 100 50" fill="none">
                <path
                  d="M24 34c-9 1-15-6-13-13 2-6 9-9 15-5 3-7 13-10 20-3 4-3 10-4 14-1 8-2 16 4 15 11H24z"
                  stroke="rgba(255,255,255,0.55)"
                  strokeWidth="2.6"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              <svg className="doodle chalk-star" viewBox="0 0 40 40" fill="none">
                <path
                  d="M20 4l3 10 10 3-10 3-3 10-3-10-10-3 10-3z"
                  stroke="#fff"
                  strokeWidth="2.4"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
            <div className="story-inner story-stack">
              <div className="story-copy">
                <h2 className="story-title">{t.exploreTitle}</h2>
                <p className="story-body">{t.exploreBody}</p>
              </div>
              <div className="story-art story-art-below">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="/landing/hero-explorer.png"
                  alt=""
                  className="story-char explorer"
                />
              </div>
            </div>
          </section>

          {/* —— BLUE : Friends (titre, texte en dessous, image) —— */}
          <section className="story-section story-blue" id="friends">
            <div className="story-inner story-stack">
              <div className="story-copy">
                <h2 className="story-title">{t.friendsTitle}</h2>
                <p className="story-body">{t.friendsBody}</p>
              </div>
              <div className="story-art story-art-below">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="/landing/friends-bump.png"
                  alt=""
                  className="story-char friends"
                />
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
                <h2 className="story-title">{t.competeTitle}</h2>
                <p className="story-body">{t.competeBody}</p>
              </div>
            </div>
          </section>

          {/* —— PINK : Organizations (image puis texte en dessous) —— */}
          <section className="story-section story-pink" id="orgs">
            <div className="story-inner story-stack story-stack-art-first">
              <div className="story-art orgs-art story-art-fill">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="/landing/orgs-crew.png"
                  alt=""
                  className="story-char orgs"
                />
              </div>
              <div className="story-copy">
                <h2 className="story-title">{t.orgsTitle}</h2>
                <p className="story-body">{t.orgsBody}</p>
                <a href="#play" className="story-outline-btn story-after">
                  {t.readMore}
                </a>
              </div>
            </div>
          </section>

          {/* —— CTA finale —— */}
          <section className="story-section story-cta-band" id="solo">
            <div className="story-inner">
              <div className="story-copy wide">
                <h2 className="story-title">{t.readyTitle}</h2>
                <p className="story-body">{t.readyBody}</p>
                <button
                  type="button"
                  className="story-cta-btn story-after"
                  onClick={goSignup}
                >
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
