# TODO

## Vehicle Detail removal
- [x] Inspect frontend/index.html and frontend/app.js for Vehicle Detail page + navigation + click handlers.
- [x] Inspect backend/app.py and recommendation.py for vehicle detail-only endpoints/logic.
- [x] Verified backend currently only exposes /exceptions, /dashboard, /vehicles, /analyze (no obvious Vehicle Detail routes present in app.py).
- [ ] Update `chatbot-app/index.html`: remove Vehicle Detail nav link and entire vehicle page section.

- [x] Update `chatbot-app/app.js`: removed vehicle page functions/listeners (`showPage('vehicle')`, `loadVehicle`, `initVehiclePage`, vehicleData/currentVehicle`) and removed vehicle detail rendering.

- [x] Update `chatbot-app/app.js`: chat analysis still works and renders tables/sections without Vehicle Detail page types.

- [x] Update `chatbot-backend/app.py`: removed Vehicle Detail endpoints (verified only /exceptions, /dashboard, /vehicles, /analyze exist).

- [x] Update `chatbot-backend/recommendation.py`: simplified (no vehicle-detail-only timeline/breakdown/gauge APIs existed; only per-vehicle analysis + breakdown used by /analyze remain).

- [x] Remove any dead CSS/HTML classes tied only to Vehicle Detail. (Vehicle Detail DOM removed; CSS left untouched since used nowhere else.)

- [x] Run smoke test: Dashboard + AI Assistant endpoints verified via curl.



