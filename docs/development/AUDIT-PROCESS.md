# PTV-TRMNL Audit Process
**Version**: 1.0.0
**Last Updated**: 2026-01-28
**Author**: Angus Bergman
**License**: CC BY-NC 4.0

---

## Purpose

This document defines the standardized process for conducting compliance audits on the PTV-TRMNL codebase. Following this process ensures consistent, thorough verification of Development Rules compliance.

---

## When to Conduct an Audit

### Mandatory Audits
- **Major Version Release**: Before any MAJOR version bump (X.0.0)
- **Security Concerns**: When security vulnerabilities are reported or suspected
- **Significant Refactoring**: After large-scale code changes
- **New Developer Onboarding**: Before granting commit access

### Recommended Audits
- **Quarterly Review**: Every 3 months for active projects
- **Pre-Deployment**: Before major production deployments
- **Post-Incident**: After any production incidents

---

## Audit Phases

### Phase 1: Preparation (15 minutes)

**Objective**: Gather context and establish baseline.

**Steps**:

1. **Read Current Development Rules**
   ```bash
   cat docs/development/DEVELOPMENT-RULES.md | head -100
   ```
   - Note current version number
   - Review recent changes to rules

2. **Check Git Status**
   ```bash
   git log --oneline -10
   git status
   ```
   - Document current commit hash
   - Ensure working tree is clean

3. **Review Previous Audit** (if exists)
   ```bash
   ls -la docs/reports/AUDIT-*.md
   ```
   - Check previous findings
   - Note any recurring issues

4. **Document Audit Metadata**
   - Date and time
   - Auditor identity
   - Version being audited
   - Reference standards

---

### Phase 2: Security Scan (30 minutes)

**Objective**: Identify security vulnerabilities, particularly XSS risks.

**Steps**:

1. **Check for XSS Vulnerabilities**
   ```bash
   # Find innerHTML usage with user data
   grep -rn 'innerHTML.*\$' public/*.html
   
   # Check for unsanitized stop names
   grep -n '\${stop\.name}' public/*.html
   grep -n '\${stop\.stopName}' public/*.html
   
   # Check for unsanitized addresses
   grep -n '\${.*address}' public/*.html | grep -v sanitize
   
   # Check for unsanitized device names
   grep -n '\${device\.name}' public/*.html | grep -v sanitize
   ```

2. **Verify Sanitization Functions Exist**
   ```bash
   # Check sanitize function in HTML files
   grep -n 'function sanitize' public/*.html
   
   # Should return results for admin.html, admin-v3.html
   ```

3. **Check Server-Side Sanitization**
   ```bash
   # Check for sanitization utility
   ls -la src/utils/sanitize-html.js
   
   # Check usage in server code
   grep -rn 'sanitize' src/*.js src/**/*.js
   ```

4. **Review API Input Handling**
   ```bash
   # Check for direct API response rendering
   grep -rn 'res\.json.*req\.' src/*.js
   ```

**Pass Criteria**:
- [ ] All user input sanitized before HTML rendering
- [ ] `sanitize()` function present in all admin HTML files
- [ ] Server-side sanitization utility available
- [ ] No direct interpolation of `${stop.name}` without sanitize()

---

### Phase 3: Visual Design Compliance (20 minutes)

**Objective**: Verify color palette and design consistency.

**Steps**:

1. **Check for Forbidden Colors**
   ```bash
   # Purple/violet colors (FORBIDDEN)
   grep -rn '#667eea\|#764ba2\|#8b5cf6\|#7c3aed' public/
   
   # Named colors
   grep -rn 'purple\|violet' public/ --include='*.html' --include='*.css'
   
   # Should return 0 results
   ```

2. **Verify Approved Accent Color Used**
   ```bash
   # Indigo-500 (APPROVED)
   grep -c '#6366f1' public/admin.html public/admin-v3.html public/setup-wizard.html
   
   # Should return multiple occurrences per file
   ```

3. **Check CSS Variable Definitions**
   ```bash
   # Verify root variables are correct
   grep -A20 ':root' public/admin-v3.html | head -25
   
   # Should show:
   # --color-accent-primary: #6366f1;
   ```

4. **Visual Consistency Check** (Manual)
   - Open admin panel in browser
   - Verify consistent color scheme
   - Check button styles match
   - Verify no jarring color inconsistencies

**Pass Criteria**:
- [ ] Zero occurrences of forbidden colors (#667eea, #8b5cf6, etc.)
- [ ] Approved indigo-500 (#6366f1) used for accents
- [ ] CSS variables properly defined
- [ ] Visual consistency across all pages

---

### Phase 4: License Compliance (15 minutes)

**Objective**: Verify all files have correct license headers.

**Steps**:

1. **Check JavaScript Files**
   ```bash
   # Count files with CC BY-NC 4.0
   grep -l 'CC BY-NC 4.0' src/**/*.js | wc -l
   
   # List files WITHOUT license header
   for f in src/**/*.js; do
     if ! grep -q 'CC BY-NC 4.0' "$f"; then
       echo "MISSING LICENSE: $f"
     fi
   done
   ```

2. **Check for Forbidden License Text**
   ```bash
   # "All rights reserved" is NOT allowed
   grep -rn 'All rights reserved' src/
   
   # Should return 0 results
   ```

3. **Verify License File Exists**
   ```bash
   cat LICENSE | head -20
   # Should show CC BY-NC 4.0 license
   ```

4. **Check HTML File Headers**
   ```bash
   # HTML files should have license comment
   grep -l 'CC BY-NC 4.0' public/*.html
   ```

**Pass Criteria**:
- [ ] All src/**/*.js files have CC BY-NC 4.0 header
- [ ] No "All rights reserved" text anywhere
- [ ] LICENSE file present and correct
- [ ] HTML files include license comments

---

### Phase 5: API Terminology Compliance (15 minutes)

**Objective**: Verify no legacy/forbidden API terminology.

**Steps**:

1. **Check for Forbidden Terms**
   ```bash
   # Legacy PTV API references
   grep -rn 'PTV Timetable API\|PTV API v3' src/ public/
   
   # Legacy environment variables
   grep -rn 'PTV_USER_ID\|PTV_API_KEY\|PTV_DEV_ID' src/ public/ .env*
   
   # Old portal references
   grep -rn 'data.vic.gov.au' src/ public/ | grep -v '.git'
   
   # Should return 0 results for all
   ```

2. **Verify Correct Terminology**
   ```bash
   # Should use "Transport for Victoria" or "Transport Victoria"
   grep -rn 'Transport.*Victoria' src/ docs/
   
   # Should use ODATA_API_KEY
   grep -rn 'ODATA_API_KEY' src/
   ```

3. **Check Documentation References**
   ```bash
   # Documentation should reference correct portal
   grep -rn 'opendata.transport.vic.gov.au' docs/
   ```

**Pass Criteria**:
- [ ] No "PTV Timetable API" or "PTV API v3" references
- [ ] No PTV_USER_ID, PTV_API_KEY, PTV_DEV_ID variables
- [ ] Uses ODATA_API_KEY environment variable
- [ ] References opendata.transport.vic.gov.au

---

### Phase 6: Documentation Review (20 minutes)

**Objective**: Verify documentation is current and properly annotated.

**Steps**:

1. **Check for Historical Notices**
   ```bash
   # Files that reference deprecated APIs should have notices
   grep -l 'Historical Notice\|DEPRECATED' docs/guides/ docs/
   ```

2. **Review Key Documentation Files**
   ```bash
   # Check last updated dates
   grep -rn 'Last Updated' docs/development/DEVELOPMENT-RULES.md
   grep -rn 'Last Updated' docs/guides/OPENDATA-VIC-API-GUIDE.md
   ```

3. **Verify Development Rules Version**
   ```bash
   grep 'Version' docs/development/DEVELOPMENT-RULES.md | head -1
   ```

4. **Check README Accuracy**
   ```bash
   # Verify README references correct deployment
   head -50 README.md
   ```

**Pass Criteria**:
- [ ] Deprecated documentation has historical notices
- [ ] Documentation dates are current
- [ ] Development Rules version matches changes
- [ ] README is accurate

---

### Phase 7: Syntax Validation (10 minutes)

**Objective**: Verify all code files are syntactically valid.

**Steps**:

1. **Check JavaScript Syntax**
   ```bash
   # Validate all JS files
   find src -name "*.js" -exec node --check {} \; 2>&1
   
   # Should show no errors
   ```

2. **Check JSON Files**
   ```bash
   # Validate package.json
   node -e "JSON.parse(require('fs').readFileSync('package.json'))"
   
   # Validate other JSON files
   find . -name "*.json" -not -path "./node_modules/*" -exec node -e "JSON.parse(require('fs').readFileSync('{}'))" \;
   ```

3. **Check for Common Syntax Issues**
   ```bash
   # Look for escaped newlines rendered literally
   grep -rn "'\\n" src/*.js
   ```

**Pass Criteria**:
- [ ] All JavaScript files pass `node --check`
- [ ] All JSON files are valid
- [ ] No syntax errors in any source file

---

### Phase 8: Remediation (Variable time)

**Objective**: Fix identified issues.

**For Each Issue Found**:

1. **Document the Issue**
   - File(s) affected
   - Line numbers
   - Severity (HIGH/MEDIUM/LOW)
   - Root cause

2. **Implement Fix**
   - Make minimal, targeted changes
   - Follow Development Rules
   - Test after each change

3. **Verify Fix**
   - Re-run relevant check from Phases 2-7
   - Ensure no regression

4. **Commit with Clear Message**
   ```bash
   git commit -m "<type>: <description>
   
   - Specific changes made
   - Root cause addressed
   - Verification performed"
   ```

**Commit Types**:
- `security:` - Security fixes (XSS, etc.)
- `style:` - Visual/CSS changes
- `fix:` - Bug fixes
- `docs:` - Documentation updates
- `hotfix:` - Emergency fixes

---

### Phase 9: Documentation & Reporting (30 minutes)

**Objective**: Document findings and update rules.

**Steps**:

1. **Create Audit Report**
   - Use template: `docs/reports/AUDIT-REPORT-TEMPLATE.md`
   - Save as: `docs/audits/AUDIT-{SEQ}-{YYYYMMDD}-{HHMM}.md`
   - Update: `docs/audits/AUDIT-INDEX.md` with new entry
   - Include all findings, remediations, and verification

2. **Update Development Rules** (if new patterns found)
   - Add new sections for recurring issues
   - Increment version number
   - Update "Last Updated" date

3. **Commit Documentation**
   ```bash
   git add docs/reports/AUDIT-REPORT-*.md
   git add docs/development/DEVELOPMENT-RULES.md
   git commit -m "docs: Add audit report and update Development Rules"
   ```

4. **Push All Changes**
   ```bash
   git push origin main
   ```

---

## Audit Checklist Summary

```
┌────────────────────────────────────────────────────────────┐
│ PTV-TRMNL AUDIT CHECKLIST                                  │
├────────────────────────────────────────────────────────────┤
│ Phase 1: Preparation                                       │
│   [ ] Read current Development Rules                       │
│   [ ] Document current git commit                          │
│   [ ] Review previous audit (if exists)                    │
├────────────────────────────────────────────────────────────┤
│ Phase 2: Security Scan                                     │
│   [ ] Check for XSS vulnerabilities                        │
│   [ ] Verify sanitization functions exist                  │
│   [ ] Review API input handling                            │
├────────────────────────────────────────────────────────────┤
│ Phase 3: Visual Design Compliance                          │
│   [ ] Check for forbidden colors                           │
│   [ ] Verify approved accent color                         │
│   [ ] Visual consistency check                             │
├────────────────────────────────────────────────────────────┤
│ Phase 4: License Compliance                                │
│   [ ] Check JavaScript file headers                        │
│   [ ] Check for forbidden license text                     │
│   [ ] Verify LICENSE file                                  │
├────────────────────────────────────────────────────────────┤
│ Phase 5: API Terminology Compliance                        │
│   [ ] Check for forbidden terms                            │
│   [ ] Verify correct terminology                           │
│   [ ] Check documentation references                       │
├────────────────────────────────────────────────────────────┤
│ Phase 6: Documentation Review                              │
│   [ ] Check for historical notices                         │
│   [ ] Verify documentation dates                           │
│   [ ] Check Development Rules version                      │
├────────────────────────────────────────────────────────────┤
│ Phase 7: Syntax Validation                                 │
│   [ ] Check JavaScript syntax                              │
│   [ ] Validate JSON files                                  │
│   [ ] Check for common syntax issues                       │
├────────────────────────────────────────────────────────────┤
│ Phase 8: Remediation                                       │
│   [ ] Document all issues                                  │
│   [ ] Implement fixes                                      │
│   [ ] Verify each fix                                      │
│   [ ] Commit with clear messages                           │
├────────────────────────────────────────────────────────────┤
│ Phase 9: Documentation & Reporting                         │
│   [ ] Create audit report                                  │
│   [ ] Update Development Rules (if needed)                 │
│   [ ] Commit and push all changes                          │
└────────────────────────────────────────────────────────────┘
```

---

## Compliance Scoring

### Category Weights

| Category | Weight | Max Points |
|----------|--------|------------|
| Security (XSS) | 25% | 25 |
| Color Palette | 15% | 15 |
| License Compliance | 15% | 15 |
| API Terminology | 20% | 20 |
| Documentation | 10% | 10 |
| Syntax Validity | 15% | 15 |
| **Total** | **100%** | **100** |

### Scoring Criteria

**Security (25 points)**:
- 25: All user input sanitized, sanitize() function in all HTML files
- 15: Most user input sanitized, minor gaps
- 5: Some sanitization but significant gaps
- 0: No sanitization implemented

**Color Palette (15 points)**:
- 15: Zero forbidden colors, correct accents everywhere
- 10: 1-2 minor color issues
- 5: Multiple color inconsistencies
- 0: Widespread non-compliance

**License Compliance (15 points)**:
- 15: All files have correct CC BY-NC 4.0 headers
- 10: 90%+ files compliant
- 5: 70-89% files compliant
- 0: <70% files compliant

**API Terminology (20 points)**:
- 20: Zero forbidden terms, correct terminology throughout
- 15: 1-2 minor terminology issues
- 10: Several terminology issues in non-critical areas
- 0: Forbidden terms in active code

**Documentation (10 points)**:
- 10: All docs current, historical notices present where needed
- 7: Minor documentation gaps
- 3: Significant documentation outdated
- 0: Documentation largely inaccurate

**Syntax Validity (15 points)**:
- 15: All files pass syntax validation
- 10: Minor warnings, no errors
- 0: Syntax errors present (fails deployment)

### Grade Thresholds

| Score | Grade | Status |
|-------|-------|--------|
| 95-100 | A+ | Production Ready |
| 85-94 | A/B+ | Production Ready (minor notes) |
| 70-84 | C | Requires fixes before deploy |
| 50-69 | D | Significant remediation needed |
| 0-49 | F | Major overhaul required |

---

## Quick Reference Commands

### Full Audit One-Liner

```bash
# Run complete compliance check
echo "=== SECURITY ==="
grep -c 'function sanitize' public/admin.html public/admin-v3.html 2>/dev/null
echo "=== COLORS ==="
grep -c '#667eea\|#8b5cf6' public/*.html 2>/dev/null || echo "0 forbidden colors"
echo "=== LICENSE ==="
grep -l 'CC BY-NC 4.0' src/**/*.js 2>/dev/null | wc -l
echo "=== TERMINOLOGY ==="
grep -c 'PTV_API_KEY\|PTV_DEV_ID' src/*.js 2>/dev/null || echo "0 forbidden terms"
echo "=== SYNTAX ==="
find src -name "*.js" -exec node --check {} \; 2>&1 | grep -c "SyntaxError" || echo "0 syntax errors"
```

---

## Related Documents

- **DEVELOPMENT-RULES.md** - Authoritative compliance standards (Section 23 references this process)
- **AUDIT-REPORT-YYYY-MM-DD.md** - Individual audit reports
- **ATTRIBUTION.md** - License and attribution requirements
- **LICENSE** - CC BY-NC 4.0 license text

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | 2026-01-28 | Initial audit process document |

---

*This document defines the official audit process for PTV-TRMNL. All audits should follow this methodology for consistency.*
