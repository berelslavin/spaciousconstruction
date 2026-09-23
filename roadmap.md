# Roadmap

- [x] /equipment — standalone worker-only field route for machine custody
  - [x] Cloud database: equipment_assets + equipment_events (GRANTs, RLS, seed list of 10 machines)
  - [x] Private storage bucket equipment-photos with upload/read policies
  - [x] Four very large flows: check out, transfer, return / end-of-day, report issue (severity + photo)
  - [x] No nav into the management app from /equipment; bottom tabs hidden on that route
  - [x] Verified in browser at phone size: all four flows recorded rows, photo stored, no console errors

Open:
- [ ] Replace the starter machine list with the real register (needs the user's equipment list)
- [ ] Management-side view of custody history and issue photos (not requested yet)
