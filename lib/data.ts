export type Cal = 'D365' | 'NOHOL' | 'NOSUN'; // 365 days | all days except holidays | no Sundays/holidays
export interface Employee { id: string; name: string; pod: string; prefOff: number }
export interface Process { id: string; brand: string; name: string; cal: Cal; min: number }
export const pods = ['Alpha', 'Bravo', 'Charlie', 'Delta', 'Echo'];
export const podLeads: Record<string, string> = { Alpha: 'Riya Shah', Bravo: 'Imran Khan', Charlie: 'Neha Rao', Delta: 'Ajay Nair', Echo: 'Sunita Das' };
export const holidays = ['2026-12-25', '2027-01-01', '2027-01-26'];
const names = 'Aarav Diya Kabir Meera Rohan Sana Vikram Anika Arjun Isha Neel Tara Yash Zoya Dev Kiara Rahul Pooja Samir Nisha Karan Leela Manav Ritu Ishaan Mira Varun Sneha Tejas Uma Waqar Esha'.split(' ');
export const employees: Employee[] = [];
export const processes: Process[] = [];
export const assigns: { emp: string; proc: string }[] = [];
// [process, calendar, min staff, indexes of team members who handle it]
type Cfg = [string, Cal, number, number[]][];
const multi: Cfg[] = [
  [['CS', 'D365', 1, [0, 1]], ['ACC', 'NOSUN', 1, [1, 2]], ['NDR', 'NOHOL', 1, [2]]],
  [['CS', 'D365', 2, [0, 1, 2]], ['NDR', 'NOSUN', 1, [2]]],
  [['CS', 'D365', 1, [0, 1]], ['ACC', 'NOHOL', 1, [1]]],
  [['CS', 'NOHOL', 1, [0]], ['ACC', 'NOSUN', 1, [1]], ['NDR', 'D365', 1, [0, 1]]],
  [['CS', 'NOSUN', 1, [0, 1]], ['Retention', 'NOHOL', 1, [1]]],
];
const mk = (pod: string) => { const i = employees.length; const e = { id: 'E' + (i + 1), name: names[i], pod, prefOff: (i * 3 + 1) % 7 }; employees.push(e); return e.id; };
const add = (brand: string, name: string, cal: Cal, min: number, es: string[]) => {
  const id = brand + '-' + name; processes.push({ id, brand, name, cal, min }); es.forEach(emp => assigns.push({ emp, proc: id }));
};
for (let b = 0; b < 25; b++) {
  const brand = 'Brand ' + String.fromCharCode(65 + b), pod = pods[b % 5];
  if (b < 20) { // 20 of 25 brands (80%) have ONE employee handling every process
    const e = mk(pod);
    add(brand, 'CS', b % 10 === 0 ? 'NOHOL' : 'NOSUN', 1, [e]); add(brand, 'ACC', 'NOSUN', 1, [e]);
    if (b % 4 === 0) add(brand, 'NDR', 'NOSUN', 1, [e]);
  } else {
    const cfg = multi[b - 20], n = Math.max(...cfg.flatMap(c => c[3])) + 1;
    const ids = Array.from({ length: n }, () => mk(pod));
    cfg.forEach(([nm, cal, min, ix]) => add(brand, nm, cal, min, ix.map(i => ids[i])));
  }
}
