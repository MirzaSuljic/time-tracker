# Time Tracker

An Angular 21 + Tailwind CSS v4 client for the Memtime interview API. It lets you browse clients, projects and tasks, log time quickly, and list, create, edit and delete time entries.

## Run it

1. Install dependencies: `npm install`
2. Copy `.env.example` to `.env` and set your key: `API_KEY=...`
3. Start the dev server: `npm start` and open http://localhost:4200
4. Sign in with the demo account `demo@memtime.com` / `demo1234` (or press **Use demo account** on the login page)

Tests: `npm test`

The app calls `/api/v1/...`. The Angular dev server (`proxy.conf.js`) forwards these calls to the real API and adds the `Authorization: Bearer <API_KEY>` header, so the key never ends up in the browser bundle and there are no CORS problems. Restart `npm start` after changing `.env` or `proxy.conf.js`.

## Requirements checklist

| Requirement | Where in the app | Where in the code |
| --- | --- | --- |
| Task 1: clients → projects → tasks | Clients & projects (`/tree`) | `features/tree`, `ApiService.getClientsPage`, `getProjects`, `getTasks` |
| Task 1: pagination | Clients table: Previous / Next, 10 / 25 / 50 per page, Sort by, Order | `ApiService.getAll`, `getClientsPage` |
| Task 2: time entries with ID, Task ID, Comment, Start, End, Created At | Timesheet (`/entries`) | `features/entries`, `ApiService.getTimeEntries` |
| Task 2: pagination with query parameters | `/entries?page=2&size=25&sortBy=start&order=desc` | `EntriesComponent`, `ApiService.listParams` |
| Task 3: create (`POST /time-entries`), success message with the new ID | Quick add on the timesheet, New entry dialog | `QuickAddComponent`, `EntryFormComponent` |
| Task 3: update (`PUT /time-entries/:id`), success message with the updated entry | Edit dialog (`/entries/:id/edit`) | `EntryFormComponent` |
| 400 invalid input | Field messages before sending; after sending, a "400 Bad Request" modal with the server's message | Form validators, `errorInterceptor`, `ModalService` |
| 404 entry not found | A "404 Not Found" modal, and "This entry no longer exists" in the dialog | `EntryFormComponent`, `errorInterceptor`, `ModalService` |
| `Authorization: Bearer <API_KEY>` on every request | Added by the dev proxy | `proxy.conf.js` |
| 15 requests per 60 seconds | Request queue, countdown banner, requests-left indicator | `RateLimiter`, `rateLimitInterceptor` |

Delete (`DELETE /time-entries/:id`) is not required by the task; it is included because correcting a wrong entry is part of everyday time tracking.

## How a user works with it

1. **Sign in.** The login page opens first; after signing in you land where you wanted to go, and your name and email are in the top right corner with a Sign out option.
2. **Morning.** Open the Timesheet. The quick add bar already has your last task selected and the time set to the last hour. Type what you worked on and press Add entry.
3. **The next block.** After saving, the next entry starts where the previous one ended, so a working day is logged without gaps or overlaps. The day's total updates in the list below.
4. **Another task.** Pick one of your recent tasks in the quick add bar, or open Clients & projects, go to client → project → task and press Log time. The dialog opens with that task already selected.
5. **Another day.** "New entry for another day" opens the full dialog with date and time fields, quick-fill buttons and the task picker.
6. **Fixing a mistake.** Edit or delete any entry from its row. The dialog warns if the new times overlap another entry on the page.
7. **End of the week.** Switch the Timesheet to **Week**. Every entry is a block on its day and hour, gaps between entries are dashed boxes and overlapping entries sit side by side with an orange ring. Click a gap or any empty slot to log time there (the dialog opens with that day and time filled in), or click a block to edit it.

## How the UX keeps entries correct

- **Tasks are chosen by name** (client → project → task, or one click on a recent task) instead of typing an ID, so entries land on the right task.
- **End before start is blocked**, and the duration is shown while you type.
- **Warnings without blocking:** entries longer than 12 hours, and entries that overlap another entry on the current page.
- **No empty comments:** a comment made only of spaces is rejected; there is a 500-character limit with a counter.
- **Continuous logging:** after an entry is created, the next one starts at its end time.
- **No accidental overwrites:** in edit mode the form stays locked until the entry has loaded, so default times are never saved over real data.
- **Clear errors:** every failed request opens one modal titled with the status from the API documentation (400 Bad Request, 404 Not Found, 429 Too Many Requests, 500 Internal Server Error) and the server's own message, or the documented description when there is none.
- **No double submits:** buttons are disabled with a spinner while saving or deleting, and delete asks for confirmation in the same modal.

## What is where

| Screen | URL | Task |
| --- | --- | --- |
| Clients | `/tree?page=1&size=10&sortBy=name&order=asc` | Task 1: paginated, sortable clients list (`app-tree`) |
| Client: projects | `/tree/1` | Task 1: client heading in `app-tree-details`, which embeds `app-project-list` |
| Project: tasks | `/tree/1/projects/11` | Task 1: the project's tasks and sub-tasks (`app-project-details` with its heading, `app-task-list` loads and shows the tasks table) |
| Task details | `/tree/1/projects/11/tasks/7` | Task 1: status, project, parent task, sub-tasks and Log time (`app-task-details`) |
| Sign in | `/login?returnUrl=/tree` | Demo login; every other screen requires it |
| Timesheet | `/entries?page=1&size=10&sortBy=start&order=desc` | Task 2: paginated list, grouped by day, plus quick add |
| Timesheet, week | `/entries?view=week&week=2026-10-19` | Calendar of one week (Monday–Sunday) with gaps, overlaps and totals |
| New / edit entry (dialog over the list) | `/entries/new`, `/entries/:id/edit` | Task 3: create, update and delete |

```
src/app/
  core/
    guards/        authGuard (signed in only), guestGuard (login page only when signed out)
    interceptors/  error-interceptor (status → modal), rate-limit-interceptor (queue + 429 retry)
    services/      api.service (all endpoints, cache), auth.service (demo login, session), rate-limiter (15 requests / 60 s), modal.service, recent-tasks
    models/        Client, Project, Task, TimeEntry
    utils/         dates (ISO 8601 <-> local time, durations)
    ui/            icon component, modal component
  features/
    tree/              Task 1, one folder per component, plus tree-utils (shared helpers)
      tree.component   app-tree: clients list with paging and sorting
      tree-details/    app-tree-details: client heading, sidebar path, embeds app-project-list, outlet for deeper levels
      project-list/    app-project-list: loads a client's projects (clientId input)
      project-details/ app-project-details: project heading, embeds app-task-list
      task-list/       app-task-list: loads a project's tasks, table with sub-tasks
      task-details/    app-task-details: one task with parent, sub-tasks and Log time
    login/         demo sign-in page
    entries/       Task 2: timesheet, quick add, delete
      week-view/   week calendar (week-view component, week-utils: layout, gaps, overlaps, totals)
    entry-form/    Task 3: create / edit dialog
```

## Decisions

- **Rate limit (15 requests per minute).** Requests go through a client-side sliding-window queue, so the app waits instead of failing. Every response carries `RateLimit-Remaining` and `RateLimit-Reset`; the limiter syncs with them, so it also knows about requests from other tabs or before a refresh. When the server says 0 are left, the next request waits until the reset. If a 429 still happens, the request is retried after `Retry-After`, or after `RateLimit-Reset` when that header is missing. A banner shows the countdown.
- **Drill-down instead of loading the whole tree.** The task asks for a client → project → task hierarchy. Loading all of it up front costs one request per client and per project and hits the limit at once. The browser shows one level at a time: a clients table, then that client's projects, then that project's tasks, with a sidebar that keeps the path (client → project) and a back button one level up. Each step is one request, results are cached, and the current level lives in the URL. Every level is its own component and route: clients (`app-tree`), a client (`app-tree-details` with its heading, embedding `app-project-list`), a project (`app-project-details`, which holds the heading and embeds `app-task-list`; the task list loads its own data from `clientId` and `projectId` inputs) and one task (`app-task-details`). Project and task pages render through the router outlet of `app-tree-details`, which keeps the sidebar path (client → project → task) and the back button. Going back to all clients restores the page, size and sorting you came from.
- **The API does not say whether a client has projects.** The › next to a client disappears once its projects were loaded and turned out empty.
- **Paging without a total.** List endpoints return plain arrays and no total header. Lists ask for `limit + 1` rows; one extra row means there is a next page. The pager shows the current range ("1–10") and page number. Counting all clients would cost extra requests from the 15-per-minute limit, so a total needs a server-side count.
- **Sorting.** `sortBy` has no default in the API, so it is only sent when the user picks a field; `order` is always sent and defaults to `asc`. Sorting happens on the server, before paging, so page 2 really continues page 1. Page, size, `sortBy` and `order` live in the URL, so refresh and shared links keep them.
- **Week view.** The API has no date filter, so the week is read with `sortBy=start&order=desc` in pages of 50 until an entry starts before Monday (usually one or two requests, at most 500 entries). Weeks are cached and refreshed after any create, update or delete. Blocks are laid out per day: overlapping entries share the column in lanes and get an orange ring, and gaps of 15 minutes or more between entries are shown as dashed boxes. Clicking a gap or an empty slot opens the existing entry dialog with `start` and `end` filled in from the URL, so there is one form, one set of validation and one error handling for both views. The week and the view live in the URL.
- **Timesheet.** Entries are grouped by day with a daily total. The task column shows the task name and its client and project when known, next to the task ID.
- **Transparency about the limit.** The header shows how many requests are left this minute, taken from the server's `RateLimit-Remaining` header.
- **Demo login.** The Memtime API has no users or login endpoint, only one shared key. `AuthService` checks the email and password against a hardcoded demo account (`DEMO_ACCOUNTS`), keeps the session in a signal and in `localStorage` ("Keep me signed in") or `sessionStorage`, and exposes `user`, `initials` and `isLoggedIn`. `authGuard` protects every screen and sends signed-out users to `/login?returnUrl=…`; after signing in they return there (only in-app paths are accepted). The header shows the signed-in user with a menu to sign out. Replacing the demo check with a real backend call only changes `AuthService.login`.
- **One modal for everything.** `ModalService` (`getData`, `open`, `confirm`, `close`, `confirmAction$`) drives a single `<app-modal>` in the app shell. The error interceptor uses it for every failed request, and delete confirmations use it too. A second modal never opens over the first. Background lookups that only fetch a name for display are marked `SILENT_ERRORS` and do not interrupt the user.
- **Errors per level.** Each level of Clients & projects, and the timesheet, keeps a "Try again" button where the data failed to load; the list keeps working after a failed request.
- **Dialog with its own URL.** The entry form opens centred above the list, with the list blurred behind it, but `/entries/5/edit` works on its own, so the back button, refresh and links behave as expected. Esc and a click outside close it.
- **Styling.** Tailwind utilities in the templates, plus a few shared classes in `styles.css` (`card`, `btn`, `input`, `alert-*`). Responsive (the drill-down sidebar stacks above the table on phones) and accessible (labels, focus rings, `aria-current`, tree roles, live regions).

## Testing

`npm test` runs the unit tests (Vitest):

- `dates`: ISO 8601 round trip, duration formatting, shifting times.
- `RateLimiter`: the first 15 requests go out at once, the 16th waits about a minute; the server's `RateLimit-Remaining` and `RateLimit-Reset` are followed.
- `ApiService`: lists ask for `limit + 1` and report a next page; `sortBy` is only sent when chosen; the client list is requested once and shared.
- `flattenTasks`: sub-tasks follow their parent, one level deeper.
- `groupByDay`: entries are grouped per day with the right totals.
- `buildWeek`, `hourRange`, `startOfWeek`, `parseDateKey`: entries land on the right day, overlapping entries get lanes and an overlap total, gaps are found, entries past midnight are split, the visible hours grow for early or late entries.
- `ApiService.getWeekEntries`: reads newest first until it passes Monday, keeps only that week, caches it and reloads after a change. `prefillTimes`: the dialog accepts only valid start and end times from the URL.
- `endAfterStart` and `findOverlap`: end must be after start; overlaps are found, back-to-back entries are not.
- `errorInterceptor` and `ModalService`: each status gets its title and the server message, silent requests stay quiet, modals do not stack, Confirm and Cancel behave as expected.
- `AuthService`, `authGuard`, `guestGuard`, `safeReturnUrl`: demo sign-in, wrong password, remember me, sign out, redirects and safe return URLs.
- Each component is created in a test.

There are no end-to-end tests yet (see below).

## Assumptions

- Times are entered in the browser's local time zone and sent as UTC ISO 8601 (`2026-10-23T08:00:00.000Z`).
- The API's maximum `limit` is not documented. `PAGE_SIZE` (50) in `api.service.ts` and the largest rows-per-page option must stay at or below it.
- Quick add logs time for today; other days use the full dialog.
- Recent tasks are remembered in the browser (localStorage), not on the server.

## Security

- The demo login is not security: the account is hardcoded in the frontend and anyone can read it. It only shows the sign-in flow and the signed-in user; real accounts need a backend (see below).
- `.env` is in `.gitignore`; only `.env.example` is committed. The API key never reaches the browser.
- `TimeEntry` has no `userId` field on purpose, because the API puts the API key there; it is never shown.
- The key in the task description was shared in plain text and should be rotated after review.

## Known limitations

- The API applies `limit`/`offset` before it filters entries by user. A page can therefore come back shorter than the limit even though more entries exist (for example `limit=11` returned 5 entries while a 6th, newer one existed), and the list then shows no next page. The client cannot detect this reliably; the fix belongs on the server (filter first, then paginate). A client-side workaround would be to read all entries in larger pages and paginate in the app.
- The dev proxy only works with `ng serve`. A real deployment needs a backend or serverless function that holds the key.
- The API has no search, date filters or total counts. Day totals and the overlap warning in the list therefore only cover the entries on the current page; the week view reads the whole week instead.

## If this were part of a larger product

- **Accounts instead of a shared key:** users sign in, and a small backend calls Memtime with each user's own credentials.
- **Server-side filters and totals:** date ranges, search and weekly or monthly totals computed on the server, so they are correct across all pages.
- **A start/stop timer** next to manual entry, **drag to create or resize** blocks in the week view, and **submitting a week** for approval.
- **A date filter on the API** (`from`/`to`), so the week view does not have to read entries newest first.
- **Task search across all clients**, favourites, and recent tasks stored on the server so they follow the user between devices.
- **Overlap and gap checks on the server**, against all of the user's entries, not just the current page.
- **Offline queue:** entries made without a connection are saved and sent later.
- **Quality and operations:** end-to-end tests (Playwright) for logging, editing and deleting, CI on every change, error tracking and request metrics.
- **Product polish:** keyboard shortcuts, an "unsaved changes" guard, dark mode, translations and a shared design system.
