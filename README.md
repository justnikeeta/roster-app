# Smart Roster Management System
Next.js + TypeScript. Deterministic generator + independent validator.

## Run
```
npm install
npm run dev     # http://localhost:3000
```
Deploy: push to GitHub, import the repo on vercel.com.

## Data
`lib/data.ts`: 32 employees, 5 pods (with leads), 25 brands (20 single-employee = 80%, 5 with 2-3 employees), ~35 processes. Holidays are also there.

## Assumptions
Each employee gets one weekly off per Mon-Sun week; a day when none of their processes operate counts as rest. An employee working several processes covers all of them on a working day. Pod leads are supervisors and are not rostered. Shifts are not modelled.

## How I think
1. **Model:** Employee (pod) - Assignment - Process (brand, calendar D365/NOHOL/NOSUN, min staff). A brand's operating calendar is separate from an employee's own status (W/O/L/C).
2. **Generate/check:** generator picks weekly offs greedily; the validator separately checks every process, every operating day, working staff >= min.
3. **Single vs multi:** single-resource employees pick offs first (fewest peers) and can only take days where all their processes are closed.
4. **Sole employee unavailable:** red GAP on every affected process/day, plus backup suggestions (same pod, free or with spare cover).
5. **Conflicts:** never hidden. Coverage is a hard constraint; preferred off-day is soft. If no safe off day exists, a warning asks for comp-off/backup.
6. **Automated vs human:** offs and validation are automated; leave approval, backups and final publish stay with the manager.
7. **2x scale:** move to Postgres, use a CP-SAT solver for the solve, and re-solve only the affected weeks.
8. **One more week:** database + add/edit screens, comp-offs, approvals, CSV export.

## Database (Supabase)
Run `supabase/schema.sql` in the Supabase SQL editor, then set `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` (see `.env.example`). On first load the app seeds the sample data. Employees, processes (brands, calendars, min staff), assignments and holidays are edited in the "Manage data" panel; leaves are saved too. The roster itself is regenerated from this data, so manual cell edits are not stored. Access is open (no login) for demo purposes.
