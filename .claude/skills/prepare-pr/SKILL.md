---
name: prepare-pr
description: Prepare and collaboratively review a pull request title and template-based description for this repository before explicitly approved GitHub publication.
---

# Prepare a pull request together

Read the current repository's `CLAUDE.md`, `PLAN.md`, `PROGRESS.md`, and actual PR template, including HTML comments. Follow the repository's publication and deployment authorization rules. This skill's invocation authorizes local preparation only.

Inspect branch state, the intended base/head diff, and relevant verification evidence. Include uncommitted work when preparing a proposed PR, but distinguish it from the committed diff that GitHub would receive. Do not commit or push during preparation. If the base or scope cannot be established from repository context, ask the developer.

Before drafting, check that the PR is digestible under the `CLAUDE.md` commit and PR criteria. Show `git diff --stat` for the base/head diff and the commit list, and confirm the PR has one reviewable purpose, keeps mechanical changes in their own commits, and contains no unrelated edits. If it fails, propose how to split it and stop instead of drafting. Explain any large or wide diff that remains cohesive.

Draft a concise title and fill every template section while preserving headings, fields, and comments. Describe final behavior, important file responsibilities, actual test results, and material limitations. Mark unrun checks explicitly; never infer success. Do not invent issue references or verification evidence.

## Write it so it's easy to digest

Cover everything that matters, but describe each point simply. The reader should understand a bullet on the first read, without rereading or decoding it.

- **Lead with the outcome.** Start each bullet with what it does or why it matters, then the detail. "Malformed IDs return 404 before reaching the database" beats "`UUID_PATTERN` is checked in the route handler so that…".
- **One idea per bullet, one point per sentence.** If a bullet needs a semicolon or a second clause starting with "and", split it.
- **Use plain words.** Say "the database" rather than restating table and column names, and "rejects" rather than "returns 400 `VALIDATION_ERROR` with `details`" unless the exact code is the point. Explain any term a reviewer new to the code wouldn't know.
- **Keep code formatting for things the reader would type or search for**: file paths, commands, function names. Don't wrap every noun in backticks.
- **Avoid long parentheticals and chained qualifiers.** Move the aside into its own sentence or drop it.
- **Describe behavior, not mechanics.** Say what the code now does; leave how it's written to the diff unless the approach itself needs review.
- **Group related points under a short lead-in** instead of one long bullet with nested sub-clauses.
- **Use concrete examples sparingly**, only when they make a rule clearer than a description would.

Present the exact title, body, base/head branches, and any required commit/push actions for review. Stop here unless the developer has explicitly approved publication of this concrete proposal. Approval of code or a milestone is not publication approval. If the proposal materially changes after approval, present the revised proposal for approval.

Before authorized publication, inspect `.github/workflows` and any known deployment configuration for push/PR deployment triggers. If publication would deploy, explain the trigger and obtain separate deployment authorization first. Do not change automation settings implicitly.

Create a draft PR unless the developer explicitly requests a ready-for-review PR. Use a structured body argument or an exact-text file with `gh --body-file` to preserve newlines and comments. If publication fails or its outcome is uncertain, check whether the PR exists before retrying.

After publication, read back the saved title/body and base/head branches. Verify the body against the template and approved proposal; correct formatting or template omissions within the approved scope. Report the PR URL, draft status, and verification gaps. Do not merge, enable auto-merge, or deploy as part of this workflow.
