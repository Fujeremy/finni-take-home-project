---
target: patient directory table
total_score: 25
max_score: 40
na_heuristics: 
p0_count: 0
p1_count: 2
target_identity: "file:/Users/jeremy/Documents/Finni-take-home/finni-take-home-project/client/src/features/patients/PatientDirectory.tsx"
target_fingerprint: "sha256:f8eb80a98e4aaaef008c48cf80b8bd7836f2982e7ade10f77532d789d35492dd"
target_path: /Users/jeremy/Documents/Finni-take-home/finni-take-home-project/client/src/features/patients/PatientDirectory.tsx
timestamp: 2026-10-20T19-44-53Z
slug: src-features-patients-patientdirectory-tsx
---
Method: dual-agent (A: ab7e7563154dbeadd · B: a5e52ef7f32d69c18)

## Design health score
| # | Heuristic | Score | Key issue |
|---|---|---|---|
| 1 | Visibility of system status | 3 | Range and counts live; filtered Status trigger barely differs from default |
| 2 | Match system / real world | 3 | Clear status words; DOB without age |
| 3 | User control and freedom | 3 | Status X and Escape work; filters lost on reload |
| 4 | Consistency and standards | 2 | Two clear-X styles; 40px vs 32px controls; Status drops its label when filtered |
| 5 | Error prevention | 3 | Pager ends keep focus |
| 6 | Recognition rather than recall | 2 | Header scrolls away; long text needs hover; sort not on headers |
| 7 | Flexibility and efficiency | 1 | No header sorting, density, or row actions |
| 8 | Aesthetic and minimalist design | 3 | Clean but flat hierarchy |
| 9 | Error recovery | 3 | Precise no-match text |
| 10 | Help and documentation | 2 | Statuses unexplained |
| Total | | 25/40 | Acceptable |

## Design specificity
Stock shadcn data table; interchangeable with any CRM. Status badges are the only product-specific element. Detector: source scan clean; browser found only layout-transition from Sonner's own CSS (false positive).

## Priority issues
1. [P1] Header reads like body text (14px/500 full-black, same as Name). Fix: muted small uppercase or tinted header; sticky header; mute secondary columns. /impeccable typeset
2. [P1] No tabular-nums on DOB/Added; Added 196px vs Name 261px truncating. Fix: tabular-nums, date-only Added (~13%), widen Name, optional age. /impeccable layout
3. [P2] Borders 1.26:1 and focus ring ~1.5:1 fail 3:1. Fix: full-strength ring with offset; borders ~oklch(0.85). /impeccable polish
4. [P2] Inconsistent controls: native blue search X vs ghost Status X; 40px vs 32px; Status loses "Status:" prefix, no active tint. /impeccable polish
5. [P2] Rows hover-highlight but aren't clickable. Remove hover or link to detail page (scope decision). /impeccable distill

## Persona red flags
Alex: no header sorting, pager below fold, no page jump, no density, state lost on reload.
Sam: ~1.5:1 focus ring; 10+ truncated Tab stops per page; no aria-sort.

## Minor observations
Left-edge misalignment (cells px-2 vs search flush); faint disabled Previous; heavy bordered no-match box; no patient count in title; Inquiry/Active similar lightness; no-match reset intentionally removed in #24; dev DB has 53 rows including test rows.

## Questions
Status as tabs with counts? Does Added earn 17% width? Should rows lead somewhere?
