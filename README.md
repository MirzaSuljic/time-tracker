# Time Tracker

An Angular 21 + Tailwind CSS v4 client for the Memtime interview API. It lets you browse clients, projects and tasks, log time quickly, and list, create, edit and delete time entries.

## Run it

1. Install dependencies: `npm install`
2. Copy `.env.example` to `.env` and set your key: `API_KEY=...`
3. Start the dev server: `npm start` and open http://localhost:4200

Tests: `npm test`

The app calls `/api/v1/...`. The Angular dev server (`proxy.conf.js`) forwards these calls to the real API and adds the `Authorization: Bearer <API_KEY>` header, so the key never ends up in the browser bundle and there are no CORS problems. Restart `npm start` after changing `.env` or `proxy.conf.js`.

## What is where

| Screen | URL | Task |
| --- | --- | --- |
| Clients & projects | `/tree`, `/tree?client=1`, `/tree?client=1&project=11` | Task 1: clients → projects → tasks and sub-tasks |
| Timesheet | `/entries?page=1&size=10&sortBy=start&order=desc` | Task 2: paginated list, grouped by day, plus quick add |
| New / edit entry (dialog over the list) | `/entries/new`, `/entries/:id/edit` | Task 3: create, update and delete |

```
src/app/
  core/
    interceptors/  error-interceptor (readable messages), rate-limit-interceptor (queue + 429 retry)
    services/      api.service (all endpoints, cache), rate-limiter (15 requests / 60 s), recent-tasks
    models/        Client, Project, Task, TimeEntry
    utils/         dates (ISO 8601 <-> datetime-local, durations)
    ui/            icon component
  features/
    tree/          Task 1
    entries/       Task 2: timesheet, quick add, delete
    entry-form/    Task 3: create / edit dialog
```

## Decisions

- **Rate limit (15 requests per minute).** Requests go through a client-side sliding-window queue, so the app waits instead of failing. A banner shows the countdown. If the server still answers 429 (for example after a page refresh resets the queue), the request is retried after `Retry-After` or 20 seconds.
- **Drill-down instead of loading the whole tree.** The task asks for a client → project → task hierarchy. Loading all of it up front costs one request per client and per project and hits the limit at once. The browser shows one level at a time: a clients table, then that client's projects, then that project's tasks, with a sidebar that keeps the path (client → project) and a back button one level up. Each step is one request, results are cached, and the current level lives in the URL.
- **The API does not say whether a client has projects.** The › next to a client disappears once its projects were loaded and turned out empty.
- **Paging without a total.** List endpoints return plain arrays. The list asks for `limit + 1` rows; one extra row means there is a next page. Page and size live in the URL, so refresh and shared links work.
- **Time entry UX.** Most entries are made from the quick add bar on the timesheet: a recent task, a comment, today's start and end, one click. After saving, the next entry starts where the last one ended, which avoids gaps and overlaps. The full dialog covers other days and tasks: the task is chosen by name (client → project → task) or from recent tasks, with quick-fill buttons, the duration while typing, a block on end before start, and warnings for entries over 12 hours or overlapping an entry on the current page.
- **Timesheet.** Entries are grouped by day with a daily total. The task column shows the task name and its client and project when known, next to the task ID.
- **Transparency about the limit.** The header shows how many requests are left this minute, counted by the client-side limiter.
- **Errors.** 400 and 404 responses are shown as readable messages next to the form. Opening an entry that does not exist shows a clear "no longer exists" state. Each tree branch has its own error and "Try again" button.
- **Modal with its own URL.** The form opens above the list, but `/entries/5/edit` works on its own, so the back button, refresh and links behave as expected.
- **Styling.** Tailwind utilities in the templates, plus a few shared classes in `styles.css` (`card`, `btn`, `input`, `alert-*`). Responsive (the drill-down sidebar stacks above the table on phones) and accessible (labels, focus rings, `aria-current`, tree roles, live regions).

## Known limitations and next steps

- The dev proxy only works with `ng serve`. A real deployment needs a small backend or serverless function that holds the key, ideally with each user's own credentials.
- The API has no search or date filters, and no total counts. Day totals and the overlap warning therefore only cover the entries on the current page. With filters, the list could get a date range, search and page numbers.
- Recent tasks are remembered in the browser (localStorage), not on the server.
- The maximum `limit` is not documented. `PAGE_SIZE` in `api.service.ts` and the largest rows-per-page option must stay at or below it.
- Next: start/stop timer, task search across all clients, switching projects from the sidebar, "unsaved changes" guard, end-to-end tests (Playwright), dark mode.
