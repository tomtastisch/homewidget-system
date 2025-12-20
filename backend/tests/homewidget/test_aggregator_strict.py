from datetime import datetime, timezone
from app.homewidget.providers.aggregator import ProvidersAggregator
from app.homewidget.providers.base import ProviderBase
from app.homewidget.contracts.v1.widget_contracts import WidgetContractV1

class MockProvider(ProviderBase):
    def __init__(self, name, items):
        self._name = name
        self._items = items
    
    @property
    def name(self):
        return self._name
    
    def load_items(self):
        return self._items

def test_aggregator_drops_invalid_widgets():
    # Ein gültiges und ein ungültiges Widget (fehlendes Feld 'name')
    valid_item = {"id": 1, "name": "Valid", "priority": 10, "created_at": datetime.now(timezone.utc)}
    invalid_item = {"id": 2, "priority": 5, "created_at": datetime.now(timezone.utc)}
    
    provider = MockProvider("test", [valid_item, invalid_item])
    aggregator = ProvidersAggregator(providers=[provider])
    
    page = aggregator.load_page()
    
    # Nur das gültige Widget sollte in der Liste sein
    assert len(page.items) == 1
    assert page.items[0].id == 1
    assert page.items[0].name == "Valid"
