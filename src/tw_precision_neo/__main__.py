import os
import sys
import traceback
from datetime import datetime

# --- EARLY LOGGING SETUP ---
# Redirect stdout/stderr to a file immediately to capture all output/errors on Windows.
def init_early_logging():
    try:
        if os.name == 'nt':
            log_dir = os.path.join(os.environ.get('LOCALAPPDATA', '.'), "tw_precision_neo")
        else:
            log_dir = os.path.expanduser("~/Library/Application Support/tw_precision_neo")
        
        os.makedirs(log_dir, exist_ok=True)
        log_path = os.path.join(log_dir, "startup.log")
        
        # Open in line-buffered mode to ensure logs are written even on crash
        f = open(log_path, "a", buffering=1, encoding="utf-8")
        f.write(f"\n\n=== STARTUP AT {datetime.now()} ===\n")
        sys.stdout = f
        sys.stderr = f
        print(f"Python Version: {sys.version}")
        print(f"Platform: {sys.platform}")
        print(f"Executable: {sys.executable}")
        print(f"Environment: {os.environ.get('TW_DEBUG_HID', 'Normal')}")
        return f
    except Exception as e:
        # If we can't even open the log file, we're in trouble, but let's not crash here
        return None

log_file_handle = init_early_logging()

def run_diagnostics():
    print("--- TW Precision Neo HID Diagnostics ---")
    try:
        import hid
        import platform
        print(f"Platform: {platform.system()} {platform.release()}")

        devices = hid.enumerate()
        if not devices:
            print("No HID devices found. Possible missing hidapi.dll or no devices connected.")
        else:
            print(f"Found {len(devices)} HID devices:")
            target_vids = [0x1a74, 0x1a61]
            for d in devices:
                vid = d['vendor_id']
                pid = d['product_id']
                mfg = d.get('manufacturer_string', 'Unknown')
                prod = d.get('product_string', 'Unknown')

                is_target = vid in target_vids or (mfg and "Abbott" in mfg)
                marker = "[TARGET] " if is_target else "         "
                print(f"{marker}VID: {hex(vid)}, PID: {hex(pid)} | {mfg} - {prod}")
    except Exception as e:
        print(f"Diagnostic Error: {e}")
        traceback.print_exc()
    print("--- End of Diagnostics ---")
    
    # If not redirected, wait for input
    if sys.stdout.isatty():
        input("Press Enter to exit...")

if __name__ == '__main__':
    try:
        if os.environ.get('TW_DEBUG_HID') == '1':
            run_diagnostics()
        else:
            print("Attempting to import main...")
            from .app import main
            print("Import successful. Starting main()...")
            main()
    except Exception as e:
        print(f"\n!!! CRITICAL ERROR DURING STARTUP !!!\n{e}")
        traceback.print_exc()
        sys.exit(1)
    finally:
        if log_file_handle:
            print(f"=== TERMINATED AT {datetime.now()} ===")
            log_file_handle.close()
