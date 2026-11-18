# English / Arabic

The language switch is in the Header (and on the Login page). The choice is saved in
`localStorage` (`his.lang`) and sets `<html lang dir>`, so Arabic turns the whole page right-to-left.

## Translating a component

```tsx
import { useLanguage } from "../i18n";

const { t, tv, locale } = useLanguage();

<h2>{t("Patient Search")}</h2>                        // interface text
<span>{t("Results ({count})", { count })}</span>      // with values
<Badge>{tv(order.status)}</Badge>                     // backend value: "IN_PROGRESS", "female", "nurse_manager"
{date.toLocaleDateString(locale)}                     // dates in the current language
```

Page components use the non-hook helpers `i18n.t()`, `i18n.tv()` and `i18n.tx()` (imported from
`src/i18n`); `LanguageRoot` in `src/index.tsx` re-renders the app when the language changes.

Then add the Arabic to:

- `ar/ui.ts` for interface text, keyed by the exact English text.
- `ar/pages.ts` for page text, keyed by lower-case English without a trailing `:`, `*` or `...`.
- `ar/values.ts` for fixed backend values, keyed in lower case with spaces (`"in progress"`).

Anything missing falls back to English. In dev, run `[...window.__i18nMissing]` in the browser
console to list the text shown without a translation.

## Rules

- Only translate for display. Never send translated text back to the API or compare against it
  (`if (status === "PENDING")` must keep using the raw value).
- Names, drug names, doses and clinical free text are shown as entered, not translated.
- Use start/end classes so layouts mirror in Arabic: `ms-* me-* ps-* pe-* start-* end-*
  text-start text-end border-s border-e rounded-s rounded-e`. Flip direction icons with `rtl:-scale-x-100`.
- Arabic keeps Western digits (`ar-u-nu-latn`) so doses, IDs and lab values read the same.
- `src/features/reproductive` has its own EN/AR catalogue and toggle; leave it to that feature.
- Every Arabic string is pending review by a native Arabic-speaking clinician; consent forms also
  need legal review before patients sign them in Arabic.
