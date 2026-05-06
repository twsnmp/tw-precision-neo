import pytest
from tw_precision_neo.exporter import Exporter
from tw_precision_neo.mock_driver import MockDriver

def test_exporter_get_device_info():
    mock_driver = MockDriver()
    exporter = Exporter(mock_driver)
    info = exporter.get_device_info()

    assert info["model"] == "FreeStyle Precision Neo (Mock)"
    assert info["serial_number"] == "MOCK123456"

def test_exporter_fetch_all_readings():
    mock_driver = MockDriver()
    exporter = Exporter(mock_driver)
    readings = exporter.fetch_all_readings()

    assert len(readings) == 3
    assert readings[0]["value"] == 110.0
    assert readings[1]["value"] == 145.0
    assert readings[2]["value"] == 98.0
    assert readings[0]["unit"] == "mg/dL"
    assert "timestamp" in readings[0]
