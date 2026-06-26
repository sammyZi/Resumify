'use client'

/**
 * landing-page.tsx — Koyeb-inspired spray paint / airbrush texture landing page.
 *
 * - Navbar floats transparently over hero (no hard border separation)
 * - Hero and navbar share one seamless spray-painted canvas
 * - Background uses SVG airbrush/spray paint blobs, NOT dot grid
 * - Green spray-paint accent strokes integrated into hero
 * - Dark runtime section, workflow steps, CTA banner below
 */

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { BrandLogo } from '@/components/brand-logo'
import styles from './landing-page.module.css'

// ── Small inline icons (replace emojis) ────────────────────────────────────────
function IconBolt() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M13 2 3 14h7l-1 8 10-12h-7z" />
    </svg>
  )
}
function IconCheck() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  )
}
function IconLink() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
      <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
    </svg>
  )
}

const ROLES = ['AI', 'TECH', 'STARTUPS', 'ENGINEERING']

/** Smoothly scroll to an in-page section by id. */
function scrollToSection(e: React.MouseEvent, id: string) {
  const el = document.getElementById(id)
  if (el) {
    e.preventDefault()
    el.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }
}

export function LandingPage() {
  const [activeTab, setActiveTab] = useState(0)

  // ── Typewriter for the rotating hero role word ──────────────────────────────
  const [roleIdx, setRoleIdx] = useState(0)
  const [typed, setTyped] = useState('')
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    const full = ROLES[roleIdx]
    const atFull = typed === full
    let delay = deleting ? 55 : 110
    if (atFull && !deleting) delay = 1400
    if (typed === '' && deleting) delay = 250

    const t = setTimeout(() => {
      if (!deleting) {
        if (typed.length < full.length) {
          setTyped(full.slice(0, typed.length + 1))
        } else {
          setDeleting(true)
        }
      } else {
        if (typed.length > 0) {
          setTyped(full.slice(0, typed.length - 1))
        } else {
          setDeleting(false)
          setRoleIdx((i) => (i + 1) % ROLES.length)
        }
      }
    }, delay)

    return () => clearTimeout(t)
  }, [typed, deleting, roleIdx])

  const tabs = [
    {
      title: 'Spatial PDF Link Parser',
      desc: 'Extract spatial hyperlink layers and associate URLs directly with project titles automatically.',
      code: `// AI Multi-Stage Link Mapper
const parsed = await parseResume({
  file: pdfBuffer,
  extractHyperlinks: true,
  resolveDeepLinks: ['repoUrl', 'liveUrl', 'credentials']
})

console.log(parsed.projects[0].liveUrl)
// → "https://vercel.app/demo-app"`,
    },
    {
      title: 'Semantic ATS Engine',
      desc: 'Instant visual scoring against job descriptions with 100% clean semantic HTML rendering.',
      code: `// Automated ATS Validation
const score = evaluateAtsCompat({
  structure: 'Single-Column Semantic',
  keywordDensity: 0.94,
  actionVerbs: ['Architected', 'Orchestrated', 'Optimized']
})

// ATS Parse Confidence: 100%`,
    },
    {
      title: 'Tokenized Recruiter Views',
      desc: 'Generate tokenized public URLs with zero app chrome, print-ready CSS rules, and instant PDF downloads.',
      code: `// Tokenized Public Link Generation
const share = await createShareToken({
  resumeId: "res_8f92a4",
  expiresIn: "30d",
  allowPdfPrint: true
})

// Public URL: https://resumify.app/s/rec_92f10b`,
    },
  ]

  return (
    <div className={styles.container}>

      {/* --- HERO + NAVBAR UNIFIED KOYEB SECTION --- */}
      <div className={styles.heroWrapper}>

        {/* Koyeb Exact Background Wireframe Globe & Paint Washes */}
        <svg className={styles.sprayBg} viewBox="0 0 1440 900" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMidYMid slice">
          <filter id="noiseFilter">
            <feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="1" stitchTiles="stitch" />
            <feColorMatrix type="matrix" values="1 0 0 0 0, 0 1 0 0 0, 0 0 1 0 0, 0 0 0 0.04 0" />
          </filter>

          {/* Dry-brush filter: rough displaced edges + bristle streaks */}
          <filter id="brush" x="-15%" y="-15%" width="130%" height="130%">
            {/* roughen the outline */}
            <feTurbulence type="fractalNoise" baseFrequency="0.016 0.024" numOctaves="2" seed="7" result="rough" />
            <feDisplacementMap in="SourceGraphic" in2="rough" scale="26" xChannelSelector="R" yChannelSelector="G" result="disp" />
            {/* carve horizontal bristle gaps along the stroke */}
            <feTurbulence type="fractalNoise" baseFrequency="0.9 0.018" numOctaves="1" seed="3" result="bristle" />
            <feColorMatrix in="bristle" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 -1.35 1.05" result="bristleA" />
            <feComposite in="disp" in2="bristleA" operator="in" />
          </filter>

          {/* Base off-white paper canvas */}
          <rect width="1440" height="900" fill="#f2efe9" />
          <rect width="1440" height="900" filter="url(#noiseFilter)" opacity="0.6" />

          {/* Soft background light gradient */}
          <radialGradient id="globeLight" cx="50%" cy="45%" r="50%">
            <stop offset="0%" stopColor="#ffffff" stopOpacity="0.8" />
            <stop offset="100%" stopColor="#f2efe9" stopOpacity="0" />
          </radialGradient>
          <circle cx="720" cy="450" r="480" fill="url(#globeLight)" />

          {/* Stroke gradients fade at both ends → tapered brush lift-off */}
          <linearGradient id="fadeAmber" gradientUnits="userSpaceOnUse" x1="-80" y1="0" x2="1540" y2="0">
            <stop offset="0%" stopColor="#166534" stopOpacity="0" />
            <stop offset="14%" stopColor="#166534" stopOpacity="0.9" />
            <stop offset="50%" stopColor="#16a34a" stopOpacity="0.9" />
            <stop offset="82%" stopColor="#4ade80" stopOpacity="0.85" />
            <stop offset="100%" stopColor="#4ade80" stopOpacity="0" />
          </linearGradient>
          <linearGradient id="fadeTerra" gradientUnits="userSpaceOnUse" x1="-80" y1="0" x2="1540" y2="0">
            <stop offset="0%" stopColor="#0d9488" stopOpacity="0" />
            <stop offset="16%" stopColor="#0d9488" stopOpacity="0.85" />
            <stop offset="55%" stopColor="#14b8a6" stopOpacity="0.85" />
            <stop offset="84%" stopColor="#2dd4bf" stopOpacity="0.8" />
            <stop offset="100%" stopColor="#2dd4bf" stopOpacity="0" />
          </linearGradient>
          <linearGradient id="fadeMint" gradientUnits="userSpaceOnUse" x1="-60" y1="0" x2="1540" y2="0">
            <stop offset="0%" stopColor="#047857" stopOpacity="0" />
            <stop offset="15%" stopColor="#047857" stopOpacity="0.85" />
            <stop offset="52%" stopColor="#10b981" stopOpacity="0.85" />
            <stop offset="83%" stopColor="#00F27A" stopOpacity="0.8" />
            <stop offset="100%" stopColor="#6ee7b7" stopOpacity="0" />
          </linearGradient>
          <linearGradient id="fadeLime" gradientUnits="userSpaceOnUse" x1="80" y1="0" x2="1540" y2="0">
            <stop offset="0%" stopColor="#3f6212" stopOpacity="0" />
            <stop offset="18%" stopColor="#65a30d" stopOpacity="0.8" />
            <stop offset="60%" stopColor="#84cc16" stopOpacity="0.75" />
            <stop offset="86%" stopColor="#a3e635" stopOpacity="0.7" />
            <stop offset="100%" stopColor="#a3e635" stopOpacity="0" />
          </linearGradient>

          {/* Painterly dry-brush strokes */}
          <g filter="url(#brush)">
            <path d="M -90 250 Q 360 150 760 285 T 1560 220"
              stroke="url(#fadeAmber)" strokeWidth="34" strokeLinecap="round" fill="none" opacity="0.55" />
            <path d="M -90 372 Q 430 312 840 392 T 1560 350"
              stroke="url(#fadeTerra)" strokeWidth="22" strokeLinecap="round" fill="none" opacity="0.5" />
            <path d="M -70 648 Q 500 730 1000 600 T 1560 690"
              stroke="url(#fadeMint)" strokeWidth="30" strokeLinecap="round" fill="none" opacity="0.5" />
            <path d="M 80 824 Q 520 762 1000 846 T 1540 802"
              stroke="url(#fadeLime)" strokeWidth="18" strokeLinecap="round" fill="none" opacity="0.42" />
            <path d="M -60 500 Q 420 560 900 470 T 1560 520"
              stroke="url(#fadeTerra)" strokeWidth="14" strokeLinecap="round" fill="none" opacity="0.32" />
          </g>

          {/* Vignette fade at top */}
          <linearGradient id="topFade" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#f2efe9" stopOpacity="0.4" />
            <stop offset="100%" stopColor="#f2efe9" stopOpacity="0" />
          </linearGradient>
          <rect width="1440" height="150" fill="url(#topFade)" />
        </svg>

        {/* --- Koyeb Exact Navbar --- */}
        <nav className={styles.navbar}>
          <Link href="/" className={styles.navLeft}>
            <BrandLogo size={24} />
            <span className={styles.brandName}>Resumify</span>
          </Link>

          <div className={styles.navMiddlePill}>
            <a href="#features" className={styles.navLink} onClick={(e) => scrollToSection(e, 'features')}>FEATURES</a>
            <a href="#workflow" className={styles.navLink} onClick={(e) => scrollToSection(e, 'workflow')}>HOW IT WORKS</a>
            <a href="https://github.com/sammyZi/Resumify" target="_blank" rel="noopener noreferrer" className={styles.navLink}>OPEN SOURCE</a>
            <a href="#contact" className={styles.navLink} onClick={(e) => scrollToSection(e, 'contact')}>CONTACT</a>
          </div>

          <div className={styles.navRight}>
            <Link href="/login" className={styles.loginBtn}>▸ LOGIN ◂</Link>
            <Link href="/login" className={styles.signupBtn}>
              <span>▸</span> SIGN UP
            </Link>
          </div>
        </nav>

        {/* --- Koyeb Exact Centered Hero --- */}
        <section className={styles.hero}>
          <div className={styles.heroContent}>
            <h1 className={styles.heroTitle}>
              AI-POWERED<br />RESUME BUILDER<br />
              <span className={styles.heroRoleLine}>
                FOR <span className={styles.typedWord}>{typed}</span>
                <span className={styles.blinkingBar} aria-hidden="true" />
              </span>
            </h1>

            <p className={styles.heroSubtitle}>
              Craft tailored developer resumes across AI, Tech, and Engineering in minutes - verify credentials &amp; extract links
            </p>

            <div className={styles.heroActions}>
              <Link href="/login" className={styles.btnPrimary}>
                <span className={styles.btnTriangle}>▸</span> GET STARTED
              </Link>
              <a
                href="https://github.com/sammyZi/Resumify"
                target="_blank"
                rel="noopener noreferrer"
                className={styles.btnSecondary}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" style={{ marginRight: 6, verticalAlign: '-2px' }}>
                  <path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23a11.5 11.5 0 0 1 3.003-.404c1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.652.242 2.873.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222 0 1.606-.014 2.898-.014 3.293 0 .322.216.694.825.576C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12" />
                </svg>
                OPEN SOURCE
              </a>
            </div>
          </div>
        </section>
      </div>
      {/* --- END HERO WRAPPER --- */}


      {/* --- Features Grid --- */}
      <section id="features" className={styles.featuresSection}>
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>NEXT-GENERATION RESUME EXPERIENCE</h2>
          <p className={styles.sectionSubtitle}>
            No templates. No friction. Sitting directly on the canvas, separated only by sharp structural grid lines.
          </p>
        </div>

        <div className={styles.gridRow}>
          <div className={styles.gridCol}>
            <div className={styles.gridColTop}>
              <span>01 / SPATIAL AI</span>
              <span style={{ color: '#10b981' }}><IconBolt /></span>
            </div>
            <div className={styles.gridGraphic}>
              <span>&quot;ChatApp&quot;</span> → <span style={{ color: '#047857', fontWeight: 800 }}>github.com/user/chat</span>
            </div>
            <h3 className={styles.gridColTitle}>Deep Hyperlink Extraction</h3>
            <p className={styles.gridColDesc}>
              Standard parsers lose clickable URLs. Resumify extracts PDF spatial annotation layers and matches them to your project titles.
            </p>
          </div>

          <div className={styles.gridCol}>
            <div className={styles.gridColTop}>
              <span>02 / CREDENTIALS</span>
              <span style={{ color: '#0284c7' }}><IconCheck /></span>
            </div>
            <div className={styles.gridGraphic}>
              <span style={{ color: '#0284c7', fontWeight: 800 }}>Credly Verified Badge</span>
            </div>
            <h3 className={styles.gridColTitle}>Instant Credential Linking</h3>
            <p className={styles.gridColDesc}>
              Add license numbers, issue dates, and Credly verification links directly alongside your certifications.
            </p>
          </div>

          <div className={styles.gridCol}>
            <div className={styles.gridColTop}>
              <span>03 / ATS ENGINE</span>
              <span style={{ color: '#7c3aed' }}>100%</span>
            </div>
            <div className={styles.gridGraphic}>
              <span style={{ color: '#047857', fontWeight: 800 }}>Single-Column Semantic HTML</span>
            </div>
            <h3 className={styles.gridColTitle}>Guaranteed ATS Parsing</h3>
            <p className={styles.gridColDesc}>
              Built with strict semantic structures that corporate recruiting screening bots parse with zero errors.
            </p>
          </div>

          <div className={styles.gridCol}>
            <div className={styles.gridColTop}>
              <span>04 / DEEP LINKS</span>
              <span style={{ color: '#e11d48' }}><IconLink /></span>
            </div>
            <div className={styles.gridGraphic}>
              <span style={{ color: '#111', fontWeight: 800 }}>[Live Demo] [GitHub Repo]</span>
            </div>
            <h3 className={styles.gridColTitle}>Live Project Buttons</h3>
            <p className={styles.gridColDesc}>
              Render distinct Live and Code buttons next to project titles on screen and in printable PDF exports.
            </p>
          </div>
        </div>
      </section>


      {/* ── Dark Carbon Runtime Section ───────────────────────────────── */}
      <section id="runtime" className={styles.darkSection}>
        <div className={styles.darkInner}>
          <div>
            <div className={styles.darkEyebrow}>// THE INTELLIGENT RUNTIME</div>
            <h2 className={styles.darkTitle}>ENGINEERED FOR PRECISION</h2>

            <div className={styles.darkTabList}>
              {tabs.map((tab, idx) => (
                <div
                  key={idx}
                  className={`${styles.darkTab} ${activeTab === idx ? styles.darkTabActive : ''}`}
                  onClick={() => setActiveTab(idx)}
                >
                  <div className={styles.darkTabTitle}>
                    <span style={{ color: activeTab === idx ? '#10b981' : '#555' }}>▶</span>
                    <span>{tab.title}</span>
                  </div>
                  <p className={styles.darkTabDesc}>{tab.desc}</p>
                </div>
              ))}
            </div>
          </div>

          <div className={styles.darkStage}>
            <div className={styles.darkStageHeader}>
              <span style={{ color: '#10b981' }}>●</span> live_preview_stage.ts
            </div>
            <pre className={styles.darkCode}>{tabs[activeTab].code}</pre>
          </div>
        </div>

        <div className={styles.statsRow}>
          <div className={styles.statCol}>
            <div className={styles.statNumber}>100%</div>
            <div className={styles.statLabel}>ATS Compatible</div>
          </div>
          <div className={styles.statCol}>
            <div className={styles.statNumber}>&lt;2500MS</div>
            <div className={styles.statLabel}>AI Link Extraction</div>
          </div>
          <div className={styles.statCol}>
            <div className={styles.statNumber}>10+</div>
            <div className={styles.statLabel}>Modern Templates</div>
          </div>
          <div className={styles.statCol}>
            <div className={styles.statNumber}>100K+</div>
            <div className={styles.statLabel}>Resumes Built</div>
          </div>
        </div>
      </section>


      {/* ── Workflow Steps ─────────────────────────────────────────────── */}
      <section id="workflow" className={styles.stepsSection}>
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>DEPLOY IN PRODUCTION WITH ONE-CLICK</h2>
          <p className={styles.sectionSubtitle}>From outdated PDF to clickable live URL in under two minutes.</p>
        </div>

        <div className={styles.stepsGridRow}>
          <div className={styles.stepCol}>
            <div className={styles.stepNumber}>1</div>
            <h3 className={styles.stepTitle}>Import Resume</h3>
            <p className={styles.stepDesc}>
              Drop any PDF. Our multi-layer AI parser inspects both text content and hidden hyperlink annotations.
            </p>
          </div>
          <div className={styles.stepCol}>
            <div className={styles.stepNumber}>2</div>
            <h3 className={styles.stepTitle}>Refine &amp; Verify</h3>
            <p className={styles.stepDesc}>
              Add Credly verification URLs, categorize project repositories, and let AI tailor bullet points.
            </p>
          </div>
          <div className={styles.stepCol}>
            <div className={styles.stepNumber}>3</div>
            <h3 className={styles.stepTitle}>Choose Template</h3>
            <p className={styles.stepDesc}>
              Switch between 10+ professional layouts. Classic single-column or sidebar layouts with live links.
            </p>
          </div>
          <div className={styles.stepCol}>
            <div className={styles.stepNumber}>4</div>
            <h3 className={styles.stepTitle}>Export &amp; Share</h3>
            <p className={styles.stepDesc}>
              Download ATS-optimized PDFs with clickable links or share instant public recruiter links.
            </p>
          </div>
        </div>
      </section>


      {/* ── CTA Banner ─────────────────────────────────────────────────── */}
      <section className={styles.ctaBanner}>
        <h2 className={styles.ctaTitle}>
          EVERYTHING YOU NEED TO LAND YOUR NEXT ENGINEERING ROLE
        </h2>
        <Link href="/login" className={styles.ctaBtn}>
          GET STARTED FOR FREE →
        </Link>
      </section>

      {/* ── Footer (green) ─────────────────────────────────────────────── */}
      <footer id="contact" className={styles.footer}>
        <div className={styles.footerInner}>
          <div className={styles.footerBrandCol}>
            <div className={styles.footerBrand}>Resumify</div>
            <p className={styles.footerTagline}>
              Build ATS-ready developer resumes with AI — clickable links, clean templates, instant PDF.
            </p>
            <a
              href="https://github.com/sammyZi/Resumify"
              target="_blank"
              rel="noopener noreferrer"
              className={styles.footerSourceBtn}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                <path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23a11.5 11.5 0 0 1 3.003-.404c1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.652.242 2.873.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222 0 1.606-.014 2.898-.014 3.293 0 .322.216.694.825.576C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12" />
              </svg>
              Star on GitHub
            </a>
          </div>

          <div className={styles.footerCol}>
            <h4 className={styles.footerColTitle}>Product</h4>
            <ul className={styles.footerList}>
              <li><Link href="/login">Get started</Link></li>
              <li><a href="#features" onClick={(e) => scrollToSection(e, 'features')}>Features</a></li>
              <li><a href="#workflow" onClick={(e) => scrollToSection(e, 'workflow')}>How it works</a></li>
            </ul>
          </div>

          <div className={styles.footerCol}>
            <h4 className={styles.footerColTitle}>Legal</h4>
            <ul className={styles.footerList}>
              <li><Link href="/privacy">Privacy Policy</Link></li>
            </ul>
          </div>

          <div className={styles.footerCol}>
            <h4 className={styles.footerColTitle}>Connect</h4>
            <ul className={styles.footerList}>
              <li><a href="https://github.com/sammyZi" target="_blank" rel="noopener noreferrer">GitHub</a></li>
              <li><a href="https://www.linkedin.com/in/samarth-bhinge/" target="_blank" rel="noopener noreferrer">LinkedIn</a></li>
              <li><a href="https://www.instagram.com/sammyi_57/" target="_blank" rel="noopener noreferrer">Instagram</a></li>
              <li><a href="mailto:bhingesamarth@gmail.com">Email Me</a></li>
            </ul>
          </div>
        </div>

        <div className={styles.footerBottom}>
          <span>© {new Date().getFullYear()} Resumify. Built by Samarth Bhinge.</span>
          <Link href="/privacy">Privacy Policy</Link>
        </div>
      </footer>
    </div>
  )
}