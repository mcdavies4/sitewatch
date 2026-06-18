import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Sitewatch — maintenance & compliance for care settings",
  description:
    "Every maintenance job in one list, reminders before anything's due, and a timestamped photo to prove each check done. Always inspection-ready.",
};

const css = `
.lp :root{}
.lp{--paper:#F7F8FA;--ink:#14201E;--muted:#5B6B68;--brand:#0E5C55;--bright:#12B0A0;--overdue:#DC2626;--done:#15803D;--line:#E6E9EE;--card:#FFFFFF;color:var(--ink);}
.lp *{box-sizing:border-box;}
.lp .wrap{max-width:1060px;margin:0 auto;padding:0 24px;}
.lp h1,.lp h2,.lp h3{font-family:"Space Grotesk",system-ui,sans-serif;letter-spacing:-0.02em;line-height:1.08;margin:0;}
.lp a{color:inherit;}
.lp :focus-visible{outline:2px solid var(--brand);outline-offset:3px;border-radius:6px;}
@media (prefers-reduced-motion:reduce){.lp *{animation:none!important;transition:none!important;}}
.lp nav{position:sticky;top:0;z-index:20;background:rgba(247,248,250,.85);backdrop-filter:blur(8px);border-bottom:1px solid var(--line);}
.lp .nav-in{display:flex;align-items:center;justify-content:space-between;height:64px;}
.lp .logo{display:flex;align-items:center;gap:9px;font-family:"Space Grotesk";font-weight:700;font-size:1.15rem;letter-spacing:-0.02em;}
.lp .mark{width:30px;height:30px;border-radius:8px;background:var(--brand);display:grid;place-items:center;flex:0 0 auto;}
.lp .nav-actions{display:flex;align-items:center;gap:18px;}
.lp .nav-actions a.signin{font-size:.95rem;color:var(--muted);text-decoration:none;font-weight:500;}
.lp .btn{display:inline-flex;align-items:center;justify-content:center;gap:8px;font-weight:600;font-size:.95rem;text-decoration:none;border-radius:11px;padding:10px 18px;border:1px solid transparent;cursor:pointer;transition:transform .12s ease,background .15s ease;}
.lp .btn-primary{background:var(--brand);color:#fff;}
.lp .btn-primary:hover{background:#0a4a44;transform:translateY(-1px);}
.lp .btn-ghost{background:transparent;border-color:var(--line);color:var(--ink);}
.lp .btn-ghost:hover{border-color:var(--brand);color:var(--brand);}
.lp .hero{padding:84px 0 72px;}
.lp .hero-grid{display:grid;grid-template-columns:1.05fr .95fr;gap:56px;align-items:center;}
.lp .eyebrow{display:inline-flex;align-items:center;gap:8px;font-size:.8rem;font-weight:600;letter-spacing:.04em;text-transform:uppercase;color:var(--brand);margin-bottom:22px;}
.lp .eyebrow::before{content:"";width:18px;height:2px;background:var(--bright);border-radius:2px;}
.lp h1{font-size:clamp(2.3rem,5.2vw,3.5rem);font-weight:700;}
.lp .hero p.sub{font-size:1.15rem;color:var(--muted);margin:22px 0 0;max-width:34ch;}
.lp .hero-cta{display:flex;gap:12px;margin-top:34px;flex-wrap:wrap;}
.lp .trust{margin-top:26px;font-size:.9rem;color:var(--muted);display:flex;align-items:center;gap:8px;}
.lp .trust svg{flex:0 0 auto;}
.lp .stack{display:flex;flex-direction:column;gap:12px;}
.lp .tcard{position:relative;background:var(--card);border:1px solid var(--line);border-radius:14px;padding:16px 16px 16px 20px;overflow:hidden;box-shadow:0 1px 0 rgba(20,32,30,.03),0 12px 30px -18px rgba(20,32,30,.25);opacity:0;transform:translateY(14px);animation:lprise .6s cubic-bezier(.2,.7,.2,1) forwards;}
.lp .tcard:nth-child(1){animation-delay:.05s;}
.lp .tcard:nth-child(2){animation-delay:.18s;}
.lp .tcard:nth-child(3){animation-delay:.31s;}
@keyframes lprise{to{opacity:1;transform:translateY(0);}}
.lp .rail{position:absolute;left:0;top:0;height:100%;width:4px;}
.lp .tcard .top{display:flex;justify-content:space-between;align-items:flex-start;gap:12px;}
.lp .tcard .title{font-weight:600;font-size:.98rem;}
.lp .tcard .meta{display:flex;gap:6px;margin-top:11px;}
.lp .chip{font-size:.74rem;font-weight:500;color:var(--muted);background:var(--paper);border-radius:6px;padding:2px 8px;}
.lp .pill{font-size:.74rem;font-weight:600;border-radius:7px;padding:3px 9px;white-space:nowrap;}
.lp .pill.over{background:rgba(220,38,38,.1);color:var(--overdue);}
.lp .pill.due{background:var(--paper);color:var(--muted);}
.lp .pill.done{background:rgba(21,128,61,.1);color:var(--done);}
.lp .photo{display:flex;align-items:center;gap:8px;margin-top:12px;}
.lp .thumb{width:42px;height:42px;border-radius:9px;background:linear-gradient(135deg,#1c6e66,#12B0A0 70%);display:grid;place-items:center;flex:0 0 auto;}
.lp .photo small{font-size:.78rem;color:var(--muted);}
.lp section.band{padding:76px 0;}
.lp .lede{max-width:30ch;}
.lp .kicker{font-size:.8rem;font-weight:600;letter-spacing:.05em;text-transform:uppercase;color:var(--brand);margin-bottom:14px;}
.lp h2{font-size:clamp(1.7rem,3.6vw,2.4rem);font-weight:700;}
.lp .problem{border-top:1px solid var(--line);border-bottom:1px solid var(--line);background:#fff;}
.lp .prob-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:30px;}
.lp .prob h3{font-size:1.05rem;font-weight:600;margin-bottom:6px;}
.lp .prob p{margin:0;color:var(--muted);font-size:.96rem;}
.lp .prob .bar{width:26px;height:3px;border-radius:3px;background:var(--overdue);margin-bottom:16px;opacity:.85;}
.lp .feat-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:18px;margin-top:46px;}
.lp .feature{position:relative;background:#fff;border:1px solid var(--line);border-radius:16px;padding:26px 24px 24px;overflow:hidden;}
.lp .feature .frail{position:absolute;left:0;top:0;height:100%;width:4px;background:var(--brand);}
.lp .feature h3{font-size:1.18rem;font-weight:600;margin-bottom:9px;}
.lp .feature p{margin:0;color:var(--muted);font-size:.97rem;}
.lp .ficon{width:38px;height:38px;border-radius:10px;background:rgba(14,92,85,.08);display:grid;place-items:center;margin-bottom:16px;}
.lp .ready{background:var(--brand);color:#fff;}
.lp .ready h2{color:#fff;max-width:18ch;}
.lp .ready p{color:rgba(255,255,255,.82);font-size:1.12rem;margin:18px 0 0;max-width:52ch;}
.lp .ready .accent{color:#7df0df;}
.lp .steps{display:grid;grid-template-columns:repeat(3,1fr);gap:22px;margin-top:46px;}
.lp .step .num{font-family:"Space Grotesk";font-weight:700;font-size:.95rem;color:var(--bright);letter-spacing:.04em;}
.lp .step .line{height:1px;background:var(--line);margin:14px 0 16px;}
.lp .step h3{font-size:1.1rem;font-weight:600;margin-bottom:8px;}
.lp .step p{margin:0;color:var(--muted);font-size:.96rem;}
.lp .final{text-align:center;}
.lp .final h2{max-width:20ch;margin:0 auto;}
.lp .final p{color:var(--muted);font-size:1.1rem;margin:16px auto 0;max-width:46ch;}
.lp .final .btn{margin-top:30px;padding:14px 26px;font-size:1.02rem;}
.lp footer{border-top:1px solid var(--line);background:#fff;}
.lp .foot{display:flex;justify-content:space-between;align-items:center;height:74px;flex-wrap:wrap;gap:10px;}
.lp .foot .logo{font-size:1rem;}
.lp .foot small{color:var(--muted);font-size:.85rem;}
@media (max-width:860px){
.lp .hero-grid{grid-template-columns:1fr;gap:40px;}
.lp .hero{padding:56px 0 48px;}
.lp .hero p.sub{max-width:none;}
.lp .prob-grid,.lp .feat-grid,.lp .steps{grid-template-columns:1fr;}
.lp .feat-grid{gap:12px;}
.lp section.band{padding:56px 0;}
.lp .nav-actions a.signin{display:none;}
}
`;

export default async function Home() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user) redirect("/tasks");

  return (
    <div className="lp">
      <style dangerouslySetInnerHTML={{ __html: css }} />

      <nav>
        <div className="wrap nav-in">
          <div className="logo">
            <span className="mark" aria-hidden="true">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                <path d="M7 12l3 3 7-8" stroke="#12B0A0" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </span>
            Sitewatch
          </div>
          <div className="nav-actions">
            <a className="signin" href="/login">Sign in</a>
            <a className="btn btn-primary" href="/login">Get started</a>
          </div>
        </div>
      </nav>

      <header className="hero">
        <div className="wrap hero-grid">
          <div>
            <span className="eyebrow">Maintenance &amp; compliance · care settings</span>
            <h1>Never fail an inspection on a missed check.</h1>
            <p className="sub">Sitewatch keeps every maintenance job — statutory checks, staff reports, the jobs managers hand you — in one list, reminds you before anything&apos;s due, and proves each one done with a timestamped photo.</p>
            <div className="hero-cta">
              <a className="btn btn-primary" href="/login">Get started</a>
              <a className="btn btn-ghost" href="#how">See how it works</a>
            </div>
            <div className="trust">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M12 3l7 3v5c0 4.4-3 7.6-7 9-4-1.4-7-4.6-7-9V6l7-3z" stroke="#0E5C55" strokeWidth="1.6" strokeLinejoin="round" /><path d="M9 12l2 2 4-4" stroke="#12B0A0" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>
              Built around what an inspector actually asks to see.
            </div>
          </div>

          <div className="stack" aria-hidden="true">
            <div className="tcard">
              <span className="rail" style={{ background: "#DC2626" }}></span>
              <div className="top">
                <div className="title">Fire alarm weekly test</div>
                <span className="pill over">2 days overdue</span>
              </div>
              <div className="meta"><span className="chip">Fire</span><span className="chip">Statutory</span></div>
            </div>
            <div className="tcard">
              <span className="rail" style={{ background: "#0E5C55" }}></span>
              <div className="top">
                <div className="title">Low-use outlet flush</div>
                <span className="pill due">Today</span>
              </div>
              <div className="meta"><span className="chip">Water</span><span className="chip">photo needed</span></div>
            </div>
            <div className="tcard">
              <span className="rail" style={{ background: "#15803D" }}></span>
              <div className="top">
                <div className="title">Emergency lighting test</div>
                <span className="pill done">Done</span>
              </div>
              <div className="photo">
                <span className="thumb">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><rect x="3" y="6.5" width="18" height="13" rx="2.5" stroke="#fff" strokeWidth="1.6" /><circle cx="12" cy="13" r="3.4" stroke="#fff" strokeWidth="1.6" /><path d="M8.5 6.5l1.2-2h4.6l1.2 2" stroke="#fff" strokeWidth="1.6" strokeLinejoin="round" /></svg>
                </span>
                <small>Proof logged · 14:32, today</small>
              </div>
            </div>
          </div>
        </div>
      </header>

      <section className="problem band">
        <div className="wrap">
          <div className="lede">
            <div className="kicker">The problem</div>
            <h2>Paper logs and email don&apos;t hold up.</h2>
          </div>
          <div className="prob-grid" style={{ marginTop: "42px" }}>
            <div className="prob">
              <div className="bar"></div>
              <h3>Checks get forgotten</h3>
              <p>A weekly flush or a monthly test slips, and nobody notices until an audit finds the gap.</p>
            </div>
            <div className="prob">
              <div className="bar"></div>
              <h3>Reports get lost</h3>
              <p>Staff email a fault, a contractor goes quiet, and the job disappears into an inbox.</p>
            </div>
            <div className="prob">
              <div className="bar"></div>
              <h3>A tick isn&apos;t evidence</h3>
              <p>&quot;We logged it&quot; means nothing in an inspection. A photo of the job done means everything.</p>
            </div>
          </div>
        </div>
      </section>

      <section className="band">
        <div className="wrap">
          <div className="lede">
            <div className="kicker">What it does</div>
            <h2>One list. Nothing slips. Proof on every job.</h2>
          </div>
          <div className="feat-grid">
            <div className="feature">
              <span className="frail"></span>
              <div className="ficon"><svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M4 6h16M4 12h16M4 18h16" stroke="#0E5C55" strokeWidth="1.8" strokeLinecap="round" /></svg></div>
              <h3>One inbox</h3>
              <p>Statutory checks, staff reports, manager actions and your own jobs — every source in a single list, sorted by what&apos;s due.</p>
            </div>
            <div className="feature">
              <span className="frail"></span>
              <div className="ficon"><svg width="20" height="20" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="13" r="7.5" stroke="#0E5C55" strokeWidth="1.8" /><path d="M12 9.5V13l2.5 1.5" stroke="#0E5C55" strokeWidth="1.8" strokeLinecap="round" /></svg></div>
              <h3>Nothing slips</h3>
              <p>Recurring checks generate themselves on schedule, and overdue is impossible to miss. A skipped check comes straight back.</p>
            </div>
            <div className="feature">
              <span className="frail" style={{ background: "var(--done)" }}></span>
              <div className="ficon"><svg width="20" height="20" viewBox="0 0 24 24" fill="none"><rect x="3" y="6.5" width="18" height="13" rx="2.5" stroke="#0E5C55" strokeWidth="1.7" /><circle cx="12" cy="13" r="3.4" stroke="#0E5C55" strokeWidth="1.7" /></svg></div>
              <h3>Proof that counts</h3>
              <p>Mark a check done and it asks for a photo first. &quot;We did it&quot; becomes a timestamped record you can stand behind.</p>
            </div>
          </div>
        </div>
      </section>

      <section className="ready band">
        <div className="wrap">
          <div className="kicker" style={{ color: "#7df0df" }}>Always inspection-ready</div>
          <h2>Hand over a clean record in seconds.</h2>
          <p>Export any date range and show every check, <span className="accent">who did it, when, and the photo to prove it</span> — already organised the way an inspector wants to read it. No scramble, no missing pages.</p>
        </div>
      </section>

      <section className="band" id="how">
        <div className="wrap">
          <div className="lede">
            <div className="kicker">How it works</div>
            <h2>Set it up once. The record builds itself.</h2>
          </div>
          <div className="steps">
            <div className="step">
              <div className="num">01</div>
              <div className="line"></div>
              <h3>Set up your checks</h3>
              <p>One-tap presets for legionella, fire and walk-arounds — or add your own with any schedule.</p>
            </div>
            <div className="step">
              <div className="num">02</div>
              <div className="line"></div>
              <h3>Work the day&apos;s list</h3>
              <p>Open it on your phone, see what&apos;s due, snap the photo, tap done. That&apos;s the whole routine.</p>
            </div>
            <div className="step">
              <div className="num">03</div>
              <div className="line"></div>
              <h3>Stay ready</h3>
              <p>Every completed job becomes proof. When the inspection comes, the evidence is already there.</p>
            </div>
          </div>
        </div>
      </section>

      <section className="final">
        <div className="wrap" style={{ paddingTop: "84px", paddingBottom: "84px" }}>
          <h2>Start with your own site today.</h2>
          <p>Add your checks, run a week, and see your compliance record build itself — one photo at a time.</p>
          <a className="btn btn-primary" href="/login">Get started</a>
        </div>
      </section>

      <footer>
        <div className="wrap foot">
          <div className="logo">
            <span className="mark" aria-hidden="true"><svg width="15" height="15" viewBox="0 0 24 24" fill="none"><path d="M7 12l3 3 7-8" stroke="#12B0A0" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" /></svg></span>
            Sitewatch
          </div>
          <small>Maintenance &amp; compliance, made for the people who do the checks.</small>
        </div>
      </footer>
    </div>
  );
}
