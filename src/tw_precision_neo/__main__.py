import os
import sys
from .app import main

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

if __name__ == '__main__':
    if os.environ.get('TW_DEBUG_HID') == '1':
        run_diagnostics()
    else:
        main()
