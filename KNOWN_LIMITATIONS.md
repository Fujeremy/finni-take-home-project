# Assumptions, limitations, and possible improvements

This document records the deliberate scope decisions for the take-home
submission. The application focuses on creating and viewing patient records
using fictional data in a single provider workspace. Included functionality
and the optional enhancement are defined in [PLAN.md](PLAN.md).

> **Fictional data only.** This submission does not establish readiness for
> storing real patient information.

## Assumptions

- **Fictional data:** all patient information is made up.
- **One workspace:** the app represents a single provider workspace, with no
  sign-in or separate accounts.
- **Shared names are allowed:** different patients may have the same name.
- **Small dataset:** the full patient list fits in one request, so search,
  filtering, sorting, and paging happen in the browser.
- **Shared timezone:** the browser and server are in the same timezone, so
  they agree on what "today" is when checking birth dates.
- **Desktop use:** providers use the app on a desktop browser.

## Limitations

Each limitation describes what the app does today, followed by what a future
version would add.

### Finding patients

- **Search, filtering, and sorting run in the browser.** The API has no
  search, filter, sort, or pagination parameters; the browser works over the
  full list from one request. Search matches names only (not addresses, birth
  dates, or other fields), and sorting is limited to date added and last name.
  *Future:* move these to the server so large lists stay fast.
- **Paging runs in the browser.** This suits the small demonstration dataset;
  performance with large datasets has not been verified.
  *Future:* page on the server so the browser loads one page at a time.

### Managing patient records

- **No editing.** Saved patient information, including status, cannot be
  changed. Corrections and status transitions are outside scope.
- **No archiving or restoring.** The Churned status is a patient status, not
  an archive mechanism.
- **No permanent deletion** through the UI or API.
- **No change tracking.** Patients store only a creation timestamp
  (`created_at`); there is no `updated_at` because records cannot be edited.
  *Future:* add `updated_at`, set on every change, alongside audit history.
- **No duplicate detection** or patient merging.
- **No bulk operations:** no bulk entry, CSV import/export, or batch actions.
  Patients are entered one at a time.

### Addresses and birth dates

- **Addresses are free text.** The country is a two-letter code, with no check
  that it is a real ISO code, no country-specific postal code or region
  validation, no check that the address exists, and no lookup or
  autocomplete. Input rules are defined in PLAN.md §4.
- **Canada/US address controls are deferred until requested.**
  *Future:* country and region dropdowns, country-specific postal validation,
  and the matching schema, migration, and documentation changes.
- **Birth-date checks use each side's local date.** The client and server each
  reject a date of birth after their own local "today". If their timezones
  differ, they could disagree by one day near midnight.
  *Future:* send the browser's IANA timezone with each request (for example in
  an `X-Time-Zone` header) and have the server use it to determine "today".

### Access and accountability

- **No authentication or authorization:** no sign-in, user roles, access
  controls, or provider-specific data isolation.
- **No audit history** of who created, viewed, or changed patient information.

### Interface

- **Desktop only.** Mobile and tablet layouts are not supported or verified.
- **Light theme only.** shadcn's dark theme colors remain in the stylesheet,
  but nothing switches to them.
  *Future:* a theme that follows the system setting, with an optional toggle.

### Operations

- **No production deployment.** There is no deployment setup, automated
  backup and restore, or monitoring and alerting. `npm start` runs the
  production build locally, with Express serving the built client and the API
  on one port.
  *Future:* HTTPS, a managed PostgreSQL database, and migrations run on
  release.

## Possible improvements

In rough priority order, beyond lifting the limitations above:

1. **Editing patients**, with `updated_at` and audit history.
2. **Server-side search, filtering, sorting, and paging**, so the directory
   scales past the demonstration dataset.
3. **Sign-in and access controls** before any real use.
4. **Continuous integration** running tests, typecheck, lint, and build on
   every pull request.
5. **Automated accessibility checks** alongside manual screen-reader testing.
