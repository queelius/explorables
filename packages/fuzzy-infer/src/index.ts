import { mountFactExplorer } from './widgets/fact-explorer';
import { mountRuleDemo } from './widgets/rule-demo';
import { mountChainDemo } from './widgets/chain-demo';
import { mountCreature } from './widgets/creature';

function init(): void {
  const factEl = document.getElementById('fuzzy-fact-explorer');
  if (factEl) mountFactExplorer(factEl);

  const ruleEl = document.getElementById('fuzzy-rule-demo');
  if (ruleEl) mountRuleDemo(ruleEl);

  const chainEl = document.getElementById('fuzzy-chain-demo');
  if (chainEl) mountChainDemo(chainEl);

  const creatureEl = document.getElementById('fuzzy-creature');
  if (creatureEl) mountCreature(creatureEl);

  const scaledEl = document.getElementById('fuzzy-creature-scaled');
  if (scaledEl) mountCreature(scaledEl, { scaled: true });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
