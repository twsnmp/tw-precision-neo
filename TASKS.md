# Tasks: TW Precision Neo Analyst Development

## Phase 1: Project Setup
- [x] Install BeeWare / Briefcase: `pip install briefcase` <!-- id: 0 -->
- [x] Initialize new project: `briefcase new` <!-- id: 1 -->
- [x] Port mock driver to `src/tw_precision_neo/mock_driver.py` (included in package) <!-- id: 2 -->
- [x] Configure `pyproject.toml` and `requirements.txt` with dependencies <!-- id: 3 -->
- [x] Setup environment manager with `mise` (Python 3.14) <!-- id: 20 -->

## Phase 2: Core Logic (Non-GUI)
- [x] Update `exporter.py` for reading from device/mock <!-- id: 4 -->
- [x] Implement SQLite storage in `storage.py` <!-- id: 5 -->
- [x] Implement clinical metrics calculation <!-- id: 6 -->
- [x] Write unit tests for storage and exporter <!-- id: 7 -->

## Phase 3: GUI Development (pywebview)
- [x] Implement Python API bridge in `app.py` <!-- id: 8 -->
- [x] Build HTML/CSS dashboard in `assets/` <!-- id: 9 -->
- [x] Integrate ECharts for trend visualization <!-- id: 10 -->
- [x] Implement Sync logic <!-- id: 11 -->

## Phase 4: Performance Optimization
- [x] Optimize SQLite storage with `executemany` <!-- id: 16 -->
- [x] Optimize data transmission between Python and JS <!-- id: 17 -->
- [x] Implement JS-side chart optimization <!-- id: 18 -->

## Phase 5: Packaging & Distribution
- [x] Run `briefcase dev` for local verification <!-- id: 12 -->
- [x] Run `briefcase build` for macOS app bundle <!-- id: 13 -->
- [x] Create distribution package: `briefcase package` <!-- id: 14 -->
- [x] Document distribution and update flow <!-- id: 15 -->
- [x] Implement Windows CI/CD workflow with MSI and Attestations <!-- id: 21 -->
- [x] Fix versioning (PEP 440) and cross-platform quoting in release tasks <!-- id: 22 -->
