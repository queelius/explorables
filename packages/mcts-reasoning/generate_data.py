"""Build pedagogical MCTS trace data as JSON.

Reads hand-authored reasoning traces and constructs a step-by-step
simulation trace showing how MCTS explores the tree.  Does NOT import
any external MCTS library -- all tree structures are plain dicts.
"""

from __future__ import annotations

import argparse
import copy
import json
import sys
from pathlib import Path
from typing import Any


# ── Public helpers ───────────────────────────────────────────────────────


def load_traces(path: str) -> dict:
    """Load reasoning traces JSON and return the parsed dict."""
    with open(path) as f:
        return json.load(f)


def make_node(
    node_id: str,
    state: str,
    value: float = 0.0,
    visits: int = 0,
    is_terminal: bool = False,
    answer: str | None = None,
    children: list[dict] | None = None,
) -> dict:
    """Return a canonical node dict."""
    return {
        "id": node_id,
        "state": state,
        "value": value,
        "visits": visits,
        "is_terminal": is_terminal,
        "answer": answer,
        "children": children if children is not None else [],
    }


# ── Internal tree manipulation ───────────────────────────────────────────


def _find_node(tree: dict, node_id: str) -> dict | None:
    """Find a node by id in *tree* (DFS)."""
    if tree["id"] == node_id:
        return tree
    for child in tree["children"]:
        found = _find_node(child, node_id)
        if found is not None:
            return found
    return None


def _ancestors(node_id: str) -> list[str]:
    """Return the path of ancestor ids from *node_id* up to (and including) root.

    Example: _ancestors("0.1.0") -> ["0.1.0", "0.1", "0"]
    """
    parts = node_id.split(".")
    path: list[str] = []
    for i in range(len(parts), 0, -1):
        path.append(".".join(parts[:i]))
    return path


def _backpropagate(tree: dict, node_id: str, score: float) -> None:
    """Backpropagate *score* from *node_id* up to the root.

    Each node along the path gets visits += 1 and its value is updated to
    total_accumulated_score / visits (i.e. the running average).
    """
    for nid in _ancestors(node_id):
        node = _find_node(tree, nid)
        if node is None:
            continue
        old_total = node["value"] * node["visits"]
        node["visits"] += 1
        node["value"] = (old_total + score) / node["visits"]


def _next_child_id(parent_id: str, tree: dict) -> str:
    """Return the next available child id under *parent_id*."""
    parent = _find_node(tree, parent_id)
    idx = len(parent["children"]) if parent else 0
    return f"{parent_id}.{idx}"


# ── Simulation schedule ──────────────────────────────────────────────────

# Each entry: (parent_id_to_expand_under, state_text, is_terminal, answer, score)
# Sims 1-9 follow the three main branches from the traces file.
# Sims 10-20 add exploration branches off A's path.

_EXPLORATION_TEXTS = [
    "Let me verify: if A is a knight, A's claim about B being a knave must be true.",
    "Double-checking: B is a knave, so B's statement 'We are the same type' is a lie.",
    "Confirming: A (knight) and B (knave) are different types, matching B's lie.",
    "Alternative angle: What if both statements are evaluated simultaneously?",
    "Cross-checking: A's truth-telling constrains B to be a knave.",
    "Verifying consistency: knight A, knave B satisfies all constraints.",
    "Exploring: Could there be another valid assignment? Let me check.",
    "Rechecking B's statement under the A-is-knight assumption.",
    "Attempting a formal proof: A=knight => B=knave => B lies => consistent.",
    "Sanity check: no other assignment of types works without contradiction.",
    "Final verification: the unique solution is A is a knight, B is a knave.",
]

_EXPLORATION_TERMINAL_TEXTS = [
    "All constraints satisfied. ANSWER: A is a knight.",
    "B's lie is confirmed. ANSWER: A is a knight.",
    "Types are consistent. ANSWER: A is a knight.",
    "Simultaneous evaluation confirms. ANSWER: A is a knight.",
    "Constraint propagation yields. ANSWER: A is a knight.",
    "No contradictions found. ANSWER: A is a knight.",
    "No alternative assignment works. ANSWER: A is a knight.",
    "B's statement is indeed a lie. ANSWER: A is a knight.",
    "Formal proof complete. ANSWER: A is a knight.",
    "Uniqueness established. ANSWER: A is a knight.",
    "Verified: ANSWER: A is a knight.",
]

_EXPLORATION_SCORES = [0.9, 0.85, 0.95, 0.8, 0.9, 1.0, 0.7, 0.85, 1.0, 0.75, 0.9]


def _build_simulation_schedule(
    traces: dict,
) -> list[dict[str, Any]]:
    """Return a list of 20 simulation descriptors.

    Each descriptor has:
        parent_id  – where to expand
        steps      – list of (state_text, is_terminal, answer) for nodes to add
        score      – backprop score for this simulation
        branch     – label for readability
    """
    branches = traces["branches"]
    schedule: list[dict[str, Any]] = []

    # Sims 1-3: step 1 of each branch (children of root)
    for key in ("A", "B", "C"):
        b = branches[key]
        schedule.append(
            {
                "parent_id": "0",
                "steps": [(b["steps"][0], False, None)],
                "score": b["score"],
                "branch": key,
            }
        )

    # Sims 4-6: step 2 of each branch
    parent_ids = {"A": "0.0", "B": "0.1", "C": "0.2"}
    for key in ("A", "B", "C"):
        b = branches[key]
        schedule.append(
            {
                "parent_id": parent_ids[key],
                "steps": [(b["steps"][1], False, None)],
                "score": b["score"],
                "branch": key,
            }
        )

    # Sims 7-9: step 3 (terminal) of each branch
    parent_ids_2 = {"A": "0.0.0", "B": "0.1.0", "C": "0.2.0"}
    for key in ("A", "B", "C"):
        b = branches[key]
        schedule.append(
            {
                "parent_id": parent_ids_2[key],
                "steps": [(b["steps"][2], True, b["answer"])],
                "score": b["score"],
                "branch": key,
            }
        )

    # Sims 10-20: exploration off A's path
    # Cycle through parents: 0.0, 0.0.0, 0.0, 0.0.0, ...
    explore_parents = ["0.0", "0.0.0"] * 6  # 12 entries, we use 11
    for i in range(11):
        parent = explore_parents[i]
        text = _EXPLORATION_TEXTS[i]
        terminal_text = _EXPLORATION_TERMINAL_TEXTS[i]
        score = _EXPLORATION_SCORES[i]
        # Each exploration sim adds a 2-node chain: reasoning + terminal
        # Except sims at indices 2, 5, 8 (every 3rd) add a 3-node chain
        # to bring the total into the 30-40 range.
        if i % 4 == 3:
            # 3-node chain
            mid_text = f"Continuing: {text}"
            schedule.append(
                {
                    "parent_id": parent,
                    "steps": [
                        (text, False, None),
                        (mid_text, False, None),
                        (terminal_text, True, "A is a knight"),
                    ],
                    "score": score,
                    "branch": f"A-explore-{i + 1}",
                }
            )
        else:
            # 2-node chain
            schedule.append(
                {
                    "parent_id": parent,
                    "steps": [
                        (text, False, None),
                        (terminal_text, True, "A is a knight"),
                    ],
                    "score": score,
                    "branch": f"A-explore-{i + 1}",
                }
            )

    return schedule


# ── Core trace generation ────────────────────────────────────────────────


def generate_trace(traces_path: str) -> dict:
    """Generate the full simulation trace dict.

    Returns a dict with keys ``puzzle`` and ``simulations``.
    """
    traces = load_traces(traces_path)
    branches = traces["branches"]

    puzzle = {
        "question": (
            "A says 'B is a knave.' B says 'We are the same type.' "
            "What is A?"
        ),
        "correct_answer": branches["A"]["answer"],  # "A is a knight"
        "single_pass_wrong": traces["single_pass_wrong"],
    }

    # Build the root node
    tree = make_node("0", "Question: " + puzzle["question"])

    schedule = _build_simulation_schedule(traces)
    simulations: list[dict] = []

    for sim_idx, sim_desc in enumerate(schedule, start=1):
        parent_id = sim_desc["parent_id"]
        steps = sim_desc["steps"]
        score = sim_desc["score"]

        # ── SELECT ───────────────────────────────────────────────────
        select_path = _ancestors(parent_id)[::-1]  # root-to-parent
        simulations.append(
            {
                "step": sim_idx,
                "phase": "select",
                "selected_path": select_path,
                "tree": copy.deepcopy(tree),
            }
        )

        # ── EXPAND ───────────────────────────────────────────────────
        # Add only the first node of the chain during expand.
        first_text, first_terminal, first_answer = steps[0]
        new_id = _next_child_id(parent_id, tree)
        new_node = make_node(
            new_id,
            first_text,
            is_terminal=first_terminal,
            answer=first_answer,
        )
        parent_node = _find_node(tree, parent_id)
        parent_node["children"].append(new_node)

        simulations.append(
            {
                "step": sim_idx,
                "phase": "expand",
                "selected_path": select_path,
                "new_node_id": new_id,
                "tree": copy.deepcopy(tree),
            }
        )

        # ── ROLLOUT ──────────────────────────────────────────────────
        # Add remaining nodes in the chain (if any).
        rollout_ids = [new_id]
        current_parent = new_id
        for step_text, is_term, ans in steps[1:]:
            child_id = _next_child_id(current_parent, tree)
            child_node = make_node(
                child_id,
                step_text,
                is_terminal=is_term,
                answer=ans,
            )
            target = _find_node(tree, current_parent)
            target["children"].append(child_node)
            rollout_ids.append(child_id)
            current_parent = child_id

        # The deepest node in the rollout is where we backprop from.
        terminal_id = rollout_ids[-1]

        simulations.append(
            {
                "step": sim_idx,
                "phase": "rollout",
                "rollout_path": rollout_ids,
                "tree": copy.deepcopy(tree),
            }
        )

        # ── BACKPROP ─────────────────────────────────────────────────
        _backpropagate(tree, terminal_id, score)
        backprop_path = _ancestors(terminal_id)  # deepest-first

        simulations.append(
            {
                "step": sim_idx,
                "phase": "backprop",
                "backprop_path": backprop_path,
                "score": score,
                "tree": copy.deepcopy(tree),
            }
        )

    return {"puzzle": puzzle, "simulations": simulations}


# ── CLI ──────────────────────────────────────────────────────────────────


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Generate pedagogical MCTS trace data."
    )
    parser.add_argument(
        "--traces",
        default="data/reasoning_traces.json",
        help="Path to reasoning traces JSON (default: data/reasoning_traces.json)",
    )
    parser.add_argument(
        "--output",
        default="data/knights_trace.json",
        help="Output path for generated trace (default: data/knights_trace.json)",
    )
    args = parser.parse_args()

    trace = generate_trace(args.traces)

    out = Path(args.output)
    out.parent.mkdir(parents=True, exist_ok=True)
    with open(out, "w") as f:
        json.dump(trace, f, indent=2)

    # Summary stats
    final_tree = trace["simulations"][-1]["tree"]
    all_ids: set[str] = set()

    def _collect(node: dict) -> None:
        all_ids.add(node["id"])
        for c in node["children"]:
            _collect(c)

    _collect(final_tree)
    print(f"Wrote {out} ({len(trace['simulations'])} phases, {len(all_ids)} nodes)")


if __name__ == "__main__":
    main()
