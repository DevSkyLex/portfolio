# Signal Forms

- Signal Forms only (`@angular/forms/signals`: `form`, `FormField`, validators, `submit`); Reactive and
  template-driven forms are refused by the guard hook.
- Controls come from `@vfortin/ui` and bind with `[formField]` (`FormValueControl`, `FormCheckboxControl`);
  read state from the field, never mirror it in parallel signals.
- Bounds follow the contract (`libs/contracts/<ctx>`); the browser copy of the limits
  (`CONTACT_FORM_LIMITS`) changes with it, because the browser has no Zod (D10).
- Messages are French `$localize` ids with English targets, saying what to fix; required fields carry
  `aria-required`.
- Server field errors returned by the store are attached to their fields; the honeypot `website` field
  stays invisible and unvalidated (D15); the contact section keeps `@defer (hydrate on viewport)` (D16, D22).
- Admin forms are localized like the rest of the admin (D18) and save with `If-Match` (412 shows the
  conflict).

Details: [UI catalogue](../references/ui-catalogue.md), [SignalStore](../references/signalstore.md).
