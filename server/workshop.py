"""The workshop shares its priced catalogue with the client."""
import json
from pathlib import Path

CATALOGUE = json.loads((Path(__file__).resolve().parents[1] / 'shared' / 'workshop.json').read_text())
