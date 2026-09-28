# Bay Build Board

Make this a separate Lovable project from Reach.

The first version should be your private construction control center. Vendors can get access later.

Send this to @Lovable:

Create a separate mobile-first internal web app called Spacious Bay Construction for managing a multi-home construction project in Port Isabel, Texas.

The project uses house numbers rather than addresses, primarily #5 through #15, with parking/land work at #16–#18.

The app should include:

* Today/Tomorrow Dashboard: complete daily schedule organized by contractor, trade, house number and task
* Confirmation Status: Confirmed, Not Confirmed, Coming, Not Coming, Completed
* Not Scheduled List: automatically show regular contractors missing from tomorrow’s schedule
* Deliveries: kept in a separate section from contractor schedules
* House Pages: one page for each house showing current work, open items, punch lists, inspections, photos and completion status
* Contractor Pages: contractor name, trade, assigned houses, current tasks, completed work and contact information
* Punch Lists: assign each item to a contractor, house, due date and status
* Quotes and Payments: original quote, approved additions, payments, remaining balance, payment method and invoice/quote number
* Payment Safeguards: preview every change before saving, flag possible overages and always record accounting dates as Fridays
* Search and Filters: quickly filter by house, contractor, trade, date or incomplete work

Use realistic sample information for several houses and contractors. The interface should be extremely simple, fast and practical on an iPhone—large tap targets, minimal typing and no corporate-looking clutter.

Do not add vendor logins or complicated permissions yet. First show me the proposed screens, navigation and workflow for approval before building anything.

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://spaciousconstruction.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/3e48b38d-3caa-4baf-9533-73d221b04861).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
