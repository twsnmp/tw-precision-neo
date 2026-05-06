import webview
import os
import json
import pandas as pd
import platform
from datetime import datetime
from .exporter import Exporter
from .storage import SQLiteStorage
from .analysis import AnalysisEngine

# Check for mock
try:
    from tests.mock_driver import MockDriver
    HAS_MOCK = True
except ImportError:
    try:
        from .mock_driver import MockDriver # fallback if moved or in some environments
        HAS_MOCK = True
    except ImportError:
        HAS_MOCK = False

class API:
    def __init__(self, storage):
        self.storage = storage

    def get_data(self):
        df = self.storage.get_all_readings()
        if df.empty:
            return {"readings": [], "tir": {"in_range": 0}}
        
        engine = AnalysisEngine(df)
        tir = engine.get_time_in_range()
        
        # Convert to list of dicts for JSON
        readings = []
        for _, r in df.iterrows():
            readings.append({
                "timestamp": r["timestamp"].strftime("%Y-%m-%d %H:%M"),
                "value": float(r["value"]),
                "unit": r["unit"]
            })
            
        return {
            "readings": readings,
            "tir": tir
        }

    def sync_device(self):
        try:
            # 1. Try to find and sync with a real device
            try:
                import hid
                from glucometerutils.drivers import fsprecisionneo
                
                # Known Vendor/Product IDs for FreeStyle Precision Neo / Optium Neo
                KNOWN_DEVICES = [
                    (0x1a74, 0x2901), # Standard Precision Neo
                    (0x1a61, 0x3850), # ADC P2 (Detected on some macOS systems)
                ]
                
                device_found = False
                for vid, pid in KNOWN_DEVICES:
                    if hid.enumerate(vid, pid):
                        device_found = True
                        print(f"Detected Abbott device: VID={hex(vid)}, PID={hex(pid)}")
                        break
                
                if not device_found:
                    for d in hid.enumerate():
                        manufacturer = d.get('manufacturer_string', '')
                        if manufacturer and "Abbott" in manufacturer:
                            device_found = True
                            print(f"Detected Abbott device by manufacturer: {manufacturer}")
                            break

                if device_found:
                    try:
                        # On macOS, path-based access (e.g. DevSrvsID:...) is very flaky.
                        # Discovery mode (passing None) is much more reliable.
                        if platform.system() == 'Darwin':
                            print("macOS detected: Using discovery mode for HID device.")
                            driver = fsprecisionneo.Device(None)
                        else:
                            # For other platforms, discovery mode is also generally safer
                            driver = fsprecisionneo.Device(None)

                        exporter = Exporter(driver)
                        readings = exporter.fetch_all_readings()
                        count = self.storage.save_readings(readings)
                        return {"message": f"Synced {count} new readings from device."}
                    except Exception as conn_err:
                        print(f"Device connection/sync failed: {conn_err}")
                        # Fall through to mock if in dev
            except (ImportError, Exception) as e:
                print(f"Real device sync skipped or failed: {e}")

            # 2. Fallback to mock if available
            if HAS_MOCK:
                print("Falling back to Mock readings...")
                driver = MockDriver()
                exporter = Exporter(driver)
                readings = exporter.fetch_all_readings()
                count = self.storage.save_readings(readings)
                return {"message": f"Synced {count} new readings (Mock)."}
            else:
                return {"message": "Error: Device not found. Please ensure your FreeStyle Precision Neo is connected and try again."}
        except Exception as e:
            return {"message": f"Error: {e}"}

    def export_csv(self, data):
        try:
            if not data:
                return {"message": "No data to export."}
                
            window = webview.active_window()
            save_path = window.create_file_dialog(
                webview.SAVE_DIALOG, 
                directory=os.path.expanduser("~"), 
                save_filename="glucose_readings.csv",
                file_types=("CSV files (*.csv)", "All files (*.*)")
            )
            
            if not save_path:
                return {"message": "Export cancelled."}
            
            # Use the first path if it's a list (some platforms return lists)
            if isinstance(save_path, (list, tuple)):
                save_path = save_path[0]
                
            df = pd.DataFrame(data)
            df.to_csv(save_path, index=False)
            return {"message": f"Successfully exported to {os.path.basename(save_path)}"}
        except Exception as e:
            return {"message": f"Export failed: {e}"}

def main():
    # Setup data directory
    if os.name == 'nt':
        data_dir = os.path.join(os.environ['LOCALAPPDATA'], "tw_precision_neo")
    else:
        data_dir = os.path.expanduser("~/Library/Application Support/tw_precision_neo")
        
    os.makedirs(data_dir, exist_ok=True)
    db_path = os.path.join(data_dir, "tw_precision_neo.db")
    storage = SQLiteStorage(db_path)
    
    api = API(storage)
    
    # Path to assets - checking multiple locations for flexibility
    # 1. assets/ folder in the project root (development)
    # 2. resources/ folder if packaged
    base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__))) # src/
    project_root = os.path.dirname(base_dir)
    
    locations = [
        os.path.join(project_root, "assets", "index.html"),
        os.path.join(os.path.dirname(__file__), "assets", "index.html"),
        "assets/index.html"
    ]
    
    index_path = None
    for loc in locations:
        if os.path.exists(loc):
            index_path = loc
            break
            
    if not index_path:
        # Emergency fallback or error
        print("Warning: index.html not found!")
        index_path = "assets/index.html"
    
    window = webview.create_window(
        'TW Precision Neo Analyst',
        index_path,
        js_api=api,
        width=1000,
        height=800
    )
    
    webview.start(debug=True)

if __name__ == '__main__':
    main()
