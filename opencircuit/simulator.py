"""DC circuit simulator using Modified Nodal Analysis (MNA)."""

from __future__ import annotations

from dataclasses import dataclass
from math import isfinite
from typing import Any

GROUND_NAMES = {"gnd", "ground", "0"}


class CircuitError(ValueError):
    """Raised when a circuit cannot be simulated."""


@dataclass(frozen=True)
class Component:
    id: str
    type: str
    nodes: tuple[str, str]
    value: float


@dataclass(frozen=True)
class SimulationResult:
    node_voltages: dict[str, float]
    voltage_source_currents: dict[str, float]

    def to_dict(self) -> dict[str, dict[str, float]]:
        return {
            "node_voltages": self.node_voltages,
            "voltage_source_currents": self.voltage_source_currents,
        }


def solve_circuit(circuit: dict[str, Any] | list[dict[str, Any]]) -> SimulationResult:
    """Solve a linear DC circuit.

    Supported components:
    - resistor: two nodes and resistance in ohms
    - voltage_source: two nodes and voltage in volts

    Voltage source current convention: positive current enters the first node
    listed for the source (the positive terminal).
    """

    components = _parse_components(circuit)
    if not components:
        raise CircuitError("Circuit must contain at least one component")

    node_names = sorted(
        {node for component in components for node in component.nodes if not _is_ground(node)}
    )
    if not any(_is_ground(node) for component in components for node in component.nodes):
        raise CircuitError('Circuit must contain a ground node: "gnd", "ground", or "0"')

    voltage_sources = [c for c in components if c.type == "voltage_source"]
    node_index = {node: index for index, node in enumerate(node_names)}
    source_index = {
        source.id: len(node_names) + index for index, source in enumerate(voltage_sources)
    }
    size = len(node_names) + len(voltage_sources)
    matrix = [[0.0 for _ in range(size)] for _ in range(size)]
    rhs = [0.0 for _ in range(size)]

    for component in components:
        if component.type == "resistor":
            _stamp_resistor(matrix, node_index, component)
        elif component.type == "voltage_source":
            _stamp_voltage_source(matrix, rhs, node_index, source_index, component)
        else:
            raise CircuitError(f"Unsupported component type: {component.type!r}")

    try:
        solution = _solve_linear_system(matrix, rhs)
    except ZeroDivisionError as exc:
        raise CircuitError(
            "Circuit matrix is singular; check for floating nodes or conflicting sources"
        ) from exc

    return SimulationResult(
        node_voltages={node: solution[index] for node, index in node_index.items()},
        voltage_source_currents={
            source.id: solution[source_index[source.id]] for source in voltage_sources
        },
    )


def _parse_components(circuit: dict[str, Any] | list[dict[str, Any]]) -> list[Component]:
    raw_components = circuit.get("components") if isinstance(circuit, dict) else circuit
    if not isinstance(raw_components, list):
        raise CircuitError('Circuit must be a list or an object with a "components" list')

    components: list[Component] = []
    seen_ids: set[str] = set()
    for position, raw in enumerate(raw_components, start=1):
        if not isinstance(raw, dict):
            raise CircuitError(f"Component #{position} must be an object")

        component_id = str(raw.get("id") or f"C{position}")
        if component_id in seen_ids:
            raise CircuitError(f"Duplicate component id: {component_id}")
        seen_ids.add(component_id)

        component_type = str(raw.get("type", "")).strip().lower()
        nodes = raw.get("nodes")
        if not isinstance(nodes, (list, tuple)) or len(nodes) != 2:
            raise CircuitError(f"Component {component_id} must have exactly two nodes")

        try:
            value = float(raw["value"])
        except (KeyError, TypeError, ValueError) as exc:
            raise CircuitError(f"Component {component_id} must have a numeric value") from exc

        if not isfinite(value):
            raise CircuitError(f"Component {component_id} must have a finite value")
        if component_type == "resistor" and value <= 0:
            raise CircuitError(f"Resistor {component_id} must have resistance > 0")

        components.append(
            Component(
                id=component_id,
                type=component_type,
                nodes=(str(nodes[0]), str(nodes[1])),
                value=value,
            )
        )
    return components


def _stamp_resistor(
    matrix: list[list[float]], node_index: dict[str, int], component: Component
) -> None:
    a, b = component.nodes
    conductance = 1.0 / component.value
    ia = node_index.get(a)
    ib = node_index.get(b)

    if ia is not None:
        matrix[ia][ia] += conductance
    if ib is not None:
        matrix[ib][ib] += conductance
    if ia is not None and ib is not None:
        matrix[ia][ib] -= conductance
        matrix[ib][ia] -= conductance


def _stamp_voltage_source(
    matrix: list[list[float]],
    rhs: list[float],
    node_index: dict[str, int],
    source_index: dict[str, int],
    component: Component,
) -> None:
    positive, negative = component.nodes
    row = source_index[component.id]
    ip = node_index.get(positive)
    ineg = node_index.get(negative)

    if ip is not None:
        matrix[ip][row] += 1.0
        matrix[row][ip] += 1.0
    if ineg is not None:
        matrix[ineg][row] -= 1.0
        matrix[row][ineg] -= 1.0
    rhs[row] = component.value


def _solve_linear_system(matrix: list[list[float]], rhs: list[float]) -> list[float]:
    """Solve Ax=b with Gaussian elimination and partial pivoting."""
    size = len(rhs)
    a = [row[:] + [rhs_value] for row, rhs_value in zip(matrix, rhs, strict=True)]

    for pivot_col in range(size):
        pivot_row = max(range(pivot_col, size), key=lambda row: abs(a[row][pivot_col]))
        if abs(a[pivot_row][pivot_col]) < 1e-12:
            raise ZeroDivisionError("singular matrix")
        if pivot_row != pivot_col:
            a[pivot_col], a[pivot_row] = a[pivot_row], a[pivot_col]

        pivot = a[pivot_col][pivot_col]
        for col in range(pivot_col, size + 1):
            a[pivot_col][col] /= pivot

        for row in range(size):
            if row == pivot_col:
                continue
            factor = a[row][pivot_col]
            if factor == 0:
                continue
            for col in range(pivot_col, size + 1):
                a[row][col] -= factor * a[pivot_col][col]

    return [a[row][size] for row in range(size)]


def _is_ground(node: str) -> bool:
    return node.strip().lower() in GROUND_NAMES
