import webview
import os
import json
import pandas as pd
import platform
import gc
from datetime import datetime
from .exporter import Exporter
from .storage import SQLiteStorage
from .analysis import AnalysisEngine

# Check for mock
try:
    from .mock_driver import MockDriver
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
                import time
                from glucometerutils.drivers import fsprecisionneo
                print("HID and fsprecisionneo modules imported successfully.")
                
                # Known Vendor/Product IDs for FreeStyle Precision Neo / Optium Neo
                # 0x1a74: Abbott, 0x1a61: Abbott Diabetes Care (ADC P2)
                KNOWN_DEVICES = [
                    (0x1a74, 0x2901), # Standard Precision Neo
                    (0x1a61, 0x3850), # ADC P2 (Commonly detected on Windows/macOS)
                ]
                
                device_info = None
                for vid, pid in KNOWN_DEVICES:
                    enum_results = hid.enumerate(vid, pid)
                    if enum_results:
                        device_info = enum_results[0]
                        print(f"Detected Abbott device: VID={hex(vid)}, PID={hex(pid)}, Path={device_info.get('path')}")
                        break
                
                if not device_info:
                    print("No known device IDs found. Enumerating all HID devices...")
                    for d in hid.enumerate():
                        manufacturer = d.get('manufacturer_string', '')
                        if manufacturer and "Abbott" in manufacturer:
                            device_info = d
                            print(f"Detected Abbott device by manufacturer: {manufacturer} (VID={hex(d['vendor_id'])}, PID={hex(d['product_id'])})")
                            break

                if device_info:
                    path = device_info['path']
                    # Some versions of hidapi return bytes for path, others return string
                    if isinstance(path, bytes):
                        path = path.decode('ascii', errors='ignore')

                    # On Windows, opening the HID path directly as a file fails with Permission Denied.
                    # We must pass None to let freestyle-hid use VID/PID via hidapi.
                    if platform.system() == "Windows":
                        print(f"Windows detected. Using VID/PID instead of path: {path}")
                        path = None

                    max_retries = 3
                    driver = None
                    for attempt in range(max_retries):
                        try:
                            # If we have a lingering driver from a failed attempt, clean it up
                            if driver:
                                print("Cleaning up previous driver instance before retry...")
                                del driver
                                driver = None
                                gc.collect()
                                time.sleep(1.0)

                            print(f"Connection attempt {attempt + 1}/{max_retries} using path: {path}")
                            # Wait longer before connection if it's a retry
                            if attempt > 0:
                                time.sleep(2.0)
                            
                            driver = fsprecisionneo.Device(path)
                            print("Device driver initialized successfully.")

                            exporter = Exporter(driver)
                            print("Fetching readings...")
                            # Add a longer delay before first read on Windows
                            time.sleep(1.0 if platform.system() == "Windows" else 0.2)
                            readings = exporter.fetch_all_readings()
                            
                            print(f"Fetched {len(readings)} readings.")
                            count = self.storage.save_readings(readings)
                            return {"message": f"Synced {count} new readings from device ({device_info.get('product_string', 'Neo')})."}
                        
                        except OSError as os_err:
                            print(f"Attempt {attempt + 1} failed with OSError: {os_err}")
                            if attempt < max_retries - 1:
                                print("Retrying after OSError (possibly device busy or read error)...")
                                continue
                            raise
                        except Exception as e:
                            print(f"Attempt {attempt + 1} failed with error: {e}")
                            if attempt < max_retries - 1:
                                continue
                            raise

                else:
                    print("No Abbott device detected during sync attempt.")
            except ImportError as imp_err:
                print(f"Module Import Error: {imp_err}")
            except Exception as e:
                print(f"CRITICAL: Device connection/sync failed: {e}")
                if 'driver' in locals() and driver:
                    del driver
                    gc.collect()
                import traceback
                traceback.print_exc()

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
    # 1. src/tw_precision_neo/assets/ (Preferred for both Dev and Prod now)
    # 2. assets/ folder in the project root (Old development layout)
    
    current_dir = os.path.dirname(os.path.abspath(__file__))
    project_root = os.path.dirname(os.path.dirname(current_dir))
    
    locations = [
        os.path.join(current_dir, "assets", "index.html"),
        os.path.join(project_root, "assets", "index.html"),
    ]
    
    index_path = None
    for loc in locations:
        if os.path.exists(loc):
            index_path = loc
            print(f"Found assets at: {index_path}")
            break
            
    if not index_path:
        print("Error: index.html not found in searched locations:")
        for loc in locations:
            print(f"  - {loc}")
        # Last resort fallback (might fail if CWD is wrong)
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
