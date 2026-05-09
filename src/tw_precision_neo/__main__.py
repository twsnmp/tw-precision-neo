import os
import sys
import traceback
from datetime import datetime

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
    print("--- End of Diagnostics ---")
    # Keep console open if run manually
    input("Press Enter to exit...")

def setup_crash_logging():
    if os.name == 'nt':
        log_dir = os.path.join(os.environ.get('LOCALAPPDATA', '.'), "tw_precision_neo")
    else:
        log_dir = os.path.expanduser("~/Library/Application Support/tw_precision_neo")
    
    os.makedirs(log_dir, exist_ok=True)
    return os.path.join(log_dir, "crash.log")

if __name__ == '__main__':
    if os.environ.get('TW_DEBUG_HID') == '1':
        run_diagnostics()
    else:
        log_path = setup_crash_logging()
        try:
            from .app import main
            main()
        except Exception:
            with open(log_path, "a", encoding="utf-8") as f:
                f.write(f"\n--- Crash at {datetime.now()} ---\n")
                traceback.print_exc(file=f)
                f.write("-" * 30 + "\n")
            # Also try to print to stderr if a console is attached
            traceback.print_exc()
            sys.exit(1)
