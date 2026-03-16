import type { Rule } from '../types';
import { RULES_10 } from './rules-10';

/**
 * Tier 1: ~25 animal classification rules for the fuzzy inference explorable.
 *
 * Superset of RULES_10 (tier 0), adding rules for:
 *   - Thermoregulation: warm-blooded (mammal), cold-blooded (scales)
 *   - Reptile classification: scales + cold-blooded
 *   - More species: snake, crocodile, whale, bat, owl, parrot, cheetah, bear, frog
 *   - Intermediate classes: is-reptile, is-amphibian, is-omnivore
 *
 * Priority bands (inherited from tier 0):
 *   60: base classification (mammal, bird, carnivore, warm/cold-blooded)
 *   50: intermediate (ungulate, reptile, amphibian, omnivore)
 *   40: species identification
 */
export const RULES_25: Rule[] = [
  ...RULES_10,

  // --- Base classification (priority 60) ---
  {
    name: 'warm-blooded-rule',
    conditions: [{ pred: 'is-mammal', args: ['?x'], degVar: '?d' }],
    actions: [
      { type: 'add', fact: { pred: 'is-warm-blooded', args: ['?x'], deg: ['*', 0.95, '?d'] } },
    ],
    priority: 60,
  },
  {
    name: 'cold-blooded-rule',
    conditions: [{ pred: 'has-scales', args: ['?x'], degVar: '?d' }],
    actions: [
      { type: 'add', fact: { pred: 'is-cold-blooded', args: ['?x'], deg: ['*', 0.9, '?d'] } },
    ],
    priority: 60,
  },
  {
    name: 'omnivore-rule',
    conditions: [
      { pred: 'eats-meat', args: ['?x'], degVar: '?d1' },
      { pred: 'eats-plants', args: ['?x'], degVar: '?d2' },
    ],
    actions: [
      {
        type: 'add',
        fact: { pred: 'is-omnivore', args: ['?x'], deg: ['*', 0.9, ['min', '?d1', '?d2']] },
      },
    ],
    priority: 60,
  },

  // --- Intermediate classification (priority 50) ---
  {
    name: 'reptile-rule',
    conditions: [
      { pred: 'has-scales', args: ['?x'], degVar: '?d1' },
      { pred: 'is-cold-blooded', args: ['?x'], degVar: '?d2' },
    ],
    actions: [
      {
        type: 'add',
        fact: { pred: 'is-reptile', args: ['?x'], deg: ['*', 0.9, ['min', '?d1', '?d2']] },
      },
    ],
    priority: 50,
  },
  {
    name: 'amphibian-rule',
    conditions: [
      { pred: 'lives-in-water', args: ['?x'], degVar: '?d1' },
      { pred: 'lives-on-land', args: ['?x'], degVar: '?d2' },
      { pred: 'has-moist-skin', args: ['?x'], degVar: '?d3' },
    ],
    actions: [
      {
        type: 'add',
        fact: {
          pred: 'is-amphibian',
          args: ['?x'],
          deg: ['*', 0.9, ['min', '?d1', '?d2', '?d3']],
        },
      },
    ],
    priority: 50,
  },

  // --- Species rules (priority 40) ---
  {
    name: 'snake-rule',
    conditions: [
      { pred: 'is-reptile', args: ['?x'], degVar: '?d1' },
      { pred: 'has-no-legs', args: ['?x'], degVar: '?d2' },
    ],
    actions: [
      {
        type: 'add',
        fact: { pred: 'species', args: ['?x', 'snake'], deg: ['*', 0.9, ['min', '?d1', '?d2']] },
      },
    ],
    priority: 40,
  },
  {
    name: 'crocodile-rule',
    conditions: [
      { pred: 'is-reptile', args: ['?x'], degVar: '?d1' },
      { pred: 'is-aquatic', args: ['?x'], degVar: '?d2' },
    ],
    actions: [
      {
        type: 'add',
        fact: {
          pred: 'species',
          args: ['?x', 'crocodile'],
          deg: ['*', 0.9, ['min', '?d1', '?d2']],
        },
      },
    ],
    priority: 40,
  },
  {
    name: 'whale-rule',
    conditions: [
      { pred: 'is-mammal', args: ['?x'], degVar: '?d1' },
      { pred: 'is-aquatic', args: ['?x'], degVar: '?d2' },
      { pred: 'is-large', args: ['?x'], degVar: '?d3' },
    ],
    actions: [
      {
        type: 'add',
        fact: {
          pred: 'species',
          args: ['?x', 'whale'],
          deg: ['*', 0.9, ['min', '?d1', '?d2', '?d3']],
        },
      },
    ],
    priority: 40,
  },
  {
    name: 'bat-rule',
    conditions: [
      { pred: 'is-mammal', args: ['?x'], degVar: '?d1' },
      { pred: 'can-fly', args: ['?x'], degVar: '?d2' },
    ],
    actions: [
      {
        type: 'add',
        fact: { pred: 'species', args: ['?x', 'bat'], deg: ['*', 0.9, ['min', '?d1', '?d2']] },
      },
    ],
    priority: 40,
  },
  {
    name: 'owl-rule',
    conditions: [
      { pred: 'is-bird', args: ['?x'], degVar: '?d1' },
      { pred: 'is-nocturnal', args: ['?x'], degVar: '?d2' },
    ],
    actions: [
      {
        type: 'add',
        fact: { pred: 'species', args: ['?x', 'owl'], deg: ['*', 0.9, ['min', '?d1', '?d2']] },
      },
    ],
    priority: 40,
  },
  {
    name: 'parrot-rule',
    conditions: [
      { pred: 'is-bird', args: ['?x'], degVar: '?d1' },
      { pred: 'can-talk', args: ['?x'], degVar: '?d2' },
    ],
    actions: [
      {
        type: 'add',
        fact: {
          pred: 'species',
          args: ['?x', 'parrot'],
          deg: ['*', 0.9, ['min', '?d1', '?d2']],
        },
      },
    ],
    priority: 40,
  },
  {
    name: 'cheetah-rule',
    conditions: [
      { pred: 'is-carnivore', args: ['?x'], degVar: '?d1' },
      { pred: 'is-fast', args: ['?x'], degVar: '?d2' },
    ],
    actions: [
      {
        type: 'add',
        fact: {
          pred: 'species',
          args: ['?x', 'cheetah'],
          deg: ['*', 0.9, ['min', '?d1', '?d2']],
        },
      },
    ],
    priority: 40,
  },
  {
    name: 'bear-rule',
    conditions: [
      { pred: 'is-mammal', args: ['?x'], degVar: '?d1' },
      { pred: 'is-omnivore', args: ['?x'], degVar: '?d2' },
    ],
    actions: [
      {
        type: 'add',
        fact: { pred: 'species', args: ['?x', 'bear'], deg: ['*', 0.9, ['min', '?d1', '?d2']] },
      },
    ],
    priority: 40,
  },
  {
    name: 'frog-rule',
    conditions: [
      { pred: 'is-amphibian', args: ['?x'], degVar: '?d1' },
      { pred: 'can-jump', args: ['?x'], degVar: '?d2' },
    ],
    actions: [
      {
        type: 'add',
        fact: { pred: 'species', args: ['?x', 'frog'], deg: ['*', 0.9, ['min', '?d1', '?d2']] },
      },
    ],
    priority: 40,
  },
];
