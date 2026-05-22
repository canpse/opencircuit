import math
import unittest

from opencircuit import CircuitError, solve_circuit


class SimulatorTest(unittest.TestCase):
    def assert_close(self, actual, expected):
        self.assertTrue(
            math.isclose(actual, expected, rel_tol=1e-9, abs_tol=1e-12),
            f"expected {expected}, got {actual}",
        )

    def test_voltage_source_and_resistor_to_ground(self):
        result = solve_circuit(
            {
                "components": [
                    {"id": "V1", "type": "voltage_source", "nodes": ["n1", "gnd"], "value": 5},
                    {"id": "R1", "type": "resistor", "nodes": ["n1", "gnd"], "value": 1000},
                ]
            }
        )

        self.assert_close(result.node_voltages["n1"], 5.0)
        # Positive source current enters the positive terminal; here the source supplies power.
        self.assert_close(result.voltage_source_currents["V1"], -0.005)

    def test_voltage_divider(self):
        result = solve_circuit(
            {
                "components": [
                    {"id": "V1", "type": "voltage_source", "nodes": ["vin", "0"], "value": 10},
                    {"id": "R1", "type": "resistor", "nodes": ["vin", "out"], "value": 1000},
                    {"id": "R2", "type": "resistor", "nodes": ["out", "0"], "value": 1000},
                ]
            }
        )

        self.assert_close(result.node_voltages["vin"], 10.0)
        self.assert_close(result.node_voltages["out"], 5.0)
        self.assert_close(result.voltage_source_currents["V1"], -0.005)

    def test_rejects_floating_circuit(self):
        with self.assertRaises(CircuitError):
            solve_circuit(
                {
                    "components": [
                        {"id": "R1", "type": "resistor", "nodes": ["a", "b"], "value": 1000}
                    ]
                }
            )

    def test_rejects_non_positive_resistor(self):
        with self.assertRaises(CircuitError):
            solve_circuit(
                {
                    "components": [
                        {"id": "R1", "type": "resistor", "nodes": ["a", "gnd"], "value": 0}
                    ]
                }
            )

    def test_rejects_non_finite_value(self):
        with self.assertRaises(CircuitError):
            solve_circuit(
                {
                    "components": [
                        {"id": "V1", "type": "voltage_source", "nodes": ["a", "gnd"], "value": float("inf")}
                    ]
                }
            )


if __name__ == "__main__":
    unittest.main()
