# PTV-TRMNL Testing Guide
**MANDATORY COMPLIANCE DOCUMENT**
**Created**: 2026-01-28
**Version**: 1.0.0
**Status**: 🔒 LOCKED - Approved by Angus Bergman

---

## 🚨 CRITICAL: Testing Requirements

**All testing MUST follow these explicit instructions. No exceptions.**

---

## 1️⃣ SIMULATOR-SERVER LIVE PAIRING

**MANDATORY**: The device simulator hosted at `/simulator.html` MUST be live-paired to the Vercel server.

**Requirements**:
- Simulator reflects **real-time data** from server
- Any firmware flash action is visible in simulator
- Setup wizard progress is visible in simulator
- Admin page operations are reflected in simulator
- Data population flows: **Flashing → Setup Wizard → Admin → Live Operation**

**Verification**:
- Open `https://ptvtrmnl.vercel.app/simulator.html` before any testing
- Confirm simulator responds to server state changes
- All actions must be watchable in real-time

---

## 2️⃣ E-INK DISPLAY COMPLIANCE

**MANDATORY**: All device firmware and display content must be **1-bit black and white e-ink compatible**.

**Requirements**:
- ✅ **1-bit depth only** - Pure black (#000000) and white (#FFFFFF)
- ✅ **No grayscale** - No intermediate tones
- ✅ **No animations** - Static content only
- ✅ **No colors** - Monochrome only
- ✅ **Cross-referenced hardware** - Firmware must match internal/external hardware specs

**Prohibited**:
- ❌ RGB colors
- ❌ Grayscale values
- ❌ Animated transitions
- ❌ Fade effects
- ❌ Any content not displayable on 1-bit e-ink

---

## 3️⃣ SIMULATED FIRMWARE TESTING MODE

**MANDATORY**: When in testing mode, all firmware operations must be observable via `/simulator.html`.

**Testing Mode Protocol**:
1. **Observer** opens simulator
2. **Tester** confirms observer can see simulator
3. **Tester** proceeds with firmware flash
4. **Observer** watches flash progress in real-time
5. **Tester** proceeds through setup wizard
6. **Observer** confirms each setup step is visible
7. **Both** verify final dashboard state

---

## 4️⃣ V11 DASHBOARD REQUIREMENT

**MANDATORY**: After successful setup, device MUST display the **v11 locked dashboard** with correct live data.

---

## 5️⃣ MULTI-DEVICE SIMULATOR TESTING

**MANDATORY**: After successful single-device simulation testing, repeat with ALL devices in live simulator.

---

## 6️⃣ TESTING DOCUMENTATION REQUIREMENTS

**MANDATORY**: All testing must be fully recorded with screenshots at every stage.

---

## 7️⃣ ROUTE CALCULATION ACCURACY TESTING

**MANDATORY**: Random sampled devices and configurations must be tested for smart route calculation accuracy.

---

## 8️⃣ VIRTUAL TO PHYSICAL PROGRESSION

**MANDATORY**: All simulator testing must be complete before physical device testing.

---

## 9️⃣ APPROVAL AND NEXT STAGE

**MANDATORY**: Physical device verification must be approved before progressing.

---

**Version**: 1.0.0
**Author**: Lobby (AI Assistant)
**Approved By**: Angus Bergman
**Date**: 2026-01-28
**License**: CC BY-NC 4.0
