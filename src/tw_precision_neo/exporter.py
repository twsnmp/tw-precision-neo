from typing import List, Dict, Any, Protocol
from datetime import datetime

class DriverProtocol(Protocol):
    def get_meter_info(self) -> Any: ...
    def get_readings(self) -> Any: ...

class Exporter:
    def __init__(self, driver: DriverProtocol):
        self.driver = driver

    def get_device_info(self) -> Dict[str, str]:
        info = self.driver.get_meter_info()
        return {
            "model": info.model,
            "serial_number": info.serial_number
        }

    def fetch_all_readings(self) -> List[Dict[str, Any]]:
        readings = self.driver.get_readings()
        result = []
        for r in readings:
            # The real driver returns objects with timestamp, value, and sometimes extra metadata
            result.append({
                "timestamp": r.timestamp,
                "value": float(r.value),
                "unit": getattr(r, 'unit', 'mg/dL'), # Default to mg/dL for this device
                "type": getattr(r, 'type', 'Glucose')
            })
        return result
