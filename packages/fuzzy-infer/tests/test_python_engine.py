"""Smoke tests for the standalone Python fuzzy inference engine."""

import sys
from pathlib import Path

# Add the python/ directory to the path so we can import the engine
sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "python"))

from fuzzy_infer import FuzzyEngine, _eval_degree  # noqa: E402


class TestZebraClassification:
    """End-to-end: hair + hooves + stripes -> mammal -> ungulate -> zebra."""

    def test_zebra_classification(self):
        engine = FuzzyEngine()

        # Rules: mammal, ungulate, zebra (same as RULES_10 tier 0)
        engine.add_rule(
            "mammal-rule",
            conditions=[{"pred": "has-hair", "args": ["?x"], "degVar": "?d"}],
            actions=[
                {"type": "add", "fact": {"pred": "is-mammal", "args": ["?x"], "deg": ["*", 0.95, "?d"]}}
            ],
            priority=60,
        )
        engine.add_rule(
            "ungulate-rule",
            conditions=[
                {"pred": "is-mammal", "args": ["?x"], "degVar": "?d1"},
                {"pred": "has-hooves", "args": ["?x"], "degVar": "?d2"},
            ],
            actions=[
                {
                    "type": "add",
                    "fact": {
                        "pred": "is-ungulate",
                        "args": ["?x"],
                        "deg": ["*", 0.9, ["min", "?d1", "?d2"]],
                    },
                }
            ],
            priority=50,
        )
        engine.add_rule(
            "zebra-rule",
            conditions=[
                {"pred": "is-ungulate", "args": ["?x"], "degVar": "?d1"},
                {"pred": "has-stripes", "args": ["?x"], "degVar": "?d2"},
            ],
            actions=[
                {
                    "type": "add",
                    "fact": {
                        "pred": "species",
                        "args": ["?x", "zebra"],
                        "deg": ["*", 0.9, ["min", "?d1", "?d2"]],
                    },
                }
            ],
            priority=40,
        )

        # Facts
        engine.add_fact("has-hair", ["zara"], 1.0)
        engine.add_fact("has-hooves", ["zara"], 0.9)
        engine.add_fact("has-stripes", ["zara"], 0.95)

        fired = engine.run()

        # Check intermediate classifications
        assert ("is-mammal", "zara") in engine.facts
        assert ("is-ungulate", "zara") in engine.facts

        # Check final species
        assert ("species", "zara", "zebra") in engine.facts
        species_deg = engine.facts[("species", "zara", "zebra")]
        assert species_deg > 0

        # Check rules fired in order
        assert "mammal-rule" in fired
        assert "ungulate-rule" in fired
        assert "zebra-rule" in fired

    def test_zebra_degree_attenuates(self):
        """Degree should decrease through the chain due to confidence factors."""
        engine = FuzzyEngine()
        engine.add_rule(
            "mammal-rule",
            [{"pred": "has-hair", "args": ["?x"], "degVar": "?d"}],
            [{"type": "add", "fact": {"pred": "is-mammal", "args": ["?x"], "deg": ["*", 0.95, "?d"]}}],
            priority=60,
        )
        engine.add_rule(
            "ungulate-rule",
            [
                {"pred": "is-mammal", "args": ["?x"], "degVar": "?d1"},
                {"pred": "has-hooves", "args": ["?x"], "degVar": "?d2"},
            ],
            [
                {
                    "type": "add",
                    "fact": {
                        "pred": "is-ungulate",
                        "args": ["?x"],
                        "deg": ["*", 0.9, ["min", "?d1", "?d2"]],
                    },
                }
            ],
            priority=50,
        )
        engine.add_fact("has-hair", ["zara"], 0.8)
        engine.add_fact("has-hooves", ["zara"], 0.7)
        engine.run()

        mammal_deg = engine.facts[("is-mammal", "zara")]
        ungulate_deg = engine.facts[("is-ungulate", "zara")]
        # mammal = 0.95 * 0.8 = 0.76
        assert abs(mammal_deg - 0.76) < 1e-6
        # ungulate = 0.9 * min(0.76, 0.7) = 0.9 * 0.7 = 0.63
        assert abs(ungulate_deg - 0.63) < 1e-6


class TestFuzzyOr:
    """Duplicate facts should keep the maximum degree."""

    def test_max_degree_kept(self):
        engine = FuzzyEngine()
        engine.add_fact("hot", ["coffee"], 0.6)
        engine.add_fact("hot", ["coffee"], 0.9)
        assert engine.facts[("hot", "coffee")] == 0.9

    def test_no_downgrade(self):
        engine = FuzzyEngine()
        engine.add_fact("hot", ["coffee"], 0.9)
        engine.add_fact("hot", ["coffee"], 0.3)
        assert engine.facts[("hot", "coffee")] == 0.9

    def test_different_args_separate(self):
        engine = FuzzyEngine()
        engine.add_fact("hot", ["coffee"], 0.9)
        engine.add_fact("hot", ["tea"], 0.7)
        assert len([k for k in engine.facts if k[0] == "hot"]) == 2


class TestDegreePropagation:
    """Verify degree expression evaluation."""

    def test_multiply(self):
        assert abs(_eval_degree(["*", 0.9, "?d"], {"?d": 0.8}) - 0.72) < 1e-6

    def test_min(self):
        assert abs(_eval_degree(["min", "?d1", "?d2"], {"?d1": 0.3, "?d2": 0.7}) - 0.3) < 1e-6

    def test_max(self):
        assert abs(_eval_degree(["max", "?d1", "?d2"], {"?d1": 0.3, "?d2": 0.7}) - 0.7) < 1e-6

    def test_nested_multiply_min(self):
        # ['*', 0.9, ['min', '?d1', '?d2']] with d1=0.8, d2=0.6 -> 0.9 * 0.6 = 0.54
        result = _eval_degree(["*", 0.9, ["min", "?d1", "?d2"]], {"?d1": 0.8, "?d2": 0.6})
        assert abs(result - 0.54) < 1e-6

    def test_clamp_upper(self):
        assert _eval_degree(["+", 0.8, 0.5], {}) == 1.0

    def test_clamp_lower(self):
        assert _eval_degree(["-", 0.2, 0.5], {}) == 0.0

    def test_literal_number(self):
        assert _eval_degree(0.7, {}) == 0.7

    def test_variable_lookup(self):
        assert abs(_eval_degree("?d", {"?d": 0.85}) - 0.85) < 1e-6

    def test_add(self):
        assert abs(_eval_degree(["+", 0.3, 0.4], {}) - 0.7) < 1e-6

    def test_divide(self):
        assert abs(_eval_degree(["/", 0.8, 2], {}) - 0.4) < 1e-6


class TestQuery:
    """Query returns facts matching a predicate."""

    def test_query_filters_by_predicate(self):
        engine = FuzzyEngine()
        engine.add_fact("hot", ["coffee"], 0.9)
        engine.add_fact("hot", ["tea"], 0.7)
        engine.add_fact("cold", ["ice"], 1.0)
        results = engine.query("hot")
        assert len(results) == 2
        preds = {k[0] for k, _ in results}
        assert preds == {"hot"}

    def test_query_empty(self):
        engine = FuzzyEngine()
        assert engine.query("nonexistent") == []


class TestForwardChaining:
    """Verify chaining behavior and fired-rule tracking."""

    def test_chain_across_iterations(self):
        engine = FuzzyEngine()
        engine.add_fact("A", [], 0.9)
        engine.add_rule(
            "A-to-B",
            [{"pred": "A", "args": []}],
            [{"type": "add", "fact": {"pred": "B", "args": [], "deg": 0.8}}],
            priority=50,
        )
        engine.add_rule(
            "B-to-C",
            [{"pred": "B", "args": []}],
            [{"type": "add", "fact": {"pred": "C", "args": [], "deg": 0.7}}],
            priority=50,
        )
        fired = engine.run()
        assert ("B",) in engine.facts
        assert ("C",) in engine.facts
        assert "A-to-B" in fired
        assert "B-to-C" in fired

    def test_no_double_firing(self):
        engine = FuzzyEngine()
        engine.add_fact("x", [], 1.0)
        engine.add_rule(
            "dup",
            [{"pred": "x", "args": []}],
            [{"type": "add", "fact": {"pred": "y", "args": [], "deg": 1.0}}],
            priority=50,
        )
        fired = engine.run()
        assert fired.count("dup") == 1

    def test_remove_action(self):
        engine = FuzzyEngine()
        engine.add_fact("old", ["data"], 1.0)
        engine.add_rule(
            "cleanup",
            [{"pred": "old", "args": ["?x"]}],
            [{"type": "remove", "fact": {"pred": "old", "args": ["?x"], "deg": 0}}],
            priority=50,
        )
        engine.run()
        assert ("old", "data") not in engine.facts
