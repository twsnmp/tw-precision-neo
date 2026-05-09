import sys
import os

# Fix for Windows Briefcase MSI deployment: ensure DLLs can be loaded
if sys.platform == 'win32':
    try:
        if hasattr(os, 'add_dll_directory'):
            # Add the directory containing the executable (and python3.dll)
            exe_dir = os.path.dirname(sys.executable)
            os.add_dll_directory(exe_dir)
            
            # Add the app_packages directory
            for p in sys.path:
                if p.endswith('app_packages'):
                    os.add_dll_directory(p)
    except Exception:
        pass

import webview
import json
import pandas as pd
import platform
import gc
import traceback
from datetime import datetime
from .exporter import Exporter
from .storage import SQLiteStorage
from . import __version__

# Check for mock
try:
    from .mock_driver import MockDriver
    HAS_MOCK = True
except ImportError:
    HAS_MOCK = False

# Pre-load HID on the main thread to prevent macOS exit crashes.
# cython-hidapi initializes IOHIDManager on import. If imported first
# on a background thread (like pywebview's JS API), it crashes on exit.
try:
    import hid
except ImportError:
    pass

class API:
# ... rest of class ...
    def __init__(self, storage):
        self.storage = storage

    def get_version(self):
        return __version__

    def get_data(self):
        df = self.storage.get_all_readings()
        if df.empty:
            return {"readings": []}

        # Convert to list of dicts for JSON
        readings = []
        for _, r in df.iterrows():
            readings.append({
                "timestamp": r["timestamp"].strftime("%Y-%m-%d %H:%M"),
                "value": float(r["value"]),
                "unit": r["unit"]
            })

        return {
            "readings": readings
        }

    def sync_device(self):
        try:
            # 1. Try to find and sync with a real device
            try:
                import hid
                import time
                from glucometerutils.drivers import fsprecisionneo
                
                # --- MONKEY PATCH FOR WINDOWS HIDAPI ---
                # On Windows, freestyle-hid incorrectly uses HidRaw (standard file I/O) if a path is provided,
                # which causes "Permission denied". We patch HidWrapper.open to use HidApi with open_path instead.
                # Also, cython-hidapi can throw "OSError: read error" if the requested 
                # read size is exactly the report size (64) instead of the report size + 1 (65).
                try:
                    import freestyle_hid._hidwrapper
                    if not hasattr(freestyle_hid._hidwrapper.HidWrapper, '_original_open'):
                        freestyle_hid._hidwrapper.HidWrapper._original_open = freestyle_hid._hidwrapper.HidWrapper.open
                        
                        @staticmethod
                        def patched_open(device_path, vendor_id, product_id):
                            if platform.system() == "Windows":
                                inst = freestyle_hid._hidwrapper.HidApi.__new__(freestyle_hid._hidwrapper.HidApi)
                                inst._handle = hid.device()
                                if device_path:
                                    dp_bytes = str(device_path).encode('utf-8')
                                    inst._handle.open_path(dp_bytes)
                                else:
                                    inst._handle.open(vendor_id, product_id)
                                return inst
                            else:
                                return freestyle_hid._hidwrapper.HidWrapper._original_open(device_path, vendor_id, product_id)
                                
                        freestyle_hid._hidwrapper.HidWrapper.open = patched_open

                    if not hasattr(freestyle_hid._hidwrapper.HidApi, '_original_read'):
                        freestyle_hid._hidwrapper.HidApi._original_read = freestyle_hid._hidwrapper.HidApi.read
                        
                        def patched_read(self, size: int = 64) -> bytes:
                            if platform.system() == "Windows":
                                # Request larger buffer
                                raw_data = bytes(self._handle.read(size + 1, timeout_ms=5000))
                                # On Windows, if Report ID 0 is prepended, the length might be size+1
                                if len(raw_data) == size + 1 and raw_data[0] == 0:
                                    return raw_data[1:]
                                return raw_data[:size]
                            else:
                                return bytes(self._handle.read(size, timeout_ms=0))
                                
                        freestyle_hid._hidwrapper.HidApi.read = patched_read
                except ImportError:
                    pass
                # ---------------------------------------------------
                
                # Known Vendor/Product IDs for FreeStyle Precision Neo / Optium Neo
                # 0x1a74: Abbott, 0x1a61: Abbott Diabetes Care (ADC P2)
                KNOWN_DEVICES = [
                    (0x1a74, 0x2901), # Standard Precision Neo
                    (0x1a61, 0x3850), # ADC P2 (Commonly detected on Windows/macOS)
                ]
                
                target_paths = []
                for vid, pid in KNOWN_DEVICES:
                    enum_results = hid.enumerate(vid, pid)
                    for d in enum_results:
                        target_paths.append((d.get('path'), d))
                
                if not target_paths:
                    for d in hid.enumerate():
                        manufacturer = d.get('manufacturer_string', '')
                        if manufacturer and "Abbott" in manufacturer:
                            target_paths.append((d.get('path'), d))

                if target_paths:
                    last_error = None
                    
                    def safe_cleanup(drv):
                        if not drv:
                            return
                        try:
                            if hasattr(drv, '_session') and hasattr(drv._session, '_handle'):
                                wrapper = drv._session._handle
                                if hasattr(wrapper, '_handle') and hasattr(wrapper._handle, 'close'):
                                    wrapper._handle.close()
                            drv.disconnect()
                        except Exception:
                            pass

                    # On macOS, path-based access is flaky. Discovery mode (passing None) is more reliable.
                    if platform.system() == 'Darwin':
                        target_paths = [(None, target_paths[0][1])]

                    # Try each interface. Some Abbott devices expose multiple HID interfaces
                    # and only one responds to commands.
                    for path_bytes, device_info in target_paths:
                        path = path_bytes
                        if isinstance(path, bytes):
                            path = path.decode('ascii', errors='ignore')

                        max_retries = 2
                        driver = None
                        for attempt in range(max_retries):
                            try:
                                if driver:
                                    safe_cleanup(driver)
                                    del driver
                                    driver = None
                                    gc.collect()
                                    time.sleep(1.0)

                                if attempt > 0:
                                    time.sleep(1.5)
                                
                                driver = fsprecisionneo.Device(path)
                                driver.connect()

                                exporter = Exporter(driver)
                                time.sleep(0.5)
                                readings = exporter.fetch_all_readings()
                                
                                count = self.storage.save_readings(readings)
                                
                                safe_cleanup(driver)
                                del driver
                                driver = None
                                gc.collect()
                                    
                                return {"message": f"Synced {count} new readings from device ({device_info.get('product_string', 'Neo')})."}
                            
                            except OSError as os_err:
                                last_error = os_err
                                if attempt < max_retries - 1:
                                    continue
                            except Exception as e:
                                last_error = e
                                if attempt < max_retries - 1:
                                    continue
                                
                        # If we exhausted retries for this interface, clean up and try the next one
                        if 'driver' in locals() and driver:
                            safe_cleanup(driver)
                            del driver
                            gc.collect()

                    if last_error:
                        print(f"Device sync failed on all interfaces. Last error: {last_error}")

                else:
                    print("No Abbott device detected during sync attempt.")
            except ImportError as imp_err:
                print(f"Module Import Error: {imp_err}")
            except Exception as e:
                print(f"Device connection/sync setup failed: {e}")

            # 2. Fallback to mock if available
            if HAS_MOCK:
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
            
            if not window or not save_path:
                return {"message": "Export cancelled."}
            
            # Use the first path if it's a list (some platforms return lists)
            if isinstance(save_path, (list, tuple)):
                save_path = save_path[0]
                
            df = pd.DataFrame(data)
            df.to_csv(save_path, index=False)
            return {"message": f"Successfully exported to {os.path.basename(save_path)}"}
        except Exception as e:
            return {"message": f"Export failed: {e}"}

    def clear_data(self):
        try:
            self.storage.clear_all_readings()
            return {"message": "All data cleared successfully."}
        except Exception as e:
            return {"message": f"Failed to clear data: {e}"}

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
            break
            
    if not index_path:
        index_path = "assets/index.html"
    
    # App icon path
    icon_path = None
    if platform.system() == "Darwin":
        icns_path = os.path.join(current_dir, "resources", "tw_precision_neo.icns")
        if os.path.exists(icns_path):
            icon_path = icns_path
    
    if not icon_path:
        png_path = os.path.join(current_dir, "resources", "tw_precision_neo.png")
        if os.path.exists(png_path):
            icon_path = png_path
            
    try:
        window = webview.create_window(
            'TW Precision Neo Analyst',
            index_path,
            js_api=api,
            width=1000,
            height=800
        )
        
        # Stabilization:
        # Disable explicit icon passing to avoid .NET crash on Windows and TypeError on macOS.
        # We can set debug=False for a clean production experience.
        webview.start(debug=False)
            
    except Exception as e:
        # Final emergency fallback logging
        if os.name == 'nt':
            log_dir = os.path.join(os.environ.get('LOCALAPPDATA', '.'), "tw_precision_neo")
            os.makedirs(log_dir, exist_ok=True)
            with open(os.path.join(log_dir, "emergency.log"), "a", encoding="utf-8") as f:
                f.write(f"Emergency UI Error: {e}\n")
                traceback.print_exc(file=f)
        raise

if __name__ == '__main__':
    main()
