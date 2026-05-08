# Spec: TW Precision Neo Analyst (Desktop App via pywebview)

## Objective
Create a privacy-first desktop application using `pywebview` to extract blood glucose readings from a FreeStyle Precision Neo device, analyze patterns, and visualize them using modern web technologies.

## Tech Stack
- **Environment Manager:** [mise](https://mise.jdx.dev/)
- **Language:** Python 3.14+
- **GUI Framework:** [pywebview](https://pywebview.flowrl.com/) for a native-like webview experience.
- **Frontend:** HTML5, CSS3, JavaScript (Vanilla).
- **Charts:** [ECharts](https://echarts.apache.org/) for high-performance interactive visualizations.
- **Backend Libraries:** 
  - `glucometerutils` (via GitHub) & `freestyle-hid`: Device interaction.
  - `pandas`: Data analysis.
  - `sqlite3`: Local data persistence.
- **Packaging:** [Briefcase](https://briefcase.readthedocs.io/) (BeeWare) for macOS/Windows/Linux bundles.
  - **Release Strategy:**
    - macOS: Local build with Apple Notarization via `mise run release-mac`.
    - Windows: Automated builds via GitHub Actions (.msi).

## Key Features
- **Web UI:** Modern, responsive interface built with HTML/CSS.
- **Interactive Dashboards:** High-performance charts for glucose trends using ECharts.
- **Local API:** Python backend serving data to the frontend via pywebview's JS bridge.
- **Privacy First:** Strictly local storage in SQLite; no cloud sync. Data is stored at:
  - macOS: `~/Library/Application Support/tw_precision_neo/tw_precision_neo.db`
  - Windows: `%LOCALAPPDATA%\tw_precision_neo\tw_precision_neo.db`

## Success Criteria
- [x] Successfully boots a `pywebview` window showing a local HTML dashboard.
- [x] Python backend correctly passes synced glucose data to the JavaScript frontend.
- [x] Displays interactive charts that respond to user hovering and filtering.
- [x] Maintains strict local-only data privacy.
- [x] Processes large datasets (50,000+ readings) with sub-second responsiveness.
- [x] Packaged as a native application using Briefcase.
- [x] Versioning and packaging follow PEP 440 and support cross-platform quoting.
