"""
Ermöglicht: python -m tools.scripts.e2e_orchestration COMMAND
"""
from . import e2e_orchestration

if __name__ == "__main__":
    raise SystemExit(e2e_orchestration.main())
