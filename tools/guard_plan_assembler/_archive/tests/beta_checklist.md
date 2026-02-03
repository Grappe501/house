# BETA CHECKLIST — CONTACT-OS (RELEASE GATE)
Version: 1.0
Status: ENFORCED
Last Updated: 2026-01-29

---

## PURPOSE

This document defines the **mandatory beta readiness checklist** for CONTACT-OS.

It is a **release gate**, not guidance.
Failure of any item blocks beta release.

---

## CHECKLIST STRUCTURE

Each checklist item must be:
- objectively verifiable
- repeatable
- logged as pass/fail

No subjective judgment is permitted.

---

## 1. FOUNDATION CHECKS (PHASE 01)

- [ ] Application boots locally without errors
- [ ] Prisma connects successfully to Neon/Postgres
- [ ] No feature logic present outside defined phases
- [ ] Environment variables match `/docs/env.example.md`

Failure blocks release.

---

## 2. DATA MODEL CHECKS (PHASE 02)

- [ ] Database schema matches `/docs/data_model.md`
- [ ] Required tables exist:
  - contacts
  - sources
  - contact_sources
  - tags
  - contact_tags
- [ ] Unique constraints enforced (email, phone_e164)
- [ ] No orphan contacts exist (must have sources)

---

## 3. IMPORT PIPELINE CHECKS (PHASE 03)

- [ ] CSV import completes end-to-end
- [ ] XLSX import completes end-to-end
- [ ] VCF import completes end-to-end
- [ ] ImportBatch record created for each import
- [ ] Source record created for each import
- [ ] Contacts linked to sources
- [ ] Invalid rows reported, not silently skipped
- [ ] No automatic merges occur

---

## 4. DASHBOARD & ACTION CHECKS (PHASE 04)

- [ ] Dashboard renders on mobile viewport
- [ ] Contact list loads correctly
- [ ] Contact detail view shows correct data
- [ ] Call button opens dialer
- [ ] Text button opens messaging app
- [ ] Email button opens email client
- [ ] No automated sending occurs

---

## 5. SEGMENT & COMPOSE CHECKS (PHASE 04)

- [ ] Segments can be created and saved
- [ ] Segment membership is deterministic
- [ ] Segment results match filters
- [ ] Compose works for single contact
- [ ] Compose works for multiple contacts
- [ ] Compose works for segments
- [ ] Compose generates handler links only

---

## 6. AI MODULE CHECKS (PHASE 05, IF ENABLED)

If AI features are disabled:
- [ ] All AI routes are inaccessible

If AI features are enabled:
- [ ] AI Import Assist suggests mappings only
- [ ] AI Dedupe Assist does not merge
- [ ] AI Message Assist drafts only
- [ ] AI never writes to DB
- [ ] AI runs server-side only

---

## 7. EXPORT & OWNERSHIP CHECKS

- [ ] JSON export returns complete dataset
- [ ] CSV export returns flattened contacts
- [ ] Export includes tags and sources
- [ ] Export available regardless of tier
- [ ] Export endpoint requires auth
- [ ] Export data is not logged

---

## 8. PRIVACY & SECURITY CHECKS

- [ ] No PII appears in logs
- [ ] File uploads validated and purged
- [ ] Secrets not present in repo
- [ ] HTTPS enforced
- [ ] AI inputs minimized

---

## 9. RELEASE PROCESS CHECKS

- [ ] plan_guard passes
- [ ] policy_guard passes
- [ ] All required phases CLOSED
- [ ] Version number incremented
- [ ] Release record created

---

## FINAL GATE

All items must be checked before beta release.

If any item fails:
- Release is blocked
- Issue must be resolved
- Checklist rerun

---

END OF BETA CHECKLIST
