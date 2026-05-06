import hid
import platform

def debug_hid():
    print(f"Platform: {platform.system()} {platform.release()}")
    print("--- Searching for HID devices ---")
    
    try:
        devices = hid.enumerate()
        if not devices:
            print("No HID devices found at all. This might indicate a missing backend (hidapi.dll).")
            return

        print(f"Found {len(devices)} HID devices.")
        
        # FreeStyle Precision Neo typically: VID=0x1a74, PID=0x2901
        # Or ADC P2: VID=0x1a61, PID=0x3850
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
        print(f"Error during HID enumeration: {e}")

if __name__ == "__main__":
    debug_hid()
