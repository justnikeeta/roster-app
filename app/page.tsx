'use client';
import { useEffect, useMemo, useState } from 'react';
import { employees, processes, pods, podLeads, holidays, seedLeaves, loadData } from '../lib/data';
import { dbOn, sel as dbSel, upsert, seedDb } from '../lib/db';
import Manage from './Manage';
import { days, dow, operating, procsOf, empsOf, generate, validate, Roster } from '../lib/engine';

const css = `body{font:13px system-ui;margin:0;padding:16px;background:#f6f7f9;color:#222}
table{border-collapse:collapse;background:#fff}td,th{border:1px solid #ddd;text-align:center;min-width:26px;height:24px;padding:0 2px;font-size:11px}
.nm{text-align:left;white-space:nowrap;position:sticky;left:0;background:#fff;padding:0 6px;font-size:12px}
.W{background:#d9f2e0;cursor:pointer}.O{background:#ffe3a3;cursor:pointer}.L{background:#f7b4b4}.C{background:#e6e6e6;color:#999}
.gap{background:#e53935;color:#fff;font-weight:700}.ok{background:#e8f5e9}.bar{display:flex;gap:10px;flex-wrap:wrap;align-items:center;margin:8px 0}
.err{color:#b71c1c}.warn{color:#8a5a00}li{margin:3px 0}button,select,input{font:inherit;padding:4px 8px}`;

export default function Page() {
  const [month, setMonth] = useState('2026-12');
  const [leaves, setLeaves] = useState<string[]>(seedLeaves);
  const [roster, setRoster] = useState<Roster>(() => generate('2026-12', holidays, seedLeaves));
  const [view, setView] = useState('company'); const [sel, setSel] = useState('');
  const [le, setLe] = useState('E1'); const [ld, setLd] = useState('2026-12-10');
  const [msg, setMsg] = useState(dbOn ? 'Loading from database...' : 'Database not connected: demo data, changes are not saved.');
  const reload = async (): Promise<void> => {
    try {
      const [p, e, pr, a, h, l]: any[][] = await Promise.all(['pods', 'employees', 'processes', 'assignments', 'holidays', 'leaves'].map(dbSel));
      if (!e.length && !pr.length) { await seedDb(); return reload(); }
      loadData({
        pods: p.map(x => ({ id: x.id, lead: x.lead || '' })),
        employees: e.map(x => ({ id: x.id, name: x.name, pod: x.pod, prefOff: x.pref_off })).sort((a, b) => +a.id.slice(1) - +b.id.slice(1)),
        processes: pr.map(x => ({ id: x.id, brand: x.brand, name: x.name, cal: x.cal, min: x.min_staff })).sort((a, b) => a.id.localeCompare(b.id)),
        assigns: a, holidays: h.map(x => x.date).sort(),
      });
      const lv = l.map(x => x.emp + '|' + x.date);
      setLeaves(lv); setRoster(generate(month, holidays, lv)); setMsg('Connected to Supabase. Changes are saved.');
    } catch (err) { setMsg('Database error: ' + String(err)); }
  };
  useEffect(() => { if (dbOn) reload(); }, []);
  const ds = days(month);
  const issues = useMemo(() => validate(roster, month, holidays), [roster, month]);
  const brands = [...new Set(processes.map(p => p.brand))];
  const opts: Record<string, { v: string; l: string }[]> = {
    pod: pods.map(p => ({ v: p, l: `${p} (lead: ${podLeads[p]})` })), brand: brands.map(b => ({ v: b, l: b })),
    process: processes.map(p => ({ v: p.id, l: p.id })), employee: employees.map(e => ({ v: e.id, l: e.name })),
  };
  const cur = sel || opts[view]?.[0]?.v;
  const emps = employees.filter(e => view === 'company' || (view === 'pod' && e.pod === cur) || (view === 'brand' && procsOf(e.id).some(p => p.brand === cur)) || (view === 'process' && procsOf(e.id).some(p => p.id === cur)) || (view === 'employee' && e.id === cur));
  const procs = view === 'company' ? [] : processes.filter(p => (view !== 'process' || p.id === cur) && empsOf(p.id).some(id => emps.some(e => e.id === id)));
  const changeMonth = (m: string) => { setMonth(m); setRoster(generate(m, holidays, leaves)); };
  const addLeave = () => { const k = le + '|' + ld; if (!ld.startsWith(month) || leaves.includes(k)) return; setLeaves([...leaves, k]); if (dbOn) upsert('leaves', [{ emp: le, date: ld }]).catch(err => setMsg(String(err))); setRoster(r => ({ ...r, [le]: { ...r[le], [ld]: 'L' } })); };
  const toggle = (e: string, d: string) => setRoster(r => { const s = r[e][d]; if (s !== 'W' && s !== 'O') return r; return { ...r, [e]: { ...r[e], [d]: s === 'W' ? 'O' : 'W' } }; });
  const nErr = issues.filter(i => i.sev === 'error').length;
  return (<div><style>{css}</style>
    <h2>Smart Roster Management</h2>
    <div style={{ color: '#666' }}>{msg}</div>
    <div className="bar">
      <input type="month" value={month} onChange={e => changeMonth(e.target.value)} />
      <button onClick={() => setRoster(generate(month, holidays, leaves))}>Regenerate roster</button>
      <select value={view} onChange={e => { setView(e.target.value); setSel(''); }}>{['company', 'pod', 'brand', 'process', 'employee'].map(v => <option key={v}>{v}</option>)}</select>
      {view !== 'company' && <select value={cur} onChange={e => setSel(e.target.value)}>{opts[view].map(o => <option key={o.v} value={o.v}>{o.l}</option>)}</select>}
    </div>
    <div className="bar"><b>Change a roster:</b> add leave for
      <select value={le} onChange={e => setLe(e.target.value)}>{employees.map(e => <option key={e.id} value={e.id}>{e.name} ({procsOf(e.id).map(p => p.id).join(', ')})</option>)}</select>
      <input type="date" value={ld} onChange={e => setLd(e.target.value)} /><button onClick={addLeave}>Add leave &amp; validate</button>
      <span>Tip: click a W/O cell to move a weekly off manually.</span></div>
    <div><b className={nErr ? 'err' : ''}>{nErr} coverage gaps</b> · <b className="warn">{issues.length - nErr} warnings</b> · W working · O weekly off · L leave · C closed</div>
    <div style={{ overflowX: 'auto', margin: '8px 0' }}><table><thead><tr><th>Employee</th>{ds.map(d => <th key={d} title={d}>{+d.slice(8)}<br />{'SMTWTFS'[dow(d)]}</th>)}</tr></thead><tbody>
      {emps.map(e => <tr key={e.id}><td className="nm">{e.name} · {e.pod}</td>{ds.map(d => { const s = roster[e.id]?.[d]; return <td key={d} className={s} onClick={() => toggle(e.id, d)}>{s}</td>; })}</tr>)}
      {procs.length > 0 && <tr><th colSpan={ds.length + 1}>Coverage: staff working per day (red = below minimum, – = process closed)</th></tr>}
      {procs.map(p => <tr key={p.id}><td className="nm">{p.id} · {p.cal} · min {p.min}</td>{ds.map(d => { if (!operating(p, d, holidays)) return <td key={d} className="C">–</td>; const c = empsOf(p.id).filter(x => roster[x]?.[d] === 'W').length; return <td key={d} className={c < p.min ? 'gap' : 'ok'}>{c}</td>; })}</tr>)}
    </tbody></table></div>
    <h3>Conflicts &amp; gaps</h3>
    {issues.length === 0 ? <p>No issues. Roster is valid.</p> : <ul>{issues.slice(0, 40).map((i, k) => <li key={k} className={i.sev === 'error' ? 'err' : 'warn'}>{i.sev === 'error' ? 'GAP' : 'WARN'}: {i.msg}</li>)}</ul>}
    {issues.length > 40 && <p>…and {issues.length - 40} more.</p>}
    {dbOn && <Manage reload={reload} />}
  </div>);
}
