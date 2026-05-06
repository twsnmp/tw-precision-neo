# Spec: TW Precision Neo Analyst (Desktop App via pywebview)

## Objective
Create a privacy-first desktop application using `pywebview` to extract blood glucose readings from a FreeStyle Precision Neo device, analyze patterns, and visualize them using modern web technologies.

## Tech Stack
- **Environment Manager:** [mise](https://mise.jdx.dev/)
- **Language:** Python 3.14+
- **GUI Framework:** [pywebview](https://pywebview.flowrl.com/) for a native-like webview experience.
- **Frontend:** HTML5, CSS3, JavaScript (Vanilla).
- **Charts:** [Chart.js](https://www.chartjs.org/) for interactive visualizations.
- **Backend Libraries:** 
  - `glucometerutils` (via GitHub) & `freestyle-hid`: Device interaction.
  - `pandas`: Data analysis.
  - `sqlite3`: Local data persistence.
- **Packaging:** [Briefcase](https://briefcase.readthedocs.io/) (BeeWare) for macOS/Windows/Linux bundles.

## Key Features
- **Web UI:** Modern, responsive interface built with HTML/CSS.
- **Interactive Dashboards:** Zoomable, hoverable charts for glucose trends using Chart.js.
- **Local API:** Python backend serving data to the frontend via pywebview's JS bridge.
- **Privacy First:** Strictly local storage in SQLite; no cloud sync.

## Success Criteria
- [x] Successfully boots a `pywebview` window showing a local HTML dashboard.
- [x] Python backend correctly passes synced glucose data to the JavaScript frontend.
- [x] Displays interactive charts that respond to user hovering and filtering.
- [x] Maintains strict local-only data privacy.
- [x] Processes large datasets (50,000+ readings) with sub-second responsiveness.
- [x] Packaged as a native application using Briefcase.
