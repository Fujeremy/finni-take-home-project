# Known limitations and excluded features

This document records deliberate scope decisions for the take-home
submission. The application focuses on creating and viewing patient
records using fictional data in a single provider workspace.

Included functionality and optional enhancements are defined in
[PLAN.md](PLAN.md).

## Excluded features

| Feature | Current limitation |
|---|---|
| Responsive design | Only desktop layouts are supported and verified. Mobile and tablet layouts are outside scope. |
| Patient search | No name search in the initial submission. Users browse the directory to find a patient. |
| Status filtering | The directory shows all statuses without a status filter. |
| Pagination | The initial directory retrieves and displays all patients in one list, without page navigation or a page-size selector. This is intended for the small demonstration dataset; performance with large datasets has not been verified. |
| Patient updates | Saved patient information cannot be edited, including patient status. Corrections and status transitions are outside scope. |
| Archiving and restoring | Patients cannot be archived, hidden through an archive workflow, or restored. The Churned status is a patient status, not an archive mechanism. |
| Hard deletion | Patients cannot be permanently deleted through the UI or API. |
| Address validity checks | No verification that an address exists or is deliverable, ISO country-code membership checks, country-specific postal code/region validation, address lookup, or autocomplete. Input validation rules are defined in PLAN.md §6. |
| Authentication and authorization | No sign-in, user roles, or access controls. The application represents one provider workspace without provider-specific data isolation. |
| Audit history | No activity log or record history showing who created, viewed, or changed patient information. |
| Duplicate detection and merging | No duplicate warnings or patient merging. |
| Bulk operations and data transfer | No bulk entry, CSV import/export, or batch actions. Patients are entered individually. |
| User-controlled sorting | No user-controlled sorting; the fixed order is defined in PLAN.md §7. |
| Production operations | No production deployment setup, automated backup/restore workflow, or production monitoring and alerting. The documented setup runs locally. |

Use fictional patient information only. This submission does not establish
readiness for storing real patient information.
