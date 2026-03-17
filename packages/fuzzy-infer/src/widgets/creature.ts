import type { Fact, Rule } from '../types';
import { TreeRenderer } from '../renderer';
import { FuzzyEngine } from '../engine';
import { layoutTree, derivePredicateCategories } from '../layout';
import { WidgetControls, type TraitToggle } from '../controls';
import { RULES_10 } from '../data/rules-10';
import { RULES_25 } from '../data/rules-25';
import { RULES_100 } from '../data/rules-100';
import { RULES_500 } from '../data/rules-500';

/**
 * Full creature builder widget.
 *
 * Layout: flex container with controls on left, canvas on right.
 * Trait toggles via WidgetControls. On trait change: create fresh
 * FuzzyEngine, add active traits, add rules, run, update layout.
 *
 * Trait toggles are derived dynamically from the current rule set using
 * `derivePredicateCategories`: any predicate that appears in conditions
 * but is never produced by any rule action is a user-toggleable trait.
 * When the tier slider changes, the toggle list grows with the rule set.
 *
 * Mounted twice in the post:
 *   - id="fuzzy-creature"        -> mountCreature(el)          (10 rules, no slider)
 *   - id="fuzzy-creature-scaled" -> mountCreature(el, { scaled: true })  (with tier slider)
 */

/**
 * Build trait toggles from the current rule set, preserving active states
 * from the previous toggle list.
 */
function buildTraitToggles(rules: Rule[], previous: TraitToggle[]): TraitToggle[] {
  const { traits } = derivePredicateCategories(rules);
  const prevMap = new Map<string, TraitToggle>();
  for (const t of previous) {
    prevMap.set(t.pred, t);
  }
  const sorted = [...traits].sort();
  return sorted.map((pred) => {
    const prev = prevMap.get(pred);
    return {
      pred,
      label: pred,
      active: prev?.active ?? false,
      deg: prev?.deg ?? 1.0,
    };
  });
}

export function mountCreature(
  container: HTMLElement,
  options?: { scaled?: boolean }
): void {
  const scaled = options?.scaled ?? false;

  // --- State ---
  const ruleTiers: Rule[][] = scaled
    ? [RULES_10, RULES_25, RULES_100, RULES_500]
    : [RULES_10];
  let currentRules: Rule[] = [...ruleTiers[0]];
  let renderer: TreeRenderer | null = null;

  // --- Build DOM ---
  const wrap = document.createElement('div');
  wrap.className = 'fuzzy-creature-wrap';

  // Left: controls
  const controlsContainer = document.createElement('div');
  controlsContainer.className = 'fuzzy-creature-controls';
  wrap.appendChild(controlsContainer);

  // Right: canvas
  const canvasContainer = document.createElement('div');
  canvasContainer.className = 'fuzzy-creature-canvas';

  const canvas = document.createElement('canvas');
  canvas.style.width = '100%';
  canvas.style.display = 'block';
  canvasContainer.appendChild(canvas);
  wrap.appendChild(canvasContainer);

  container.appendChild(wrap);

  // --- Renderer ---
  renderer = new TreeRenderer(canvas);

  function runInference(traits: TraitToggle[]): void {
    const engine = new FuzzyEngine();

    // Add active traits as facts for entity "creature"
    for (const trait of traits) {
      if (trait.active) {
        engine.addFact({ pred: trait.pred, args: ['creature'], deg: trait.deg });
      }
    }

    // Add current rule set
    for (const rule of currentRules) {
      engine.addRule(rule);
    }

    const result = engine.run();

    // Collect all facts from result
    const facts: Fact[] = [];
    for (const f of result.facts.values()) {
      facts.push(f);
    }

    const rect = canvas.getBoundingClientRect();
    const w = rect.width || 500;
    const layout = layoutTree(facts, currentRules, w, {
      firedRules: result.firedRules,
    });

    if (renderer) {
      renderer.resize();
      renderer.setLayout(layout);
      renderer.draw();
    }
  }

  // --- WidgetControls ---
  const initialTraits = buildTraitToggles(currentRules, []);

  const controls = new WidgetControls({
    container: controlsContainer,
    traits: initialTraits,
    onChange: (traits: TraitToggle[]) => {
      runInference(traits);
    },
    showRuleSlider: scaled,
    onRuleTierChange: scaled
      ? (tier: number) => {
          const idx = Math.max(0, Math.min(tier, ruleTiers.length - 1));
          currentRules = [...ruleTiers[idx]];
          // Rebuild trait toggles from the new rule set, preserving active states
          const updatedTraits = buildTraitToggles(currentRules, controls.getTraits());
          controls.setTraits(updatedTraits);
          runInference(controls.getTraits());
        }
      : undefined,
  });

  // --- IntersectionObserver for pause/resume ---
  let isVisible = true;
  const observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting && !isVisible) {
          isVisible = true;
          renderer?.start();
        } else if (!entry.isIntersecting && isVisible) {
          isVisible = false;
          renderer?.stop();
        }
      }
    },
    { threshold: 0.1 }
  );
  observer.observe(container);

  // Initial render
  runInference(controls.getTraits());

  // Handle window resize
  window.addEventListener('resize', () => {
    runInference(controls.getTraits());
  });
}
