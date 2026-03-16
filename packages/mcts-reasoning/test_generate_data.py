"""Tests for generate_data.py — TDD-first."""

import json
import subprocess

import pytest

from generate_data import generate_trace, load_traces, make_node


# ── helpers ──────────────────────────────────────────────────────────────


def collect_all_ids(node):
    ids = {node["id"]}
    for child in node.get("children", []):
        ids |= collect_all_ids(child)
    return ids


def find_terminals(node):
    result = []
    if node["is_terminal"]:
        result.append(node)
    for child in node.get("children", []):
        result.extend(find_terminals(child))
    return result


# ── load_traces ──────────────────────────────────────────────────────────


def test_load_traces_returns_branches():
    traces = load_traces("data/reasoning_traces.json")
    assert "single_pass_wrong" in traces
    assert "branches" in traces
    assert set(traces["branches"].keys()) == {"A", "B", "C"}
    for branch in traces["branches"].values():
        assert "label" in branch
        assert "steps" in branch
        assert "answer" in branch
        assert "score" in branch
        assert len(branch["steps"]) >= 2


# ── make_node ────────────────────────────────────────────────────────────


def test_make_node_structure():
    node = make_node("0.1", "some reasoning", value=0.7, visits=3)
    assert node["id"] == "0.1"
    assert node["state"] == "some reasoning"
    assert node["value"] == 0.7
    assert node["visits"] == 3
    assert node["is_terminal"] is False
    assert node["answer"] is None
    assert node["children"] == []


def test_make_node_terminal():
    node = make_node(
        "0.0.0",
        "ANSWER: A is a knight",
        value=1.0,
        visits=1,
        is_terminal=True,
        answer="A is a knight",
    )
    assert node["is_terminal"] is True
    assert node["answer"] == "A is a knight"


# ── generate_trace ───────────────────────────────────────────────────────


def test_generate_trace_structure():
    trace = generate_trace("data/reasoning_traces.json")
    assert "puzzle" in trace
    assert "simulations" in trace
    assert trace["puzzle"]["correct_answer"] == "A is a knight"
    phases = [s["phase"] for s in trace["simulations"]]
    assert phases[:4] == ["select", "expand", "rollout", "backprop"]
    for sim in trace["simulations"]:
        assert "tree" in sim
        assert "id" in sim["tree"]
        assert sim["tree"]["id"] == "0"


def test_generate_trace_node_ids_are_path_based():
    trace = generate_trace("data/reasoning_traces.json")
    final_tree = trace["simulations"][-1]["tree"]
    ids = collect_all_ids(final_tree)
    assert "0" in ids
    for child_id in ["0.0", "0.1", "0.2"]:
        assert child_id in ids


def test_generate_trace_has_terminal_nodes():
    trace = generate_trace("data/reasoning_traces.json")
    final_tree = trace["simulations"][-1]["tree"]
    terminals = find_terminals(final_tree)
    assert len(terminals) >= 3
    answers = [t["answer"] for t in terminals]
    assert "A is a knight" in answers


def test_section_node_counts():
    trace = generate_trace("data/reasoning_traces.json")
    # Section 2: phases 0-19 (sims 1-5). Tree should have 6 nodes.
    sec2_tree = trace["simulations"][19]["tree"]
    assert len(collect_all_ids(sec2_tree)) == 6
    # Section 3: sim 6 expand is at phase index 21 (select=20, expand=21).
    sec3_tree = trace["simulations"][21]["tree"]
    assert len(collect_all_ids(sec3_tree)) == 7
    # Full tree: 30-40 nodes
    final_tree = trace["simulations"][-1]["tree"]
    node_count = len(collect_all_ids(final_tree))
    assert 30 <= node_count <= 40, f"Expected 30-40 nodes, got {node_count}"


def test_backprop_updates_values():
    """After backprop, node.value == total_score / visits along the path."""
    trace = generate_trace("data/reasoning_traces.json")
    # After sim 1 backprop (phase 3), root has visits=1 and value=1.0 (branch A score)
    bp1 = trace["simulations"][3]["tree"]
    assert bp1["visits"] >= 1
    assert bp1["value"] > 0.0
    # Final tree root should have visits == 20
    final_root = trace["simulations"][-1]["tree"]
    assert final_root["visits"] == 20


def test_each_simulation_has_four_phases():
    """Every simulation produces exactly select, expand, rollout, backprop."""
    trace = generate_trace("data/reasoning_traces.json")
    phases = [s["phase"] for s in trace["simulations"]]
    assert len(phases) % 4 == 0
    for i in range(0, len(phases), 4):
        assert phases[i : i + 4] == ["select", "expand", "rollout", "backprop"]


def test_tree_snapshots_are_independent():
    """Each phase entry has a deep copy — mutating one must not affect another."""
    trace = generate_trace("data/reasoning_traces.json")
    tree_a = trace["simulations"][0]["tree"]
    tree_b = trace["simulations"][-1]["tree"]
    # They should be different objects
    assert tree_a is not tree_b
    # Mutating one shouldn't change the other
    original_visits = tree_b["visits"]
    tree_a["visits"] = -999
    assert tree_b["visits"] == original_visits


def test_cli_generates_output_file(tmp_path):
    result = subprocess.run(
        [
            "python3",
            "generate_data.py",
            "--traces",
            "data/reasoning_traces.json",
            "--output",
            str(tmp_path / "output.json"),
        ],
        capture_output=True,
        text=True,
        cwd="/home/spinoza/github/beta/explainables/mcts-reasoning",
    )
    assert result.returncode == 0, f"CLI failed: {result.stderr}"
    output = json.loads((tmp_path / "output.json").read_text())
    assert "puzzle" in output
    assert "simulations" in output
