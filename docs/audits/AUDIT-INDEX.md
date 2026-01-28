# PTV-TRMNL Audit Index

**Purpose**: Central registry of all system audits conducted on the PTV-TRMNL codebase.
**Reference**: DEVELOPMENT-RULES.md Section 23 (Audit Compliance)

---

## Audit Registry

| Audit ID | Date | Time | Auditor | Pre-Score | Post-Score | Status |
|----------|------|------|---------|-----------|------------|--------|
| [AUDIT-001](AUDIT-001-20260128-2308.md) | 2026-01-28 | 23:08 UTC | Automated System | 65% | 100% | ✅ Complete |
| [AUDIT-002](AUDIT-002-20260128-1222.md) | 2026-01-28 | 12:22 AEDT | Automated System | N/A | 85% | ⚠️ Conditional |

---

## Audit Types

- **AUDIT-001**: Post-development compliance audit (XSS, colors, licensing)
- **AUDIT-002**: Phase 5 comprehensive audit (sanitization, code, firmware, simulator, docs)

---

## Pending Actions from AUDIT-002

### CRITICAL (Blocking Public Release)
1. Remove hardcoded API keys from `firmware/include/config.h`
2. Rotate exposed API keys (Google Places, Transport Victoria)

### HIGH Priority
1. Connect simulator to live server API
2. Remove Claude/Anthropic references from documentation (60+ occurrences)

### MEDIUM Priority
1. Align simulator Y-positions with firmware
2. Update refresh interval from 30s to 20s
3. Clean up backup files in src/ directories
4. Add `firmware/.pio/` to .gitignore

---

## Next Scheduled Audit

**AUDIT-003**: Post-remediation verification
**Trigger**: After AUDIT-002 critical issues are resolved
**Scope**: Verify all AUDIT-002 remediation actions complete

---

*Last Updated: 2026-01-28 12:22 AEDT*
