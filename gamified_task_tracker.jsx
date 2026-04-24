<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>⚔ Quest Log – Gamified Task Tracker</title>
  <script src="https://unpkg.com/react@18/umd/react.development.js"></script>
  <script src="https://unpkg.com/react-dom@18/umd/react-dom.development.js"></script>
  <script src="https://unpkg.com/@babel/standalone/babel.min.js"></script>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { background: #0c0c18; font-family: system-ui, -apple-system, sans-serif; }
    ::-webkit-scrollbar { width: 6px; }
    ::-webkit-scrollbar-track { background: #0c0c18; }
    ::-webkit-scrollbar-thumb { background: #222244; border-radius: 3px; }
    .btn-hover:hover { opacity: 0.85; }
    .task-hover:hover { background: #111128 !important; }
    .badge-hover:hover { transform: translateY(-2px); transition: transform 0.15s; }
  </style>
</head>
<body>
  <div id="root"></div>

  <script type="text/babel">
    const { useState, useEffect, useRef } = React;

    const CATS = [
      { id: "study",    label: "Study",    icon: "📚", color: "#818cf8", bg: "#1e1b4b" },
      { id: "code",     label: "Code",     icon: "💻", color: "#22d3ee", bg: "#083344" },
      { id: "exercise", label: "Exercise", icon: "💪", color: "#f87171", bg: "#450a0a" },
      { id: "health",   label: "Health",   icon: "🌿", color: "#4ade80", bg: "#052e16" },
      { id: "work",     label: "Work",     icon: "💼", color: "#fbbf24", bg: "#451a03" },
      { id: "other",    label: "Other",    icon: "⭐", color: "#c084fc", bg: "#2e1065" },
    ];

    const PRIOS = [
      { id: "easy",   label: "Easy",   mult: 0.5, color: "#4ade80" },
      { id: "normal", label: "Normal", mult: 1,   color: "#94a3b8" },
      { id: "hard",   label: "Hard",   mult: 2,   color: "#f87171" },
    ];

    const XP_MAP = { study: 30, code: 35, exercise: 25, health: 25, work: 30, other: 20 };

    const BADGES = [
      { id: "b1",  name: "First Blood", desc: "Complete 1 task",        icon: "🗡️", check: (s) => s.done >= 1 },
      { id: "b5",  name: "Apprentice",  desc: "Complete 5 tasks",       icon: "⚔️", check: (s) => s.done >= 5 },
      { id: "b10", name: "Warrior",     desc: "Complete 10 tasks",      icon: "🛡️", check: (s) => s.done >= 10 },
      { id: "b25", name: "Champion",    desc: "Complete 25 tasks",      icon: "👑", check: (s) => s.done >= 25 },
      { id: "bs",  name: "Scholar",     desc: "3 study tasks",          icon: "📖", check: (s) => (s.cats.study || 0) >= 3 },
      { id: "bc",  name: "Code Wizard", desc: "3 code tasks",           icon: "🧙", check: (s) => (s.cats.code || 0) >= 3 },
      { id: "be",  name: "Athlete",     desc: "3 exercise tasks",       icon: "🏃", check: (s) => (s.cats.exercise || 0) >= 3 },
      { id: "bh",  name: "Life Mage",   desc: "3 health tasks",         icon: "💚", check: (s) => (s.cats.health || 0) >= 3 },
      { id: "l5",  name: "Rising Star", desc: "Reach Level 5",          icon: "⭐", check: (s) => s.lvl >= 5 },
      { id: "l10", name: "Veteran",     desc: "Reach Level 10",         icon: "🏆", check: (s) => s.lvl >= 10 },
      { id: "x5",  name: "XP Hunter",   desc: "Earn 500 XP",            icon: "💎", check: (s) => s.xp >= 500 },
      { id: "ac",  name: "Versatile",   desc: "All 6 categories used",  icon: "🌈", check: (s) => Object.keys(s.cats).length >= 6 },
    ];

    const LS_KEY = "gtt_data";

    function lsLoad() {
      try {
        const raw = localStorage.getItem(LS_KEY);
        if (raw) return JSON.parse(raw);
      } catch (e) {}
      return null;
    }

    function lsSave(data) {
      try { localStorage.setItem(LS_KEY, JSON.stringify(data)); } catch (e) {}
    }

    const catInfo  = (id) => CATS.find((c) => c.id === id) || CATS[5];
    const prioInfo = (id) => PRIOS.find((p) => p.id === id) || PRIOS[1];

    function App() {
      const [tasks,    setTasks]    = useState([]);
      const [done,     setDone]     = useState([]);
      const [xp,       setXp]       = useState(0);
      const [unlocked, setUnlocked] = useState([]);
      const [text,     setText]     = useState("");
      const [cat,      setCat]      = useState("study");
      const [prio,     setPrio]     = useState("normal");
      const [view,     setView]     = useState("quests");
      const [note,     setNote]     = useState("");
      const noteTimer = useRef(null);

      useEffect(() => {
        const d = lsLoad();
        if (d) {
          setTasks(d.tasks || []);
          setDone(d.done || []);
          setXp(d.xp || 0);
          setUnlocked(d.unlocked || []);
        }
      }, []);

      function persist(t, d, x, u) {
        lsSave({ tasks: t, done: d, xp: x, unlocked: u });
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
        const item = { id: Date.now(), title, cat, prio };
        const nextTasks = [...tasks, item];
        setTasks(nextTasks);
        setText("");
        persist(nextTasks, done, xp, unlocked);
        flash("⚔️ Quest accepted!");
      }

      function handleComplete(id) {
        const item = tasks.find((t) => t.id === id);
        if (!item) return;
        const p    = prioInfo(item.prio);
        const gain = Math.floor(XP_MAP[item.cat] * p.mult);
        const newXp       = xp + gain;
        const newTasks    = tasks.filter((t) => t.id !== id);
        const newDone     = [{ ...item, xpEarned: gain }, ...done].slice(0, 80);
        const earned      = getNewBadges(newDone, newXp, unlocked);
        const newUnlocked = [...unlocked, ...earned.map((b) => b.id)];
        setTasks(newTasks);
        setDone(newDone);
        setXp(newXp);
        setUnlocked(newUnlocked);
        persist(newTasks, newDone, newXp, newUnlocked);
        flash(earned.length > 0 ? "🏅 Badge: " + earned[0].name + "!" : "+" + gain + " XP!");
      }

      function handleDelete(id) {
        const next = tasks.filter((t) => t.id !== id);
        setTasks(next);
        persist(next, done, xp, unlocked);
      }

      const level = Math.floor(xp / 100) + 1;
      const prog  = xp % 100;

      const catCounts = {};
      done.forEach((t) => { catCounts[t.cat] = (catCounts[t.cat] || 0) + 1; });
      const maxCount = Math.max(1, ...Object.values(catCounts).length ? Object.values(catCounts) : [1]);

      return (
        <div style={{ background:"#0c0c18", minHeight:"100vh", color:"#e2e8f0", paddingBottom:60 }}>

          {/* HEADER */}
          <div style={{ background:"#14142a", borderBottom:"1px solid #222244", padding:"16px 20px 12px", position:"sticky", top:0, zIndex:10 }}>
            <div style={{ display:"flex", alignItems:"center", gap:10, flexWrap:"wrap", marginBottom:10 }}>
              <span style={{ fontSize:20, fontWeight:700, color:"#e8b84b", letterSpacing:1 }}>⚔ Quest Log</span>
              <span style={{ background:"#e8b84b", color:"#0c0c18", fontWeight:700, fontSize:11, padding:"3px 8px", borderRadius:4 }}>LVL {level}</span>
              <span style={{ marginLeft:"auto", fontSize:12, color:"#666" }}>{xp} XP · {unlocked.length}/{BADGES.length} badges</span>
            </div>
            <div style={{ height:8, background:"#222244", borderRadius:4, overflow:"hidden" }}>
              <div style={{ height:"100%", width:prog+"%", background:"linear-gradient(90deg,#b45309,#e8b84b)", borderRadius:4, transition:"width 0.5s ease" }} />
            </div>
            <div style={{ display:"flex", justifyContent:"space-between", fontSize:10, color:"#555", marginTop:4 }}>
              <span>Level {level}</span><span>{prog} / 100 XP → Level {level+1}</span>
            </div>
          </div>

          {/* TABS */}
          <div style={{ display:"flex", borderBottom:"1px solid #222244", background:"#0c0c18", position:"sticky", top:72, zIndex:9 }}>
            {[["quests","⚔ Quests"],["badges","🏅 Badges"],["stats","📊 Stats"]].map(([v,lbl]) => (
              <button key={v} onClick={() => setView(v)} style={{ padding:"10px 18px", fontSize:12, fontWeight:600, color:view===v?"#e8b84b":"#666", background:"none", border:"none", borderBottom: view===v ? "2px solid #e8b84b" : "2px solid transparent", cursor:"pointer" }}>
                {lbl}
              </button>
            ))}
          </div>

          <div style={{ maxWidth:640, margin:"0 auto", padding:"20px 16px" }}>

            {/* NOTIFICATION */}
            {note && (
              <div style={{ background:"#14142a", border:"1px solid #e8b84b55", borderRadius:10, padding:"10px 16px", marginBottom:16, color:"#e8b84b", fontWeight:600, fontSize:14, textAlign:"center" }}>
                {note}
              </div>
            )}

            {/* QUESTS TAB */}
            {view === "quests" && (
              <>
                <div style={{ background:"#14142a", border:"1px solid #222244", borderRadius:10, padding:16, marginBottom:16 }}>
                  <div style={{ fontSize:11, textTransform:"uppercase", letterSpacing:"0.1em", color:"#555", marginBottom:10, fontWeight:600 }}>New Quest</div>
                  <input
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") handleAdd(); }}
                    placeholder="What's your quest?"
                    style={{ width:"100%", background:"#0a0a16", border:"1px solid #333366", borderRadius:8, color:"#e2e8f0", padding:"10px 12px", fontSize:15, outline:"none", display:"block", boxSizing:"border-box" }}
                  />
                  <div style={{ display:"flex", gap:5, flexWrap:"wrap", marginTop:10 }}>
                    {CATS.map((c) => (
                      <button key={c.id} onClick={() => setCat(c.id)} style={{ padding:"4px 10px", borderRadius:6, fontSize:12, cursor:"pointer", border: cat===c.id ? "1px solid "+c.color : "1px solid #222244", background: cat===c.id ? c.bg : "transparent", color: cat===c.id ? c.color : "#666", display:"flex", alignItems:"center", gap:4 }}>
                        <span>{c.icon}</span>{c.label}
                      </button>
                    ))}
                  </div>
                  <div style={{ display:"flex", gap:5, marginTop:8 }}>
                    {PRIOS.map((p) => (
                      <button key={p.id} onClick={() => setPrio(p.id)} style={{ flex:1, padding:"5px 4px", borderRadius:6, fontSize:11, cursor:"pointer", border: prio===p.id ? "1px solid "+p.color : "1px solid #222244", background: prio===p.id ? p.color+"20" : "transparent", color: prio===p.id ? p.color : "#666", textAlign:"center" }}>
                        {p.label} · +{Math.floor(XP_MAP[cat] * p.mult)} XP
                      </button>
                    ))}
                  </div>
                  <button onClick={handleAdd} className="btn-hover" style={{ width:"100%", marginTop:12, background:"#e8b84b", color:"#0c0c18", border:"none", borderRadius:8, padding:"11px 0", fontSize:14, fontWeight:700, cursor:"pointer" }}>
                    + Accept Quest
                  </button>
                </div>

                <div style={{ fontSize:11, textTransform:"uppercase", letterSpacing:"0.1em", color:"#555", marginBottom:10, fontWeight:600 }}>Active Quests ({tasks.length})</div>
                {tasks.length === 0 ? (
                  <div style={{ textAlign:"center", padding:"30px 10px", color:"#444", fontSize:14 }}>
                    <div style={{ fontSize:32, marginBottom:8 }}>🗺️</div>No active quests yet
                  </div>
                ) : tasks.map((t) => {
                  const c   = catInfo(t.cat);
                  const p   = prioInfo(t.prio);
                  const est = Math.floor(XP_MAP[t.cat] * p.mult);
                  return (
                    <div key={t.id} className="task-hover" style={{ display:"flex", alignItems:"center", gap:10, padding:"10px 12px", background:"#0a0a16", border:"1px solid "+c.color+"30", borderLeft:"3px solid "+c.color, borderRadius:8, marginBottom:6 }}>
                      <button onClick={() => handleComplete(t.id)} style={{ width:24, height:24, borderRadius:"50%", border:"2px solid "+c.color+"66", background:"none", cursor:"pointer", color:c.color, fontSize:12, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>✓</button>
                      <div style={{ flex:1, minWidth:0 }}>
                        <div style={{ fontSize:14, marginBottom:2 }}>{t.title}</div>
                        <div style={{ display:"flex", gap:6, fontSize:11, color:"#555", alignItems:"center" }}>
                          <span>{c.icon} {c.label}</span>
                          <span style={{ color:p.color }}>● {p.label}</span>
                          <span style={{ padding:"1px 6px", borderRadius:4, fontSize:10, fontWeight:700, background:c.bg, color:c.color }}>+{est} XP</span>
                        </div>
                      </div>
                      <button onClick={() => handleDelete(t.id)} style={{ background:"none", border:"none", color:"#444", cursor:"pointer", fontSize:14, padding:"0 4px" }}>✕</button>
                    </div>
                  );
                })}

                {done.length > 0 && (
                  <>
                    <div style={{ fontSize:11, textTransform:"uppercase", letterSpacing:"0.1em", color:"#555", marginTop:20, marginBottom:10, fontWeight:600 }}>Recently Completed</div>
                    {done.slice(0, 5).map((t) => {
                      const c = catInfo(t.cat);
                      return (
                        <div key={t.id+"d"} style={{ display:"flex", alignItems:"center", gap:8, padding:"6px 10px", borderRadius:6, background:"#0a0a16", marginBottom:4, opacity:0.6 }}>
                          <span>✅</span>
                          <span style={{ flex:1, fontSize:13, color:"#666", textDecoration:"line-through" }}>{t.title}</span>
                          <span style={{ padding:"1px 6px", borderRadius:4, fontSize:10, fontWeight:700, background:c.bg, color:c.color }}>+{t.xpEarned} XP</span>
                        </div>
                      );
                    })}
                  </>
                )}
              </>
            )}

            {/* BADGES TAB */}
            {view === "badges" && (
              <>
                <div style={{ fontSize:11, textTransform:"uppercase", letterSpacing:"0.1em", color:"#555", marginBottom:12, fontWeight:600 }}>{unlocked.length} / {BADGES.length} Badges Earned</div>
                <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(130px,1fr))", gap:10 }}>
                  {BADGES.map((b) => {
                    const on = unlocked.includes(b.id);
                    return (
                      <div key={b.id} className={on?"badge-hover":""} style={{ background: on?"#14142a":"#0a0a16", border: on?"1px solid #e8b84b44":"1px solid #222244", borderRadius:10, padding:"14px 10px", textAlign:"center", opacity: on?1:0.4 }}>
                        <div style={{ fontSize:28, marginBottom:4, filter: on?"none":"grayscale(1)" }}>{b.icon}</div>
                        <div style={{ fontSize:12, fontWeight:600, marginBottom:2 }}>{b.name}</div>
                        <div style={{ fontSize:10, color:"#666", lineHeight:1.3 }}>{b.desc}</div>
                        {on && <div style={{ marginTop:4, fontSize:9, color:"#e8b84b", textTransform:"uppercase" }}>Unlocked ✦</div>}
                      </div>
                    );
                  })}
                </div>
              </>
            )}

            {/* STATS TAB */}
            {view === "stats" && (
              <>
                <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10, marginBottom:16 }}>
                  {[{n:done.length,l:"Quests Done"},{n:level,l:"Level"},{n:xp,l:"Total XP"},{n:unlocked.length,l:"Badges"}].map((s) => (
                    <div key={s.l} style={{ background:"#14142a", border:"1px solid #222244", borderRadius:10, padding:14 }}>
                      <div style={{ fontSize:28, fontWeight:700, color:"#e8b84b", lineHeight:1 }}>{s.n}</div>
                      <div style={{ fontSize:10, color:"#666", textTransform:"uppercase", letterSpacing:"0.08em", marginTop:4 }}>{s.l}</div>
                    </div>
                  ))}
                </div>

                <div style={{ fontSize:11, textTransform:"uppercase", letterSpacing:"0.1em", color:"#555", marginBottom:10, fontWeight:600 }}>XP Progress</div>
                <div style={{ background:"#14142a", border:"1px solid #222244", borderRadius:10, padding:16, marginBottom:16 }}>
                  <div style={{ display:"flex", justifyContent:"space-between", fontSize:12, color:"#666", marginBottom:6 }}>
                    <span>Level {level}</span><span>Level {level+1}</span>
                  </div>
                  <div style={{ height:8, background:"#222244", borderRadius:4, overflow:"hidden" }}>
                    <div style={{ height:"100%", width:prog+"%", background:"linear-gradient(90deg,#b45309,#e8b84b)", borderRadius:4, transition:"width 0.5s" }} />
                  </div>
                  <div style={{ textAlign:"center", marginTop:6, fontSize:12, color:"#888" }}>{prog} / 100 XP</div>
                </div>

                <div style={{ fontSize:11, textTransform:"uppercase", letterSpacing:"0.1em", color:"#555", marginBottom:10, fontWeight:600 }}>Category Breakdown</div>
                <div style={{ background:"#14142a", border:"1px solid #222244", borderRadius:10, padding:16 }}>
                  {CATS.map((c) => {
                    const n   = catCounts[c.id] || 0;
                    const pct = Math.round((n / maxCount) * 100);
                    return (
                      <div key={c.id} style={{ display:"flex", alignItems:"center", gap:10, marginBottom:8 }}>
                        <span style={{ fontSize:14, width:20 }}>{c.icon}</span>
                        <span style={{ fontSize:12, color:"#888", width:56 }}>{c.label}</span>
                        <div style={{ flex:1, height:6, background:"#222244", borderRadius:3, overflow:"hidden" }}>
                          <div style={{ height:"100%", width:pct+"%", background:c.color, borderRadius:3, transition:"width 0.5s" }} />
                        </div>
                        <span style={{ fontSize:12, color:c.color, width:20, textAlign:"right" }}>{n}</span>
                      </div>
                    );
                  })}
                  {done.length === 0 && <div style={{ textAlign:"center", color:"#444", fontSize:13, padding:8 }}>Complete quests to see stats</div>}
                </div>
              </>
            )}
          </div>
        </div>
      );
    }

    const root = ReactDOM.createRoot(document.getElementById("root"));
    root.render(<App />);
  </script>
</body>
</html>
