"""Command line interface for OpenCircuit."""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

from .simulator import CircuitError, solve_circuit


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="Simulate linear DC circuits")
    parser.add_argument("circuit", type=Path, help="JSON circuit file")
    args = parser.parse_args(argv)

    try:
        circuit = json.loads(args.circuit.read_text(encoding="utf-8"))
        result = solve_circuit(circuit)
    except OSError as exc:
        print(f"Could not read {args.circuit}: {exc}", file=sys.stderr)
        return 1
    except json.JSONDecodeError as exc:
        print(f"Invalid JSON: {exc}", file=sys.stderr)
        return 1
    except CircuitError as exc:
        print(f"Circuit error: {exc}", file=sys.stderr)
        return 1

    print(json.dumps(result.to_dict(), indent=2, sort_keys=True))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
