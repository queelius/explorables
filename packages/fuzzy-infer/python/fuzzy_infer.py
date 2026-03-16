"""Standalone fuzzy logic inference engine in ~100 lines of Python.

Same algorithm as engine.ts: forward-chaining production rules with
fuzzy degrees of belief, pattern matching with ?x variables, and
degree expressions like ['*', 0.9, '?d'].
"""

from __future__ import annotations
import json
from typing import Any


def _clamp01(n: float) -> float:
    return max(0.0, min(1.0, n))


def _eval_degree(expr: Any, bindings: dict[str, Any]) -> float:
    """Evaluate a degree expression and clamp to [0, 1]."""
    if isinstance(expr, (int, float)):
        return _clamp01(expr)
    if isinstance(expr, str) and expr.startswith("?"):
        return _clamp01(float(bindings.get(expr, 0)))
    if isinstance(expr, list):
        op, *operands = expr
        vals = [_eval_degree_raw(o, bindings) for o in operands]
        if op == "*":
            r = 1.0
            for v in vals:
                r *= v
            return _clamp01(r)
        if op == "+":
            return _clamp01(sum(vals))
        if op == "-":
            return _clamp01(vals[0] - sum(vals[1:]))
        if op == "/":
            return _clamp01(vals[0] / vals[1]) if vals[1] != 0 else 0.0
        if op == "min":
            return _clamp01(min(vals))
        if op == "max":
            return _clamp01(max(vals))
    return 0.0


def _eval_degree_raw(expr: Any, bindings: dict[str, Any]) -> float:
    """Evaluate without clamping (for nested intermediate results)."""
    if isinstance(expr, (int, float)):
        return float(expr)
    if isinstance(expr, str) and expr.startswith("?"):
        return float(bindings.get(expr, 0))
    if isinstance(expr, list):
        op, *operands = expr
        vals = [_eval_degree_raw(o, bindings) for o in operands]
        if op == "*":
            r = 1.0
            for v in vals:
                r *= v
            return r
        if op == "+":
            return sum(vals)
        if op == "-":
            return vals[0] - sum(vals[1:])
        if op == "/":
            return vals[0] / vals[1] if vals[1] != 0 else 0.0
        if op == "min":
            return min(vals)
        if op == "max":
            return max(vals)
    return 0.0


class FuzzyEngine:
    """Forward-chaining fuzzy inference engine."""

    def __init__(self):
        self.facts: dict[tuple, float] = {}  # (pred, *args) -> degree
        self.rules: list[dict] = []
        self._fired: set[str] = set()

    def add_fact(self, pred: str, args: list[str], deg: float = 1.0) -> None:
        key = (pred, *args)
        self.facts[key] = max(self.facts.get(key, 0.0), deg)  # fuzzy-OR

    def add_rule(
        self, name: str, conditions: list[dict], actions: list[dict], priority: int = 50
    ) -> None:
        self.rules.append(
            {"name": name, "conditions": conditions, "actions": actions, "priority": priority}
        )
        self.rules.sort(key=lambda r: -r["priority"])

    def query(self, pred: str) -> list[tuple[tuple, float]]:
        return [(k, v) for k, v in self.facts.items() if k[0] == pred]

    def _match_condition(
        self, cond: dict, bindings: dict[str, Any]
    ) -> list[tuple[dict[str, Any], float]]:
        results = []
        cpred, cargs = cond["pred"], cond["args"]
        for (pred, *args), deg in list(self.facts.items()):
            if pred != cpred or len(args) != len(cargs):
                continue
            b = dict(bindings)
            ok = True
            for pat, val in zip(cargs, args):
                if pat.startswith("?"):
                    if pat in b:
                        if b[pat] != val:
                            ok = False
                            break
                    else:
                        b[pat] = val
                elif pat != val:
                    ok = False
                    break
            if not ok:
                continue
            if "degVar" in cond and cond["degVar"]:
                b[cond["degVar"]] = deg
            results.append((b, deg))
        return results

    def _satisfy_all(self, conditions: list[dict]) -> list[tuple[dict[str, Any], float]]:
        current = [({}, 1.0)]
        for cond in conditions:
            nxt = []
            for bindings, cur_deg in current:
                for b, d in self._match_condition(cond, bindings):
                    nxt.append((b, min(cur_deg, d)))
            current = nxt
            if not current:
                break
        return current

    def run(self, max_iter: int = 100) -> list[str]:
        fired_rules = []
        for _ in range(max_iter):
            changed = False
            for rule in self.rules:
                for bindings, _ in self._satisfy_all(rule["conditions"]):
                    fired_key = f"{rule['name']}|{json.dumps(bindings, sort_keys=True)}"
                    if fired_key in self._fired:
                        continue
                    self._fired.add(fired_key)
                    fired_rules.append(rule["name"])
                    for action in rule["actions"]:
                        afact = action["fact"]
                        args = [
                            str(bindings[a]) if a.startswith("?") and a in bindings else a
                            for a in afact["args"]
                        ]
                        deg = _eval_degree(afact["deg"], bindings)
                        key = (afact["pred"], *args)
                        if action["type"] == "add":
                            old = self.facts.get(key, -1.0)
                            if deg > old:
                                self.facts[key] = deg
                                changed = True
                        elif action["type"] == "remove":
                            if key in self.facts:
                                del self.facts[key]
                                changed = True
            if not changed:
                break
        return fired_rules
