# Project memory

## Product intent & audience

- Creator platform with content upload gated by KYC verification status.
- Two user roles: creators (must pass KYC to upload) and admins (bypass KYC gate).

## Brand personality & voice

- Not yet inferred beyond production-quality, non-cookie-cutter design expectations.

## Visual design & UX direction

- Stack: Vite + React (JSX), Tailwind CSS, React hooks, Lucide React icons.
- No additional UI/theme/icon packages unless explicitly requested.

## Decisions, constraints & rationale

- `profiles.kyc_status` field exists but has **no database check constraint** (the `profiles_kyc_status_check` constraint described by the user does not exist).
- Admin panel approval action writes `'approved'` to `profiles.kyc_status`; no code path writes `'verified'`.
- Upload gate in `src/components/UploadContent.tsx` accepts **both** `'verified'` and `'approved'` to avoid locking out admin-approved creators.
- Admins always get the upload form opened immediately regardless of KYC status.
- All current profiles have `kyc_status = 'not_submitted'`; no creator can see the upload form until approved.
- Build passes after the KYC gate change.

## Open questions & assumptions

- KYC status values are inconsistent across the system (`'not_submitted'`, `'unverified'`, `'pending'`, `'verified'`, `'approved'`); should these be standardized?
- Should a real DB check constraint be added to enforce allowed `kyc_status` values?
- Should the admin panel be changed to write `'verified'` instead of `'approved'`, or should `'approved'` become the canonical approved value?