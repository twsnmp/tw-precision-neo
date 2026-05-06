import pytest
import sys
from unittest.mock import MagicMock

# Mock webview before importing app
sys.modules['webview'] = MagicMock()

from tw_precision_neo.app import API

def test_api_instantiation():
    """Verify that the API can be instantiated."""
    class MockStorage:
        pass
    api = API(MockStorage())
    assert api.storage is not None
