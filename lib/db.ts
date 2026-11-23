import { SEED } from './data';
// Talks to Supabase's REST API (PostgREST). The anon/publishable key is designed to be public.
const U = process.env.NEXT_PUBLIC_SUPABASE_URL;
const K = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
export const dbOn = !!(U && K);
const h: Record<string, string> = { apikey: K || '', 'Content-Type': 'application/json' };
if (K && K.startsWith('eyJ')) h.Authorization = 'Bearer ' + K;
const ok = async (r: Response) => { if (!r.ok) throw new Error(await r.text()); return r; };
export const eq = (c: string, v: string) => `${c}=eq.${encodeURIComponent(v)}`;
export const sel = async (t: string) => (await ok(await fetch(`${U}/rest/v1/${t}?select=*`, { headers: h }))).json();
export const upsert = async (t: string, rows: object[]) => { await ok(await fetch(`${U}/rest/v1/${t}`, { method: 'POST', headers: { ...h, Prefer: 'resolution=merge-duplicates' }, body: JSON.stringify(rows) })); };
export const del = async (t: string, q: string) => { await ok(await fetch(`${U}/rest/v1/${t}?${q}`, { method: 'DELETE', headers: h })); };
const delAll = (t: string, c: string) => del(t, `${c}=not.is.null`);
export const seedDb = async () => {
  await upsert('pods', SEED.pods);
  await upsert('employees', SEED.employees.map(e => ({ id: e.id, name: e.name, pod: e.pod, pref_off: e.prefOff })));
  await upsert('processes', SEED.processes.map(p => ({ id: p.id, brand: p.brand, name: p.name, cal: p.cal, min_staff: p.min })));
  await upsert('assignments', SEED.assigns);
  await upsert('holidays', SEED.holidays.map(date => ({ date })));
  await upsert('leaves', SEED.leaves.map(k => { const [emp, date] = k.split('|'); return { emp, date }; }));
};
export const resetDb = async () => {
  for (const [t, c] of [['assignments', 'emp'], ['leaves', 'emp'], ['employees', 'id'], ['processes', 'id'], ['pods', 'id'], ['holidays', 'date']]) await delAll(t, c);
  await seedDb();
};
