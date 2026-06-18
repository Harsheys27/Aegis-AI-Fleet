# TODO

## Fleet summary table rendering (frontend)
- [ ] Add CSS styles for a new chat summary HTML table (glass look, risk badge colors).
- [ ] Update `chatbot-app/app.js` so that when backend returns a vehicle analysis response, it renders a real HTML `<table>` using JSON fields:
  - vehicle_id
  - driver_name
  - safety_score
  - risk_level
  - confidence
  - total_trips
  - total_exceptions
  - highest_risk_exception
- [ ] Ensure the AI output is rendered as exactly the 3-paragraph "Fleet Analysis Report" only (no markdown table remnants).
- [ ] Remove/ignore any markdown table formatting from the AI response on the frontend (strip leading markdown table lines if present).
- [ ] Wire the layout: table above “Fleet Analysis Report” in the same AI message bubble.

## Testing
- [ ] Run the app, send a vehicle prompt, verify the table displays as HTML (not plain text) and the AI section contains only 3 paragraphs.
