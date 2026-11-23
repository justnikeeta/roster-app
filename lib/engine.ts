import { employees, processes, assigns, Process } from './data';
export type St = 'W' | 'O' | 'L' | 'C'; // Working | weekly Off | Leave | Closed (none of their processes operate)
export type Roster = Record<string, Record<string, St>>;
export interface Issue { sev: 'error' | 'warn'; msg: string }
export const days = (m: string) => { const [y, mo] = m.split('-').map(Number); const n = new Date(Date.UTC(y, mo, 0)).getUTCDate(); return Array.from({ length: n }, (_, i) => `${m}-${String(i + 1).padStart(2, '0')}`); };
export const dow = (d: string) => new Date(d + 'T00:00:00Z').getUTCDay();
// Brand/process operating calendar (separate from an employee's own schedule)
export const operating = (p: Process, d: string, hol: string[]) => p.cal === 'D365' || (!hol.includes(d) && (p.cal === 'NOHOL' || dow(d) !== 0));
export const procsOf = (e: string) => assigns.filter(a => a.emp === e).map(a => processes.find(p => p.id === a.proc)!);
export const empsOf = (p: string) => assigns.filter(a => a.proc === p).map(a => a.emp);
const weeksOf = (ds: string[]) => { const w: string[][] = []; ds.forEach((d, i) => { if (i === 0 || dow(d) === 1) w.push([]); w[w.length - 1].push(d); }); return w; };

// Greedy generator: most constrained employees (fewest peers) pick weekly offs first.
// A day is only eligible if every process they cover keeps >= min staff (HARD).
// Among eligible days: preferred weekday first (SOFT), then least offs in their team, then least offs company-wide.
export function generate(month: string, hol: string[], leaves: string[]): Roster {
  const ds = days(month), r: Roster = {}, L = new Set(leaves), load: Record<string, number> = {};
  employees.forEach(e => { r[e.id] = {}; const ps = procsOf(e.id); ds.forEach(d => { r[e.id][d] = L.has(e.id + '|' + d) ? 'L' : ps.some(p => operating(p, d, hol)) ? 'W' : 'C'; }); });
  const peers = (e: string) => Math.min(...procsOf(e).map(p => empsOf(p.id).length));
  [...employees].sort((a, b) => peers(a.id) - peers(b.id)).forEach(e => {
    const ps = procsOf(e.id), team = new Set(ps.flatMap(p => empsOf(p.id)));
    weeksOf(ds).forEach(w => {
      if (w.length < 6 || w.some(d => r[e.id][d] === 'C')) return; // closed day already acts as rest
      const ok = w.filter(d => r[e.id][d] === 'W' && ps.every(p => !operating(p, d, hol) || empsOf(p.id).filter(o => o !== e.id && r[o][d] === 'W').length >= p.min));
      if (!ok.length) return; // no safe day: left for the validator to flag
      const key = (d: string) => [dow(d) === e.prefOff ? 0 : 1, [...team].filter(o => r[o][d] === 'O').length, load[d] || 0];
      ok.sort((a, b) => { const x = key(a), y = key(b); return x[0] - y[0] || x[1] - y[1] || x[2] - y[2]; });
      r[e.id][ok[0]] = 'O'; load[ok[0]] = (load[ok[0]] || 0) + 1;
    });
  });
  return r;
}

// Independent validator: re-run after every generation, manual edit or leave change.
export function validate(r: Roster, month: string, hol: string[]): Issue[] {
  const ds = days(month), res: Issue[] = [], nm = (id: string) => employees.find(e => e.id === id)!.name;
  processes.forEach(p => {
    const es = empsOf(p.id);
    ds.forEach(d => {
      if (!operating(p, d, hol)) return;
      const w = es.filter(e => r[e][d] === 'W').length;
      if (w >= p.min) return;
      const who = es.filter(e => r[e][d] !== 'W').map(e => `${nm(e)} (${r[e][d] === 'L' ? 'leave' : 'off'})`).join(', ');
      const pod = employees.find(e => e.id === es[0])!.pod;
      const spare = (id: string) => r[id][d] === 'C' || (r[id][d] === 'W' && procsOf(id).every(q => !operating(q, d, hol) || empsOf(q.id).filter(o => r[o][d] === 'W').length > q.min));
      const bk = employees.filter(e => !es.includes(e.id) && spare(e.id)).sort((a, b) => Number(b.pod === pod) - Number(a.pod === pod)).slice(0, 3).map(e => `${e.name} (${e.pod})`);
      res.push({ sev: 'error', msg: `${d} · ${p.id}: ${w}/${p.min} covered. Unavailable: ${who}. Possible backup: ${bk.join(', ') || 'none free'}` });
    });
  });
  const ws = weeksOf(ds).filter(w => w.length >= 6.);
  employees.forEach(e => {
    const bad = ws.filter(w => !w.some(d => ['O', 'C', 'L'].includes(r[e.id][d])));
    if (bad.length) res.push({ sev: 'warn', msg: `${e.name}: no weekly off in ${bad.length} week(s) from ${bad.map(w => w[0].slice(5)).join(', ')}. Every assigned process needs cover, so a comp-off or backup is required.` });
  });
  return res.sort((a, b) => (a.sev === 'error' ? 0 : 1) - (b.sev === 'error' ? 0 : 1));
}
