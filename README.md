<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/drive/18J__gEL04ZLdcc-fJH8alawe6qy7bRpq

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Set the `GEMINI_API_KEY` in [.env.local](.env.local) to your Gemini API key
3. Run the app:
   `npm run dev`
# him

## Reproductive Health feature

An EMR feature for the Future Health Digital Innovation Challenge track "[Fertility] Reproductive
Potential". It shows how a patient's reproductive potential is changing over time as **five separate
trajectories** (reserve in age context, cycle and ovulation, metabolic and lifestyle, male factor,
history-based risk) and turns them into evidence-based next steps. It never computes a fertility
score, never diagnoses and never prescribes; every result shows its rule and citation, and the
doctor decides. Consent is per data category and revocable, partners can be linked with both sides'
consent, and there is no insurer or employer access.

Where to find it:

- **Patient chart:** EMR → Patient Chart → tab **Reproductive Health** (consent step first for a real
  patient; Clinician view / Patient view; English / Arabic).
- **Population view:** EMR → **Reproductive Insights** (`/emr/reproductive-population`).
- **Public demo** (no login, synthetic data only, no API calls): `/repro-demo`.

Code: `src/features/reproductive/`. Docs: `docs/reproductive/` — `RULES.md` (every rule, threshold,
citation and assumption), `DATA.md` (where the data comes from), `DEMO_SCRIPT.md` (4-minute demo),
`API_CONTRACT.md` (a future backend), `TEST_REPORT.md` (generated).

### Run it

```bash
npm install
npm run dev
```

Then log in and open a patient chart, or open `http://localhost:3000/repro-demo` with the public demo
enabled (below).

### Tests

```bash
npm test
```

Runs the engine, guardrail, wording, consent, mapper, repository, population, PDF and UI tests (Vitest).

```bash
npm run test:report
```

Runs the 50 JSON test cases and writes `docs/reproductive/TEST_REPORT.md` (benchmark summary,
per-case results with the error-source stage, edge cases, totals by age band, sex and language).

### Environment flags

| Variable | Needed for | Default |
| --- | --- | --- |
| `VITE_API_BASE_URL` | The HIS API (existing; the chart tab reads patient, vitals and lab data through it) | – |
| `VITE_REPRO_PUBLIC_DEMO` | Set to `true` to serve `/repro-demo` outside the login. Any other value: `/repro-demo` goes to normal routing | off |
| `VITE_REPRO_EXPLAIN_URL` | Optional AI wording endpoint. Unset → standard template wording (the default and the fallback) | unset |

All data for this feature, including demo data and partner links, lives in this browser's
localStorage only (see `docs/reproductive/DATA.md`); there is no backend for it yet.
