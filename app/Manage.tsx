'use client';
import { useState } from 'react';
import { employees, processes, assigns, pods, holidays, Process, Employee } from '../lib/data';
import { upsert, del, eq, resetDb } from '../lib/db';

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const CALS: [string, string][] = [['D365', '365 days (incl. Sundays & holidays)'], ['NOHOL', 'Daily except holidays'], ['NOSUN', 'No Sundays & holidays']];
const empRow = (e: Employee, o: object = {}) => ({ id: e.id, name: e.name, pod: e.pod, pref_off: e.prefOff, ...o });
const procRow = (p: Process, o: object = {}) => ({ id: p.id, brand: p.brand, name: p.name, cal: p.cal, min_staff: p.min, ...o });

export default function Manage({ reload }: { reload: () => Promise<void> }) {
  const [tab, setTab] = useState('Employees');
  const [f, setF] = useState({ name: '', pod: '', brand: '', pname: '', cal: 'NOSUN', min: 1, emp: '', proc: '', date: '' });
  const set = (k: string, v: string | number) => setF(x => ({ ...x, [k]: v }));
  const run = async (...ps: Promise<unknown>[]) => { try { await Promise.all(ps); await reload(); } catch (e) { alert(String(e)); } };
  const pod = f.pod || pods[0], emp = f.emp || employees[0]?.id, proc = f.proc || processes[0]?.id;
  const nextId = 'E' + (Math.max(0, ...employees.map(e => +e.id.slice(1))) + 1);
  const calSel = (v: string, on: (v: string) => void) => <select value={v} onChange={ev => on(ev.target.value)}>{CALS.map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select>;
  return (<div style={{ marginTop: 24 }}>
    <h3>Manage data (saved to the database; the roster regenerates after every change)</h3>
    <div className="bar">{['Employees', 'Processes', 'Assignments', 'Holidays'].map(t => <button key={t} onClick={() => setTab(t)} style={{ fontWeight: t === tab ? 700 : 400 }}>{t}</button>)}
      <button onClick={() => confirm('Reset everything to the sample dataset?') && run(resetDb())}>Reset sample data</button></div>
    <div style={{ maxHeight: 320, overflow: 'auto' }}>
      {tab === 'Employees' && <table><tbody>{employees.map(e => <tr key={e.id}>
        <td><input defaultValue={e.name} onBlur={ev => ev.target.value !== e.name && run(upsert('employees', [empRow(e, { name: ev.target.value })]))} /></td>
        <td><select value={e.pod} onChange={ev => run(upsert('employees', [empRow(e, { pod: ev.target.value })]))}>{pods.map(p => <option key={p}>{p}</option>)}</select></td>
        <td><select value={e.prefOff} onChange={ev => run(upsert('employees', [empRow(e, { pref_off: +ev.target.value })]))}>{DAYS.map((d, i) => <option key={d} value={i}>prefers {d} off</option>)}</select></td>
        <td><button onClick={() => run(del('assignments', eq('emp', e.id)), del('leaves', eq('emp', e.id)), del('employees', eq('id', e.id)))}>Delete</button></td></tr>)}</tbody></table>}
      {tab === 'Processes' && <table><tbody>{processes.map(p => <tr key={p.id}><td className="nm">{p.id}</td>
        <td>{calSel(p.cal, v => run(upsert('processes', [procRow(p, { cal: v })])))}</td>
        <td>min staff <input type="number" min={1} defaultValue={p.min} style={{ width: 50 }} onBlur={ev => +ev.target.value !== p.min && run(upsert('processes', [procRow(p, { min_staff: Math.max(1, +ev.target.value || 1) })]))} /></td>
        <td><button onClick={() => run(del('assignments', eq('proc', p.id)), del('processes', eq('id', p.id)))}>Delete</button></td></tr>)}</tbody></table>}
      {tab === 'Assignments' && <table><tbody>{processes.map(p => <tr key={p.id}><td className="nm">{p.id}</td><td style={{ textAlign: 'left' }}>
        {assigns.filter(a => a.proc === p.id).map(a => <span key={a.emp} style={{ marginRight: 8 }}>{employees.find(e => e.id === a.emp)?.name ?? a.emp} <button onClick={() => run(del('assignments', eq('emp', a.emp) + '&' + eq('proc', a.proc)))}>×</button></span>)}</td></tr>)}</tbody></table>}
      {tab === 'Holidays' && holidays.map(d => <span key={d} style={{ marginRight: 10 }}>{d} <button onClick={() => run(del('holidays', eq('date', d)))}>×</button></span>)}
    </div>
    {tab === 'Employees' && <div className="bar"><input placeholder="New employee name" value={f.name} onChange={ev => set('name', ev.target.value)} />
      <select value={pod} onChange={ev => set('pod', ev.target.value)}>{pods.map(p => <option key={p}>{p}</option>)}</select>
      <button onClick={() => f.name && run(upsert('employees', [{ id: nextId, name: f.name, pod, pref_off: 0 }])).then(() => set('name', ''))}>Add employee</button></div>}
    {tab === 'Processes' && <div className="bar"><input list="brands" placeholder="Brand (new or existing)" value={f.brand} onChange={ev => set('brand', ev.target.value)} />
      <datalist id="brands">{[...new Set(processes.map(p => p.brand))].map(b => <option key={b} value={b} />)}</datalist>
      <input placeholder="Process (CS, ACC, NDR...)" value={f.pname} onChange={ev => set('pname', ev.target.value)} />
      {calSel(f.cal, v => set('cal', v))} min staff <input type="number" min={1} value={f.min} style={{ width: 50 }} onChange={ev => set('min', +ev.target.value)} />
      <button onClick={() => f.brand && f.pname && run(upsert('processes', [{ id: f.brand + '-' + f.pname, brand: f.brand, name: f.pname, cal: f.cal, min_staff: f.min || 1 }]))}>Add process</button></div>}
    {tab === 'Assignments' && <div className="bar"><select value={emp} onChange={ev => set('emp', ev.target.value)}>{employees.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}</select> works on
      <select value={proc} onChange={ev => set('proc', ev.target.value)}>{processes.map(p => <option key={p.id}>{p.id}</option>)}</select>
      <button onClick={() => run(upsert('assignments', [{ emp, proc }]))}>Assign</button></div>}
    {tab === 'Holidays' && <div className="bar"><input type="date" value={f.date} onChange={ev => set('date', ev.target.value)} />
      <button onClick={() => f.date && run(upsert('holidays', [{ date: f.date }]))}>Add holiday</button></div>}
  </div>);
}
