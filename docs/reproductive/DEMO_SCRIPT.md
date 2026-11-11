# Reproductive Health – 4-minute demo script

Uses the public demo page, so no HIS login is needed and only synthetic data is shown.

**Before you start**

1. Put `VITE_REPRO_PUBLIC_DEMO=true` in `.env` and run `npm run dev`.
2. Open `http://localhost:3000/repro-demo` in a fresh browser window at 1280 px or wider.
3. If you have rehearsed already, click **Reset demo data** so the demo date is today and every scenario is as built.

Say up front: *"Decision support and education only. There is no fertility score, no diagnosis and no prescribing. The doctor decides."*

| Time | Do | Say |
| --- | --- | --- |
| **0:00–0:20** | Page opens on **Main demo: improving metabolic health**. Point at the orange **Demo – synthetic data** badge. | "A woman of 33. Everything here is synthetic. Five separate trajectories instead of one number." |
| **0:20–0:55** | Point along the cards: **Reserve in age context – In line with age** (dashed single baseline); **Metabolic and lifestyle – Improving** (HbA1c line 5.9 → 5.4, *Established trend*). Click **Why?** on Metabolic and lifestyle. | "AMH only gives egg-number context, never a pregnancy prediction (NICE NG257 1.18.3). HbA1c has come down over 14 months. Every result shows its rule IDs and citations." Close with Esc. |
| **0:55–1:15** | Right column: **Next steps** → *P3 Preconception counselling* (folic acid); **For your partner** → heat exposure (R20). | "Her partner is linked and shared his lifestyle data, so his step appears here, only from what he chose to share." |
| **1:15–1:35** | Click **العربية** in the header. Hover **AMH** in a card to show the glossary. Click **EN** again. | "The same results in Arabic, right to left, with plain-language definitions of terms." |
| **1:35–2:00** | Click **Patient view**. Scroll once. Click **Clinician view** to go back. | "What the patient sees: large text, *What you can do* first, no rule IDs, no clinician buttons. Same engine, same consent, read-only." |
| **2:00–2:40** | Scroll down, open **How this result was reached**. Point at **9/9 stages**, rules fired, elapsed ms, *Standard wording*. Click **Replay**. Then **Show trace entries**. | "Each stage records what went in and out: consent filter, the Safety Guardrail input check, data mapping, vectors, rules, pathways, explanation, the output check, and brief assembly. There is no diagnosis stage." |
| **2:40–3:00** | Click the scenario **Red-flag symptoms**. | "Red-flag symptoms stop everything: a full-width emergency panel with 998, and the clinician must choose *Acknowledge and refer* or *Not present*, both logged." Open **How this result was reached** to show the branch after stage 2. |
| **3:00–3:15** | Click **One result only**, then **Advance 6 months**. | "One AMH result is only a baseline. Moving the demo forward six months adds a seeded follow-up, and the card becomes a trend." Point at the amber **Demo date** chip. |
| **3:15–3:45** | Click **Population** in the top bar. Show **Overall**, then **Age band**, then **Clinic**. | "Reproductive Insights for 1,000 synthetic patients: state per trajectory, care gaps, male engagement, days to counselling, referrals completed within 90 days. Clinic D has under 50 people, so it shows *Group too small to show*. No individual rows and no export." |
| **3:45–4:00** | Back to **Patient**, scenario **Main demo**. | "Consent is per category and revocable, withdrawn data leaves every calculation at once, and insurers and employers have no access. Your doctor decides." |

**If you have extra time:** on Main demo, open **Discussion brief** and switch the preview to Arabic,
or **Download PDF (English + Arabic)**; or open **Manage consent**, withdraw *Metabolic tests* with a
reason, and show the card switch to *Data withdrawn* (then grant it again).

**Inside the real HIS** (logged in): **EMR → Patient Chart → Reproductive Health** shows the consent
step for a real MRN; **EMR → Reproductive Insights** is the population view.
