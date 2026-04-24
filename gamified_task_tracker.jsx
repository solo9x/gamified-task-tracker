import { useState, useEffect, useRef } from "react";

const CATS = [
  { id: "study", label: "Study", icon: "📚", color: "#818cf8", bg: "#1e1b4b" },
  { id: "code", label: "Code", icon: "💻", color: "#22d3ee", bg: "#083344" },
  { id: "exercise", label: "Exercise", icon: "💪", color: "#f87171", bg: "#450a0a" },
  { id: "health", label: "Health", icon: "🌿", color: "#4ade80", bg: "#052e16" },
  { id: "work", label: "Work", icon: "💼", color: "#fbbf24", bg: "#451a03" },
  { id: "other", label: "Other", icon: "⭐", color: "#c084fc", bg: "#2e1065" },
];

const PRIOS = [
  { id: "easy", label: "Easy", mult: 0.5, color: "#4ade80" },
  { id: "normal", label: "Normal", mult: 1, color: "#94a3b8" },
  { id: "hard", label: "Hard", mult: 2, color: "#f87171" },
];

const XP = { study: 30, code: 35, exercise: 25, health: 25, work: 30, other: 20 };

const BADGES = [
  { id: "b1", name: "First Blood", desc: "Complete 1 task", icon: "🗡️", check: (s) => s.done >= 1 },
  { id: "b5", name: "Apprentice", desc: "Complete 5 tasks", icon: "⚔️", check: (s) => s.done >= 5 },
  { id: "b10", name: "Warrior", desc: "Complete 10 tasks", icon: "🛡️", check: (s) => s.done >= 10 },
  { id: "b25", name: "Champion", desc: "Complete 25 tasks", icon: "👑", check: (s) => s.done >= 25 },
  { id: "bs", name: "Scholar", desc: "3 study tasks", icon: "📖", check: (s) => (s.cats.study || 0) >= 3 },
  { id: "bc", name: "Code Wizard", desc: "3 code tasks", icon: "🧙", check: (s) => (s.cats.code || 0) >= 3 },
  { id: "be", name: "Athlete", desc: "3 exercise tasks", icon: "🏃", check: (s) => (s.cats.exercise || 0) >= 3 },
  { id: "bh", name: "Life Mage", desc: "3 health tasks", icon: "💚", check: (s) => (s.cats.health || 0) >= 3 },
  { id: "l5", name: "Rising Star", desc: "Reach Level 5", icon: "⭐", check: (s) => s.lvl >= 5 },
  { id: "l10", name: "Veteran", desc: "Reach Level 10", icon: "🏆", check: (s) => s.lvl >= 10 },
  { id: "x5", name: "XP Hunter", desc: "Earn 500 XP", icon: "💎", check: (s) => s.xp >= 500 },
  { id: "ac", name: "Versatile", desc: "All 6 categories", icon: "🌈", check: (s) => Object.keys(s.cats).length >= 6 },
];

const KEY = "gtt_data";

async function load() {
  try {
    if (window.storage) {
      const r = await window.storage.get(KEY);
      if (r && r.value) return JSON.parse(r.value);
    }
  } catch (e) {
    console.log("load error", e);
  }
  return null;
}

async function save(data) {
  try {
    if (window.storage) {
      await window.storage.set(KEY, JSON.stringify(data));
    }
  } catch (e) {
    console.log("save error", e);
  }
}

export default function App() {
  const [tasks, setTasks] = useState([]);
  const [done, setDone] = useState([]);
  const [xp, setXp] = useState(0);
  const [unlocked, setUnlocked] = useState([]);
  const [text, setText] = useState("");
  const [cat, setCat] = useState("study");
  const [prio, setPrio] = useState("normal");
  const [view, setView] = useState("quests");
  const [note, setNote] = useState("");
  const [ready, setReady] = useState(false);
  const noteTimer = useRef(null);

  useEffect(() => {
    load().then((d) => {
      if (d) {
        setTasks(d.tasks || []);
        setDone(d.done || []);
        setXp(d.xp || 0);
        setUnlocked(d.unlocked || []);
      }
      setReady(true);
    });
  }, []);

  function doSave(t, d, x, u) {
    save({ tasks: t, done: d, xp: x, unlocked: u });
  }

  function flash(msg) {
    setNote(msg);
    clearTimeout(noteTimer.current);
    noteTimer.current = setTimeout(() => setNote(""), 3000);
  }

  function getNewBadges(doneList, totalXp, current) {
    const cats = {};
    doneList.forEach((t) => { cats[t.cat] = (cats[t.cat] || 0) + 1; });
    const s = { done: doneList.length, cats, lvl: Math.floor(totalXp / 100) + 1, xp: totalXp };
    return BADGES.filter((b) => !current.includes(b.id) && b.check(s));
  }

  function handleAdd() {
    const title = text.trim();
    if (!title) { flash("✏️ Name your quest first!"); return; }
    const item = { id: Date.now(), title, cat, prio, at: Date.now() };
    const next = [...tasks, item];
    setTasks(next);
    setText("");
    doSave(next, done, xp, unlocked);
    flash("Quest accepted!");
  }

  function handleComplete(id) {
    const item = tasks.find((t) => t.id === id);
    if (!item) return;
    const p = PRIOS.find((p) => p.id === item.prio) || PRIOS[1];
    const gain = Math.floor(XP[item.cat] * p.mult);
    const newXp = xp + gain;
    const newTasks = tasks.filter((t) => t.id !== id);
    const newDone = [{ ...item, xpEarned: gain, doneAt: Date.now() }, ...done].slice(0, 80);
    const earned = getNewBadges(newDone, newXp, unlocked);
    const newUnlocked = [...unlocked, ...earned.map((b) => b.id)];

    setTasks(newTasks);
    setDone(newDone);
    setXp(newXp);
    setUnlocked(newUnlocked);
    doSave(newTasks, newDone, newXp, newUnlocked);

    if (earned.length > 0) {
      flash("🏅 Badge: " + earned[0].name + "!");
    } else {
      flash("+" + gain + " XP!");
    }
  }

  function handleDelete(id) {
    const next = tasks.filter((t) => t.id !== id);
    setTasks(next);
    doSave(next, done, xp, unlocked);
  }

  const level = Math.floor(xp / 100) + 1;
  const prog = xp % 100;

  if (!ready) {
    return <div style={{ padding: 40, textAlign: "center", color: "#aaa" }}>Loading...</div>;
  }

  const S = {
    page: { background: "#0c0c18", minHeight: "100vh", color: "#e2e8f0", fontFamily: "system-ui, -apple-system, sans-serif", paddingBottom: 60 },
    hdr: { background: "#14142a", borderBottom: "1px solid #222244", padding: "16px 20px 12px" },
    row: { display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", marginBottom: 10 },
    title: { fontSize: 18, fontWeight: 700, color: "#e8b84b", letterSpacing: 1 },
    lvl: { background: "#e8b84b", color: "#0c0c18", fontWeight: 700, fontSize: 11, padding: "3px 8px", borderRadius: 4 },
    sub: { marginLeft: "auto", fontSize: 12, color: "#888" },
    barBg: { height: 8, background: "#222244", borderRadius: 4, overflow: "hidden" },
    barFg: { height: "100%", background: "linear-gradient(90deg, #b45309, #e8b84b)", borderRadius: 4, transition: "width 0.5s ease" },
    barLabel: { display: "flex", justifyContent: "space-between", fontSize: 10, color: "#555", marginTop: 4 },
    tabs: { display: "flex", borderBottom: "1px solid #222244", background: "#0c0c18" },
    tab: (a) => ({ padding: "10px 18px", fontSize: 12, fontWeight: 600, color: a ? "#e8b84b" : "#666", borderBottom: a ? "2px solid #e8b84b" : "2px solid transparent", background: "none", border: "none", borderBottomWidth: 2, borderBottomStyle: "solid", borderBottomColor: a ? "#e8b84b" : "transparent", cursor: "pointer" }),
    body: { maxWidth: 640, margin: "0 auto", padding: "20px 16px" },
    card: { background: "#14142a", border: "1px solid #222244", borderRadius: 10, padding: 16, marginBottom: 16 },
    input: { width: "100%", background: "#0a0a16", border: "1px solid #333366", borderRadius: 8, color: "#e2e8f0", padding: "10px 12px", fontSize: 15, outline: "none", display: "block", boxSizing: "border-box" },
    catRow: { display: "flex", gap: 5, flexWrap: "wrap", marginTop: 10 },
    catBtn: (a, c) => ({ padding: "4px 10px", borderRadius: 6, fontSize: 12, cursor: "pointer", border: a ? "1px solid " + c.color : "1px solid #222244", background: a ? c.bg : "transparent", color: a ? c.color : "#666", display: "flex", alignItems: "center", gap: 4 }),
    prioRow: { display: "flex", gap: 5, marginTop: 8 },
    prioBtn: (a, p) => ({ flex: 1, padding: "5px 4px", borderRadius: 6, fontSize: 11, cursor: "pointer", border: a ? "1px solid " + p.color : "1px solid #222244", background: a ? p.color + "20" : "transparent", color: a ? p.color : "#666", textAlign: "center" }),
    addBtn: { width: "100%", marginTop: 12, background: "#e8b84b", color: "#0c0c18", border: "none", borderRadius: 8, padding: "10px 0", fontSize: 14, fontWeight: 700, cursor: "pointer" },
    secTitle: { fontSize: 11, textTransform: "uppercase", letterSpacing: "0.1em", color: "#555", marginBottom: 10, fontWeight: 600 },
    taskRow: (c) => ({ display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", background: "#0a0a16", border: "1px solid " + c.color + "30", borderLeft: "3px solid " + c.color, borderRadius: 8, marginBottom: 6 }),
    checkBtn: (c) => ({ width: 24, height: 24, borderRadius: "50%", border: "2px solid " + c.color + "66", background: "none", cursor: "pointer", color: c.color, fontSize: 12, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }),
    delBtn: { background: "none", border: "none", color: "#444", cursor: "pointer", fontSize: 14, padding: "0 4px" },
    pill: (c) => ({ padding: "1px 6px", borderRadius: 4, fontSize: 10, fontWeight: 700, background: c.bg, color: c.color }),
    empty: { textAlign: "center", padding: "30px 10px", color: "#444", fontSize: 14 },
    badge: (on) => ({ background: on ? "#14142a" : "#0a0a16", border: on ? "1px solid #e8b84b44" : "1px solid #222244", borderRadius: 10, padding: "14px 10px", textAlign: "center", opacity: on ? 1 : 0.4 }),
    badgeGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(130px, 1fr))", gap: 10 },
    statGrid: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 16 },
    statCard: { background: "#14142a", border: "1px solid #222244", borderRadius: 10, padding: 14 },
    statN: { fontSize: 28, fontWeight: 700, color: "#e8b84b", lineHeight: 1 },
    statL: { fontSize: 10, color: "#666", textTransform: "uppercase", letterSpacing: "0.08em", marginTop: 4 },
    toast: { background: "#14142a", border: "1px solid #e8b84b55", borderRadius: 10, padding: "10px 18px", textAlign: "center", marginBottom: 16, color: "#e8b84b", fontWeight: 600, fontSize: 14 },
  };

  const catInfo = (id) => CATS.find((c) => c.id === id) || CATS[5];
  const prioInfo = (id) => PRIOS.find((p) => p.id === id) || PRIOS[1];

  const catCounts = {};
  done.forEach((t) => { catCounts[t.cat] = (catCounts[t.cat] || 0) + 1; });
  const maxCount = Math.max(1, ...Object.values(catCounts).length ? Object.values(catCounts) : [1]);

  return (
    <div style={S.page}>
      {/* Header */}
      <div style={S.hdr}>
        <div style={S.row}>
          <span style={S.title}>⚔ Quest Log</span>
          <span style={S.lvl}>LVL {level}</span>
          <span style={S.sub}>{xp} XP · {unlocked.length}/{BADGES.length} badges</span>
        </div>
        <div style={S.barBg}>
          <div style={{ ...S.barFg, width: prog + "%" }} />
        </div>
        <div style={S.barLabel}>
          <span>Level {level}</span>
          <span>{prog}/100 XP</span>
        </div>
      </div>

      {/* Tabs */}
      <div style={S.tabs}>
        {["quests", "badges", "stats"].map((v) => (
          <button key={v} style={S.tab(view === v)} onClick={() => setView(v)}>
            {v === "quests" ? "⚔ Quests" : v === "badges" ? "🏅 Badges" : "📊 Stats"}
          </button>
        ))}
      </div>

      <div style={S.body}>
        {/* Notification */}
        {note && <div style={S.toast}>{note}</div>}

        {/* QUESTS */}
        {view === "quests" && (
          <>
            <div style={S.card}>
              <div style={S.secTitle}>New Quest</div>
              <input
                style={S.input}
                value={text}
                onChange={(e) => setText(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") handleAdd(); }}
                placeholder="What's your quest?"
              />
              <div style={S.catRow}>
                {CATS.map((c) => (
                  <button key={c.id} type="button" style={S.catBtn(cat === c.id, c)} onClick={() => setCat(c.id)}>
                    <span>{c.icon}</span> {c.label}
                  </button>
                ))}
              </div>
              <div style={S.prioRow}>
                {PRIOS.map((p) => (
                  <button key={p.id} type="button" style={S.prioBtn(prio === p.id, p)} onClick={() => setPrio(p.id)}>
                    {p.label} · +{Math.floor(XP[cat] * p.mult)} XP
                  </button>
                ))}
              </div>
              <button type="button" style={S.addBtn} onClick={handleAdd}>
                + Accept Quest
              </button>
            </div>

            <div style={S.secTitle}>Active Quests ({tasks.length})</div>
            {tasks.length === 0 ? (
              <div style={S.empty}>
                <div style={{ fontSize: 28, marginBottom: 6 }}>🗺️</div>
                No active quests yet
              </div>
            ) : (
              tasks.map((t) => {
                const c = catInfo(t.cat);
                const p = prioInfo(t.prio);
                const est = Math.floor(XP[t.cat] * p.mult);
                return (
                  <div key={t.id} style={S.taskRow(c)}>
                    <button type="button" style={S.checkBtn(c)} onClick={() => handleComplete(t.id)}>✓</button>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 14, marginBottom: 2 }}>{t.title}</div>
                      <div style={{ display: "flex", gap: 6, fontSize: 11, color: "#555", alignItems: "center" }}>
                        <span>{c.icon} {c.label}</span>
                        <span style={{ color: p.color }}>● {p.label}</span>
                        <span style={S.pill(c)}>+{est} XP</span>
                      </div>
                    </div>
                    <button type="button" style={S.delBtn} onClick={() => handleDelete(t.id)}>✕</button>
                  </div>
                );
              })
            )}

            {done.length > 0 && (
              <>
                <div style={{ ...S.secTitle, marginTop: 20 }}>Recently Completed</div>
                {done.slice(0, 5).map((t) => {
                  const c = catInfo(t.cat);
                  return (
                    <div key={t.id + "d"} style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 10px", borderRadius: 6, background: "#0a0a16", marginBottom: 4, opacity: 0.6 }}>
                      <span>✅</span>
                      <span style={{ flex: 1, fontSize: 13, color: "#666", textDecoration: "line-through" }}>{t.title}</span>
                      <span style={{ ...S.pill(c), opacity: 0.8 }}>+{t.xpEarned} XP</span>
                    </div>
                  );
                })}
              </>
            )}
          </>
        )}

        {/* BADGES */}
        {view === "badges" && (
          <>
            <div style={S.secTitle}>{unlocked.length} / {BADGES.length} Badges</div>
            <div style={S.badgeGrid}>
              {BADGES.map((b) => {
                const on = unlocked.includes(b.id);
                return (
                  <div key={b.id} style={S.badge(on)}>
                    <div style={{ fontSize: 28, marginBottom: 4, filter: on ? "none" : "grayscale(1)" }}>{b.icon}</div>
                    <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 2 }}>{b.name}</div>
                    <div style={{ fontSize: 10, color: "#666", lineHeight: 1.3 }}>{b.desc}</div>
                    {on && <div style={{ marginTop: 4, fontSize: 9, color: "#e8b84b", textTransform: "uppercase" }}>Unlocked ✦</div>}
                  </div>
                );
              })}
            </div>
          </>
        )}

        {/* STATS */}
        {view === "stats" && (
          <>
            <div style={S.statGrid}>
              {[
                { n: done.length, l: "Quests Done" },
                { n: level, l: "Level" },
                { n: xp, l: "Total XP" },
                { n: unlocked.length, l: "Badges" },
              ].map((s) => (
                <div key={s.l} style={S.statCard}>
                  <div style={S.statN}>{s.n}</div>
                  <div style={S.statL}>{s.l}</div>
                </div>
              ))}
            </div>

            <div style={S.secTitle}>XP Progress</div>
            <div style={{ ...S.card, marginBottom: 16 }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "#666", marginBottom: 6 }}>
                <span>Level {level}</span><span>Level {level + 1}</span>
              </div>
              <div style={S.barBg}>
                <div style={{ ...S.barFg, width: prog + "%" }} />
              </div>
              <div style={{ textAlign: "center", marginTop: 6, fontSize: 12, color: "#888" }}>{prog} / 100 XP</div>
            </div>

            <div style={S.secTitle}>Categories</div>
            <div style={S.card}>
              {CATS.map((c) => {
                const n = catCounts[c.id] || 0;
                const pct = Math.round((n / maxCount) * 100);
                return (
                  <div key={c.id} style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
                    <span style={{ fontSize: 14, width: 20 }}>{c.icon}</span>
                    <span style={{ fontSize: 12, color: "#888", width: 56 }}>{c.label}</span>
                    <div style={{ flex: 1, height: 6, background: "#222244", borderRadius: 3, overflow: "hidden" }}>
                      <div style={{ height: "100%", width: pct + "%", background: c.color, borderRadius: 3, transition: "width 0.5s" }} />
                    </div>
                    <span style={{ fontSize: 12, color: c.color, width: 20, textAlign: "right" }}>{n}</span>
                  </div>
                );
              })}
              {done.length === 0 && <div style={{ textAlign: "center", color: "#444", fontSize: 13, padding: 8 }}>Complete quests to see stats</div>}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
