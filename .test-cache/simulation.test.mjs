import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
//#region src/core/catalog.ts
function twoInputGate(type, label, width = 92) {
	return {
		type,
		label,
		width,
		height: 70,
		pins: [
			{
				id: "a",
				kind: "input",
				label: "A",
				offset: {
					x: 0,
					y: 22
				}
			},
			{
				id: "b",
				kind: "input",
				label: "B",
				offset: {
					x: 0,
					y: 48
				}
			},
			{
				id: "out",
				kind: "output",
				label: "out",
				offset: {
					x: width,
					y: 35
				}
			}
		]
	};
}
function block(type, label, inputs, outputs, width = 140) {
	const height = Math.max(74, Math.max(inputs.length, outputs.length) * 24 + 22);
	const pinY = (count, index) => height / 2 - (count - 1) * 24 / 2 + index * 24;
	return {
		type,
		label,
		width,
		height,
		pins: [...inputs.map((id, index) => ({
			id,
			kind: "input",
			label: id,
			offset: {
				x: 0,
				y: pinY(inputs.length, index)
			}
		})), ...outputs.map((id, index) => ({
			id,
			kind: "output",
			label: id,
			offset: {
				x: width,
				y: pinY(outputs.length, index)
			}
		}))]
	};
}
var COMPONENT_DEFINITIONS = {
	input: {
		type: "input",
		label: "Input",
		width: 86,
		height: 52,
		pins: [{
			id: "out",
			kind: "output",
			label: "out",
			offset: {
				x: 86,
				y: 26
			}
		}]
	},
	button: {
		type: "button",
		label: "Pulso",
		width: 86,
		height: 52,
		pins: [{
			id: "out",
			kind: "output",
			label: "out",
			offset: {
				x: 86,
				y: 26
			}
		}]
	},
	led: {
		type: "led",
		label: "LED",
		width: 78,
		height: 52,
		pins: [{
			id: "in",
			kind: "input",
			label: "in",
			offset: {
				x: 0,
				y: 26
			}
		}]
	},
	and: twoInputGate("and", "AND"),
	nand: twoInputGate("nand", "NAND", 104),
	or: twoInputGate("or", "OR"),
	nor: twoInputGate("nor", "NOR"),
	xor: twoInputGate("xor", "XOR"),
	xnor: twoInputGate("xnor", "XNOR", 104),
	not: {
		type: "not",
		label: "NOT",
		width: 82,
		height: 56,
		pins: [{
			id: "in",
			kind: "input",
			label: "in",
			offset: {
				x: 0,
				y: 28
			}
		}, {
			id: "out",
			kind: "output",
			label: "out",
			offset: {
				x: 82,
				y: 28
			}
		}]
	},
	text: {
		type: "text",
		label: "Texto",
		width: 150,
		height: 52,
		pins: []
	},
	"half-adder": block("half-adder", "Meio Somador", ["A", "B"], ["SUM", "CARRY"], 150),
	"full-adder": block("full-adder", "Somador Completo", [
		"A",
		"B",
		"Cin"
	], ["SUM", "Cout"], 170),
	"mux-2-1": block("mux-2-1", "MUX 2:1", [
		"A",
		"B",
		"Sel"
	], ["OUT"], 140),
	"mux-4-1": block("mux-4-1", "MUX 4:1", [
		"D0",
		"D1",
		"D2",
		"D3",
		"S0",
		"S1"
	], ["OUT"], 160),
	"decoder-2-4": block("decoder-2-4", "Decod. 2→4", ["A", "B"], [
		"Y0",
		"Y1",
		"Y2",
		"Y3"
	], 160),
	"comparator-1-bit": block("comparator-1-bit", "Comparador 1 bit", ["A", "B"], [
		"GT",
		"EQ",
		"LT"
	], 170),
	"encoder-4-2": block("encoder-4-2", "Encoder 4→2", [
		"D0",
		"D1",
		"D2",
		"D3"
	], ["Y0", "Y1"], 150),
	"odd-parity-3": block("odd-parity-3", "Paridade Ímpar", [
		"A",
		"B",
		"C"
	], ["OUT"], 160),
	"majority-3": block("majority-3", "Maioria 3 bits", [
		"A",
		"B",
		"C"
	], ["OUT"], 160),
	"half-subtractor": block("half-subtractor", "Meio Subtrator", ["A", "B"], ["DIFF", "BORROW"], 160),
	"full-subtractor": block("full-subtractor", "Subtrator Completo", [
		"A",
		"B",
		"Bin"
	], ["DIFF", "Bout"], 180),
	clock: block("clock", "Clock", [], ["CLK"], 110),
	"d-latch": block("d-latch", "Latch D", ["D", "EN"], ["Q"], 130),
	"d-flip-flop": block("d-flip-flop", "Flip-Flop D", ["D", "CLK"], ["Q"], 150)
};
function getPins(component) {
	return COMPONENT_DEFINITIONS[component.type].pins;
}
//#endregion
//#region src/core/simulation/signals.ts
function initializeValues(circuit, previousValues) {
	const values = {};
	for (const component of circuit.components) {
		values[component.id] = {};
		for (const pin of getPins(component)) values[component.id][pin.id] = previousValues?.[component.id]?.[pin.id] ?? false;
		if (component.type === "input" || component.type === "button") values[component.id].out = Boolean(component.state);
		if (component.type === "clock") values[component.id].CLK = Boolean(component.state);
		if (component.type === "d-latch" || component.type === "d-flip-flop") values[component.id].Q = Boolean(component.memory?.q);
	}
	return values;
}
function simulationResult(values, unstable, iterations) {
	return {
		values,
		unstable,
		iterations,
		state: {
			values: cloneValues(values),
			unstable,
			iterations
		}
	};
}
function cloneValues(values) {
	return Object.fromEntries(Object.entries(values).map(([componentId, pins]) => [componentId, { ...pins }]));
}
function inputValue(circuit, values, componentById, componentId, pinId) {
	const incoming = circuit.wires.find((wire) => wire.to.componentId === componentId && wire.to.pinId === pinId);
	if (!incoming) return false;
	if (!componentById.get(incoming.from.componentId)) return false;
	return readPin(values, incoming.from);
}
function readPin(values, pin) {
	return Boolean(values[pin.componentId]?.[pin.pinId]);
}
function writePin(values, pin, value) {
	if (!values[pin.componentId]) values[pin.componentId] = {};
	if (values[pin.componentId][pin.pinId] === value) return false;
	values[pin.componentId][pin.pinId] = value;
	return true;
}
function writeMany(values, componentId, outputs) {
	return Object.entries(outputs).reduce((changed, [pinId, value]) => writePin(values, {
		componentId,
		pinId
	}, value) || changed, false);
}
//#endregion
//#region src/core/simulation/gates.ts
function evaluateComponent(component, circuit, values, componentById) {
	switch (component.type) {
		case "input":
		case "button": return writePin(values, {
			componentId: component.id,
			pinId: "out"
		}, Boolean(component.state));
		case "clock": return writePin(values, {
			componentId: component.id,
			pinId: "CLK"
		}, Boolean(component.state));
		case "d-latch":
		case "d-flip-flop": return writePin(values, {
			componentId: component.id,
			pinId: "Q"
		}, Boolean(component.memory?.q));
		case "led":
		case "text": return false;
		case "not": return writePin(values, {
			componentId: component.id,
			pinId: "out"
		}, !inputValue(circuit, values, componentById, component.id, "in"));
		case "and": {
			const a = inputValue(circuit, values, componentById, component.id, "a");
			const b = inputValue(circuit, values, componentById, component.id, "b");
			return writePin(values, {
				componentId: component.id,
				pinId: "out"
			}, a && b);
		}
		case "nand": {
			const a = inputValue(circuit, values, componentById, component.id, "a");
			const b = inputValue(circuit, values, componentById, component.id, "b");
			return writePin(values, {
				componentId: component.id,
				pinId: "out"
			}, !(a && b));
		}
		case "or": {
			const a = inputValue(circuit, values, componentById, component.id, "a");
			const b = inputValue(circuit, values, componentById, component.id, "b");
			return writePin(values, {
				componentId: component.id,
				pinId: "out"
			}, a || b);
		}
		case "nor": {
			const a = inputValue(circuit, values, componentById, component.id, "a");
			const b = inputValue(circuit, values, componentById, component.id, "b");
			return writePin(values, {
				componentId: component.id,
				pinId: "out"
			}, !(a || b));
		}
		case "xor": {
			const a = inputValue(circuit, values, componentById, component.id, "a");
			const b = inputValue(circuit, values, componentById, component.id, "b");
			return writePin(values, {
				componentId: component.id,
				pinId: "out"
			}, a !== b);
		}
		case "xnor": {
			const a = inputValue(circuit, values, componentById, component.id, "a");
			const b = inputValue(circuit, values, componentById, component.id, "b");
			return writePin(values, {
				componentId: component.id,
				pinId: "out"
			}, a === b);
		}
		case "half-adder": {
			const a = inputValue(circuit, values, componentById, component.id, "A");
			const b = inputValue(circuit, values, componentById, component.id, "B");
			return writeMany(values, component.id, {
				SUM: a !== b,
				CARRY: a && b
			});
		}
		case "full-adder": {
			const a = inputValue(circuit, values, componentById, component.id, "A");
			const b = inputValue(circuit, values, componentById, component.id, "B");
			const cin = inputValue(circuit, values, componentById, component.id, "Cin");
			return writeMany(values, component.id, {
				SUM: a !== b !== cin,
				Cout: a && b || cin && a !== b
			});
		}
		case "mux-2-1": {
			const a = inputValue(circuit, values, componentById, component.id, "A");
			const b = inputValue(circuit, values, componentById, component.id, "B");
			const sel = inputValue(circuit, values, componentById, component.id, "Sel");
			return writePin(values, {
				componentId: component.id,
				pinId: "OUT"
			}, sel ? b : a);
		}
		case "mux-4-1": {
			const d0 = inputValue(circuit, values, componentById, component.id, "D0");
			const d1 = inputValue(circuit, values, componentById, component.id, "D1");
			const d2 = inputValue(circuit, values, componentById, component.id, "D2");
			const d3 = inputValue(circuit, values, componentById, component.id, "D3");
			const s0 = inputValue(circuit, values, componentById, component.id, "S0");
			const s1 = inputValue(circuit, values, componentById, component.id, "S1");
			return writePin(values, {
				componentId: component.id,
				pinId: "OUT"
			}, s1 ? s0 ? d3 : d2 : s0 ? d1 : d0);
		}
		case "decoder-2-4": {
			const a = inputValue(circuit, values, componentById, component.id, "A");
			const b = inputValue(circuit, values, componentById, component.id, "B");
			return writeMany(values, component.id, {
				Y0: !a && !b,
				Y1: !a && b,
				Y2: a && !b,
				Y3: a && b
			});
		}
		case "comparator-1-bit": {
			const a = inputValue(circuit, values, componentById, component.id, "A");
			const b = inputValue(circuit, values, componentById, component.id, "B");
			return writeMany(values, component.id, {
				GT: a && !b,
				EQ: a === b,
				LT: !a && b
			});
		}
		case "encoder-4-2": {
			const d1 = inputValue(circuit, values, componentById, component.id, "D1");
			const d2 = inputValue(circuit, values, componentById, component.id, "D2");
			const d3 = inputValue(circuit, values, componentById, component.id, "D3");
			return writeMany(values, component.id, {
				Y0: d1 || d3,
				Y1: d2 || d3
			});
		}
		case "odd-parity-3": {
			const a = inputValue(circuit, values, componentById, component.id, "A");
			const b = inputValue(circuit, values, componentById, component.id, "B");
			const c = inputValue(circuit, values, componentById, component.id, "C");
			return writePin(values, {
				componentId: component.id,
				pinId: "OUT"
			}, a !== b !== c);
		}
		case "majority-3": {
			const a = inputValue(circuit, values, componentById, component.id, "A");
			const b = inputValue(circuit, values, componentById, component.id, "B");
			const c = inputValue(circuit, values, componentById, component.id, "C");
			return writePin(values, {
				componentId: component.id,
				pinId: "OUT"
			}, a && b || a && c || b && c);
		}
		case "half-subtractor": {
			const a = inputValue(circuit, values, componentById, component.id, "A");
			const b = inputValue(circuit, values, componentById, component.id, "B");
			return writeMany(values, component.id, {
				DIFF: a !== b,
				BORROW: !a && b
			});
		}
		case "full-subtractor": {
			const a = inputValue(circuit, values, componentById, component.id, "A");
			const b = inputValue(circuit, values, componentById, component.id, "B");
			const bin = inputValue(circuit, values, componentById, component.id, "Bin");
			return writeMany(values, component.id, {
				DIFF: a !== b !== bin,
				Bout: !a && b || bin && !(a !== b)
			});
		}
	}
}
//#endregion
//#region src/core/simulation/simulate.ts
var MAX_ITERATIONS = 64;
function evaluateCircuit(circuit) {
	return simulateCircuit(circuit).values;
}
function simulateCircuit(circuit, previousState) {
	const values = initializeValues(circuit, previousState?.values);
	const componentById = new Map(circuit.components.map((component) => [component.id, component]));
	for (let iteration = 0; iteration < MAX_ITERATIONS; iteration += 1) {
		let changed = false;
		for (const component of circuit.components) changed = evaluateComponent(component, circuit, values, componentById) || changed;
		for (const wire of circuit.wires) {
			const sourceValue = readPin(values, wire.from);
			if (writePin(values, wire.to, sourceValue)) changed = true;
		}
		if (!changed) return simulationResult(values, false, iteration + 1);
	}
	return simulationResult(values, true, MAX_ITERATIONS);
}
//#endregion
//#region src/core/simulation/sequential.ts
function withSequentialDefaults(component) {
	if (component.type === "clock") return {
		...component,
		state: Boolean(component.state)
	};
	if (component.type === "d-latch" || component.type === "d-flip-flop") return {
		...component,
		memory: {
			q: Boolean(component.memory?.q),
			previousClk: Boolean(component.memory?.previousClk)
		}
	};
	return component;
}
function stepCircuit(circuit) {
	const toggledClocks = normalizeSequentialCircuit(circuit);
	const clockedCircuit = {
		...toggledClocks,
		components: toggledClocks.components.map((component) => component.type === "clock" ? {
			...component,
			state: !component.state
		} : component)
	};
	const values = evaluateCircuit(clockedCircuit);
	const componentById = new Map(clockedCircuit.components.map((component) => [component.id, component]));
	return {
		...clockedCircuit,
		components: clockedCircuit.components.map((component) => {
			if (component.type === "d-latch") {
				if (!inputValue(clockedCircuit, values, componentById, component.id, "EN")) return component;
				const d = inputValue(clockedCircuit, values, componentById, component.id, "D");
				return {
					...component,
					memory: {
						...component.memory,
						q: d
					}
				};
			}
			if (component.type === "d-flip-flop") {
				const clk = inputValue(clockedCircuit, values, componentById, component.id, "CLK");
				const previousClk = Boolean(component.memory?.previousClk);
				const d = inputValue(clockedCircuit, values, componentById, component.id, "D");
				return {
					...component,
					memory: {
						...component.memory,
						q: !previousClk && clk ? d : Boolean(component.memory?.q),
						previousClk: clk
					}
				};
			}
			return component;
		})
	};
}
function normalizeSequentialCircuit(circuit) {
	return {
		...circuit,
		components: circuit.components.map(withSequentialDefaults)
	};
}
//#endregion
//#region src/core/simulation/graph.ts
function circuitHasFeedback(circuit) {
	const componentIds = new Set(circuit.components.map((component) => component.id));
	const edges = /* @__PURE__ */ new Map();
	for (const id of componentIds) edges.set(id, []);
	for (const wire of circuit.wires) if (componentIds.has(wire.from.componentId) && componentIds.has(wire.to.componentId)) edges.get(wire.from.componentId)?.push(wire.to.componentId);
	const visiting = /* @__PURE__ */ new Set();
	const visited = /* @__PURE__ */ new Set();
	function visit(id) {
		if (visiting.has(id)) return true;
		if (visited.has(id)) return false;
		visiting.add(id);
		for (const next of edges.get(id) ?? []) if (visit(next)) return true;
		visiting.delete(id);
		visited.add(id);
		return false;
	}
	return Array.from(componentIds).some(visit);
}
//#endregion
//#region tests/core/simulation.test.ts
function loadExample(name) {
	return JSON.parse(readFileSync(join(process.cwd(), "examples/sequential-feedback", name), "utf8"));
}
function setInputs(circuit, values) {
	return {
		...circuit,
		components: circuit.components.map((component) => component.type === "input" && component.id in values ? {
			...component,
			state: values[component.id]
		} : component)
	};
}
function run(circuit, previous) {
	return simulateCircuit(circuit, previous);
}
function led(circuit, state, ledId) {
	const value = state.values[ledId]?.in;
	assert.equal(typeof value, "boolean", `LED ${ledId} não foi avaliado`);
	return value;
}
function pin(state, componentId, pinId) {
	const value = state.values[componentId]?.[pinId];
	assert.equal(typeof value, "boolean", `Pino ${componentId}.${pinId} não foi avaliado`);
	return value;
}
function testCombinationalStillWorks() {
	const values = evaluateCircuit({
		version: 1,
		components: [
			{
				id: "A",
				type: "input",
				x: 0,
				y: 0,
				state: true
			},
			{
				id: "B",
				type: "input",
				x: 0,
				y: 80,
				state: false
			},
			{
				id: "X1",
				type: "xor",
				x: 160,
				y: 20
			},
			{
				id: "OUT",
				type: "led",
				x: 320,
				y: 20
			}
		],
		wires: [
			{
				id: "W1",
				from: {
					componentId: "A",
					pinId: "out"
				},
				to: {
					componentId: "X1",
					pinId: "a"
				}
			},
			{
				id: "W2",
				from: {
					componentId: "B",
					pinId: "out"
				},
				to: {
					componentId: "X1",
					pinId: "b"
				}
			},
			{
				id: "W3",
				from: {
					componentId: "X1",
					pinId: "out"
				},
				to: {
					componentId: "OUT",
					pinId: "in"
				}
			}
		]
	});
	assert.equal(values.OUT.in, true, "XOR deve acender quando entradas são diferentes");
}
function testNorSrLatchKeepsState() {
	let circuit = loadExample("01_sr_latch_nor.json");
	let result = run(circuit);
	circuit = setInputs(circuit, {
		S: true,
		R: false
	});
	result = run(circuit, result.state);
	assert.equal(result.unstable, false, "SR NOR set não deveria oscilar");
	assert.equal(led(circuit, result.state, "Q"), true, "S=1 deve setar Q");
	assert.equal(led(circuit, result.state, "QB"), false, "S=1 deve apagar !Q");
	circuit = setInputs(circuit, {
		S: false,
		R: false
	});
	result = run(circuit, result.state);
	assert.equal(led(circuit, result.state, "Q"), true, "S=R=0 deve manter Q=1 após set");
	circuit = setInputs(circuit, {
		S: false,
		R: true
	});
	result = run(circuit, result.state);
	assert.equal(result.unstable, false, "SR NOR reset não deveria oscilar");
	assert.equal(led(circuit, result.state, "Q"), false, "R=1 deve resetar Q");
	assert.equal(led(circuit, result.state, "QB"), true, "R=1 deve setar !Q");
	circuit = setInputs(circuit, {
		S: false,
		R: false
	});
	result = run(circuit, result.state);
	assert.equal(led(circuit, result.state, "Q"), false, "S=R=0 deve manter Q=0 após reset");
}
function testNandSrLatchActiveLowKeepsState() {
	let circuit = loadExample("02_sr_latch_nand_active_low.json");
	let result = run(circuit);
	circuit = setInputs(circuit, {
		SB: false,
		RB: true
	});
	result = run(circuit, result.state);
	assert.equal(result.unstable, false, "SR NAND set não deveria oscilar");
	assert.equal(led(circuit, result.state, "Q"), true, "S̅=0 deve setar Q");
	circuit = setInputs(circuit, {
		SB: true,
		RB: true
	});
	result = run(circuit, result.state);
	assert.equal(led(circuit, result.state, "Q"), true, "S̅=R̅=1 deve manter Q=1");
	circuit = setInputs(circuit, {
		SB: true,
		RB: false
	});
	result = run(circuit, result.state);
	assert.equal(result.unstable, false, "SR NAND reset não deveria oscilar");
	assert.equal(led(circuit, result.state, "Q"), false, "R̅=0 deve resetar Q");
	circuit = setInputs(circuit, {
		SB: true,
		RB: true
	});
	result = run(circuit, result.state);
	assert.equal(led(circuit, result.state, "Q"), false, "S̅=R̅=1 deve manter Q=0");
}
function testGatedDLatchFromNand() {
	let circuit = loadExample("03_gated_d_latch_from_nand.json");
	let result = run(circuit);
	circuit = setInputs(circuit, {
		D: true,
		EN: true
	});
	result = run(circuit, result.state);
	assert.equal(result.unstable, false, "Latch D transparente não deveria oscilar");
	assert.equal(led(circuit, result.state, "Q"), true, "EN=1 deve fazer Q acompanhar D=1");
	circuit = setInputs(circuit, {
		D: false,
		EN: false
	});
	result = run(circuit, result.state);
	assert.equal(led(circuit, result.state, "Q"), true, "EN=0 deve manter Q=1 mesmo com D=0");
	circuit = setInputs(circuit, {
		D: false,
		EN: true
	});
	result = run(circuit, result.state);
	assert.equal(led(circuit, result.state, "Q"), false, "EN=1 deve fazer Q acompanhar D=0");
	circuit = setInputs(circuit, {
		D: true,
		EN: false
	});
	result = run(circuit, result.state);
	assert.equal(led(circuit, result.state, "Q"), false, "EN=0 deve manter Q=0 mesmo com D=1");
}
function testNotSelfFeedbackIsUnstable() {
	const circuit = loadExample("04_unstable_not_feedback.json");
	const result = run(circuit);
	assert.equal(circuitHasFeedback(circuit), true, "NOT realimentado deve ser detectado como feedback no grafo");
	assert.equal(result.unstable, true, "NOT realimentado em si mesmo deve ser detectado como instável");
}
function testFeedbackGraphDistinguishesAcyclicCircuit() {
	assert.equal(circuitHasFeedback({
		version: 1,
		components: [
			{
				id: "A",
				type: "input",
				x: 0,
				y: 0
			},
			{
				id: "G1",
				type: "and",
				x: 120,
				y: 0
			},
			{
				id: "OUT",
				type: "led",
				x: 260,
				y: 0
			}
		],
		wires: [{
			id: "W1",
			from: {
				componentId: "A",
				pinId: "out"
			},
			to: {
				componentId: "G1",
				pinId: "a"
			}
		}, {
			id: "W2",
			from: {
				componentId: "G1",
				pinId: "out"
			},
			to: {
				componentId: "OUT",
				pinId: "in"
			}
		}]
	}), false, "Circuito acíclico não deve ser marcado como feedback");
}
function nativeFlipFlopCircuit(d = false) {
	return {
		version: 1,
		components: [
			{
				id: "D",
				type: "input",
				x: 0,
				y: 0,
				state: d
			},
			{
				id: "CLK",
				type: "clock",
				x: 0,
				y: 80,
				state: false
			},
			{
				id: "FF",
				type: "d-flip-flop",
				x: 180,
				y: 20,
				memory: {
					q: false,
					previousClk: false
				}
			},
			{
				id: "Q",
				type: "led",
				x: 380,
				y: 30
			}
		],
		wires: [
			{
				id: "W1",
				from: {
					componentId: "D",
					pinId: "out"
				},
				to: {
					componentId: "FF",
					pinId: "D"
				}
			},
			{
				id: "W2",
				from: {
					componentId: "CLK",
					pinId: "CLK"
				},
				to: {
					componentId: "FF",
					pinId: "CLK"
				}
			},
			{
				id: "W3",
				from: {
					componentId: "FF",
					pinId: "Q"
				},
				to: {
					componentId: "Q",
					pinId: "in"
				}
			}
		]
	};
}
function testStepCircuitCapturesFlipFlopOnRisingEdgeOnly() {
	let circuit = nativeFlipFlopCircuit(true);
	circuit = stepCircuit(circuit);
	assert.equal(circuit.components.find((component) => component.id === "CLK")?.state, true, "Primeiro tick deve subir clock");
	assert.equal(circuit.components.find((component) => component.id === "FF")?.memory?.q, true, "Borda de subida deve capturar D=1");
	circuit = setInputs(circuit, { D: false });
	circuit = stepCircuit(circuit);
	assert.equal(circuit.components.find((component) => component.id === "CLK")?.state, false, "Segundo tick deve descer clock");
	assert.equal(circuit.components.find((component) => component.id === "FF")?.memory?.q, true, "Borda de descida não deve capturar D=0");
	circuit = stepCircuit(circuit);
	assert.equal(circuit.components.find((component) => component.id === "CLK")?.state, true, "Terceiro tick deve subir clock de novo");
	assert.equal(circuit.components.find((component) => component.id === "FF")?.memory?.q, false, "Nova borda de subida deve capturar D=0");
}
function testNativeDFlipFlopCapturesOnlyOnRisingEdge() {
	let circuit = nativeFlipFlopCircuit(false);
	let result = run(circuit);
	circuit = setInputs(circuit, { D: true });
	result = run(circuit, result.state);
	assert.equal(pin(result.state, "FF", "Q"), false, "Sem borda de clock, FF deve manter Q=0");
	circuit = {
		...circuit,
		components: circuit.components.map((c) => c.id === "CLK" ? {
			...c,
			state: true
		} : c)
	};
	result = run(circuit, result.state);
	assert.equal(pin(result.state, "FF", "Q"), false, "Avaliação pura não deve capturar D sem step sequencial");
}
var tests = [
	testCombinationalStillWorks,
	testNorSrLatchKeepsState,
	testNandSrLatchActiveLowKeepsState,
	testGatedDLatchFromNand,
	testNotSelfFeedbackIsUnstable,
	testFeedbackGraphDistinguishesAcyclicCircuit,
	testStepCircuitCapturesFlipFlopOnRisingEdgeOnly,
	testNativeDFlipFlopCapturesOnlyOnRisingEdge
];
for (const test of tests) {
	test();
	console.log(`✓ ${test.name}`);
}
console.log(`\n${tests.length} testes de simulação passaram.`);
//#endregion
export {};
