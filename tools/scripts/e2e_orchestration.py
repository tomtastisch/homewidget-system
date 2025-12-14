"""
E2E-Orchestrierungs-CLI.

Modernisierte Version von pipeline_py_helpers.py.
Aufrufe aus ci_steps.sh:

  python -m tools.scripts.e2e_orchestration find-free-port
  python -m tools.scripts.e2e_orchestration wait-for-backend
  python -m tools.scripts.e2e_orchestration seed-e2e
  python -m tools.scripts.e2e_orchestration run-e2e-contracts
"""
from __future__ import annotations

import argparse

from ..workflows import port_commands, e2e_seeding, e2e_contracts


def main(argv: list[str] | None = None) -> int:
    """Haupt-CLI-Dispatcher."""
    parser = argparse.ArgumentParser(
        prog="python -m tools.scripts.e2e_orchestration",
        description="E2E-Orchestrierungs-Kommandos für CI/Playwright-Tests",
    )

    parser.add_argument(
        "command",
        choices=(
            "find-free-port",
            "wait-for-backend",
            "seed-e2e",
            "run-e2e-contracts",
        ),
        help="Auszuführendes Kommando",
    )

    args = parser.parse_args(argv)

    dispatch = {
        "find-free-port": port_commands.find_free_port_cmd,
        "wait-for-backend": port_commands.wait_for_backend_cmd,
        "seed-e2e": e2e_seeding.seed_e2e,
        "run-e2e-contracts": e2e_contracts.run_e2e_contracts,
    }

    handler = dispatch.get(args.command)
    if not handler:
        parser.print_usage()
        return 1

    return handler()


if __name__ == "__main__":
    raise SystemExit(main())
