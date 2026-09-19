# Spacious Bay Construction — proposed screens, navigation and workflow

Mobile-first internal control center for the Port Isabel build. Private to you only in v1 — no logins, no vendor access, no permissions. Houses are numbered #5–#15, with #16–#18 as parking/land.

## Navigation

Five big tabs fixed to the bottom of the screen (thumb reach, large tap targets):

```text
[ Today ]  [ Houses ]  [ Crews ]  [ Punch ]  [ Money ]
```

A search button sits in the top bar on every tab and filters by house, contractor, trade, date, or "incomplete only".

## Screens

### 1. Today (home)
- Toggle at the top: **Today / Tomorrow**.
- Day's work grouped by contractor, each line showing trade, house number and task.
- Each line has one-tap status buttons: Confirmed, Not Confirmed, Coming, Not Coming, Completed. Colour-coded so the day reads at a glance.
- **Not Scheduled** block underneath: regular contractors who have nothing on tomorrow's schedule, with a tap to add them to a house.
- **Deliveries** kept in its own block, clearly separated from crew work: what's arriving, which house, time window, confirmed or not.

### 2. Houses
- Grid of number tiles (#5–#18) with a completion ring and a dot when something needs attention.
- House page: current work today, open items, punch list for that house, inspections with pass/fail and dates, photos, and an overall completion percentage.

### 3. Crews (contractors)
- List by trade with a quick filter.
- Contractor page: name, trade, houses assigned, tasks in progress, completed work, and tap-to-call / tap-to-text contact.

### 4. Punch
- One running list across all houses; filter by house, contractor, or overdue.
- Each item: what, house, assigned contractor, due date, status. Adding an item is four taps and one short line of typing.

### 5. Money (quotes and payments)
- Per contractor and per house: original quote, approved additions, payments made, remaining balance, payment method, invoice/quote number.
- **Safeguards:** every change opens a preview card showing before → after and the new balance before you save. If a payment or addition pushes the total past the approved quote, it shows a clear overage warning and asks you to confirm. Accounting dates always snap to the nearest Friday automatically.

## Workflow (a normal day)

1. Evening: open **Tomorrow**, confirm each crew, see who is missing in Not Scheduled, check deliveries.
2. Morning: open **Today**, mark Coming / Not Coming as trucks show up.
3. During the day: tap a house, add punch items and photos, mark work completed.
4. Friday: open **Money**, record payments, review the preview and overage flags before saving.

## Look and feel

Big type, high contrast, wide tap targets, minimal chrome. Warm coastal neutrals with strong status colours (green confirmed, amber unconfirmed, red not coming, grey completed). Nothing corporate.

## Data in v1

Realistic sample data built in: houses #5–#15 at different stages, #16–#18 land/parking, roughly a dozen contractors across framing, concrete, electrical, plumbing, HVAC, roofing, drywall, paint, tile, and landscaping, with quotes, payments, punch items and inspections. Stored in the app itself; no backend yet, so changes reset on reload. Say the word and I'll add a real database so edits stick.

## Not in v1

Vendor logins, permissions, notifications, file uploads to storage.
