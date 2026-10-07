"use client";

import { useState } from "react";
import BrandLogo from "./BrandLogo";
import { useLang } from "./LangContext";

export default function LandingFooter() {
  const { t } = useLang();
  const [open, setOpen] = useState<number | null>(0);

  const explore = [
    { label: t.footerPricing, href: "#pricing" },
    { label: t.footerWho, href: "#about" },
    { label: t.footerWhat, href: "#what" },
    { label: t.footerOrgs, href: "#orgs" },
    { label: t.footerPlay, href: "#play" },
  ];

  const faqs = [
    { q: t.faq1q, a: t.faq1a },
    { q: t.faq2q, a: t.faq2a },
    { q: t.faq3q, a: t.faq3a },
    { q: t.faq4q, a: t.faq4a },
    { q: t.faq5q, a: t.faq5a },
    { q: t.faq6q, a: t.faq6a },
  ];

  return (
    <footer className="site-footer" id="about">
      <div className="site-footer-inner">
        <div className="footer-brand">
          <div className="footer-wordmark" aria-label="GuessMyOrigin">
            <BrandLogo size="md" />
            <span className="footer-wordmark-text">GuessMyOrigin</span>
          </div>
          <p className="footer-address">
            Origin Labs SAS
            <br />
            42 Rue du Pin Rouge
            <br />
            75000 Faceville, France
          </p>
          <p className="footer-copy">© {new Date().getFullYear()} Origin Labs SAS</p>
        </div>

        <div className="footer-col" id="pricing">
          <h3>{t.footerExplore}</h3>
          <ul>
            {explore.map((l) => (
              <li key={l.href}>
                <a href={l.href}>{l.label}</a>
              </li>
            ))}
          </ul>
        </div>

        <div className="footer-col footer-faq" id="what">
          <h3>{t.footerFaq}</h3>
          <ul className="faq-list">
            {faqs.map((item, i) => {
              const isOpen = open === i;
              return (
                <li key={item.q} className={isOpen ? "open" : ""}>
                  <button
                    type="button"
                    className="faq-q"
                    aria-expanded={isOpen}
                    onClick={() => setOpen(isOpen ? null : i)}
                  >
                    <span>{item.q}</span>
                    <span className="faq-plus" aria-hidden>
                      {isOpen ? "−" : "+"}
                    </span>
                  </button>
                  <div
                    className="faq-panel"
                    style={{
                      gridTemplateRows: isOpen ? "1fr" : "0fr",
                    }}
                  >
                    <div className="faq-panel-inner">
                      <p className="faq-a">{item.a}</p>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      </div>
    </footer>
  );
}
