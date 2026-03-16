import type { Rule } from '../types';

/**
 * Tier 0: ~10 animal classification rules for the fuzzy inference explorable.
 *
 * Chain structure:
 *   Layer 0 (traits): has-hair, has-feathers, eats-meat, has-claws, has-hooves,
 *                     has-stripes, cannot-fly, has-long-neck, is-aquatic
 *   Layer 1 (classes): is-mammal, is-bird, is-carnivore, is-ungulate
 *   Layer 2 (species): zebra, penguin, eagle, tiger, giraffe, dolphin
 *
 * Degree propagation:
 *   - Single-condition rules use ['*', factor, '?d'] to attenuate.
 *   - Multi-condition rules use ['min', '?d1', '?d2'] to take the weakest link,
 *     then multiply by a confidence factor.
 */
export const RULES_10: Rule[] = [
  // --- Base classification rules (priority 60: fire first) ---
  {
    name: 'mammal-rule',
    conditions: [{ pred: 'has-hair', args: ['?x'], degVar: '?d' }],
    actions: [{ type: 'add', fact: { pred: 'is-mammal', args: ['?x'], deg: ['*', 0.95, '?d'] } }],
    priority: 60,
  },
  {
    name: 'bird-rule',
    conditions: [{ pred: 'has-feathers', args: ['?x'], degVar: '?d' }],
    actions: [{ type: 'add', fact: { pred: 'is-bird', args: ['?x'], deg: ['*', 0.95, '?d'] } }],
    priority: 60,
  },
  {
    name: 'carnivore-rule',
    conditions: [
      { pred: 'eats-meat', args: ['?x'], degVar: '?d1' },
      { pred: 'has-claws', args: ['?x'], degVar: '?d2' },
    ],
    actions: [
      {
        type: 'add',
        fact: { pred: 'is-carnivore', args: ['?x'], deg: ['*', 0.9, ['min', '?d1', '?d2']] },
      },
    ],
    priority: 60,
  },

  // --- Intermediate classification (priority 50: fire after base) ---
  {
    name: 'ungulate-rule',
    conditions: [
      { pred: 'is-mammal', args: ['?x'], degVar: '?d1' },
      { pred: 'has-hooves', args: ['?x'], degVar: '?d2' },
    ],
    actions: [
      {
        type: 'add',
        fact: { pred: 'is-ungulate', args: ['?x'], deg: ['*', 0.9, ['min', '?d1', '?d2']] },
      },
    ],
    priority: 50,
  },

  // --- Species rules (priority 40: fire last) ---
  {
    name: 'zebra-rule',
    conditions: [
      { pred: 'is-ungulate', args: ['?x'], degVar: '?d1' },
      { pred: 'has-stripes', args: ['?x'], degVar: '?d2' },
    ],
    actions: [
      {
        type: 'add',
        fact: { pred: 'species', args: ['?x', 'zebra'], deg: ['*', 0.9, ['min', '?d1', '?d2']] },
      },
    ],
    priority: 40,
  },
  {
    name: 'penguin-rule',
    conditions: [
      { pred: 'is-bird', args: ['?x'], degVar: '?d1' },
      { pred: 'cannot-fly', args: ['?x'], degVar: '?d2' },
    ],
    actions: [
      {
        type: 'add',
        fact: {
          pred: 'species',
          args: ['?x', 'penguin'],
          deg: ['*', 0.9, ['min', '?d1', '?d2']],
        },
      },
    ],
    priority: 40,
  },
  {
    name: 'eagle-rule',
    conditions: [
      { pred: 'is-bird', args: ['?x'], degVar: '?d1' },
      { pred: 'is-carnivore', args: ['?x'], degVar: '?d2' },
    ],
    actions: [
      {
        type: 'add',
        fact: { pred: 'species', args: ['?x', 'eagle'], deg: ['*', 0.9, ['min', '?d1', '?d2']] },
      },
    ],
    priority: 40,
  },
  {
    name: 'tiger-rule',
    conditions: [
      { pred: 'is-mammal', args: ['?x'], degVar: '?d1' },
      { pred: 'is-carnivore', args: ['?x'], degVar: '?d2' },
      { pred: 'has-stripes', args: ['?x'], degVar: '?d3' },
    ],
    actions: [
      {
        type: 'add',
        fact: {
          pred: 'species',
          args: ['?x', 'tiger'],
          deg: ['*', 0.9, ['min', '?d1', '?d2', '?d3']],
        },
      },
    ],
    priority: 40,
  },
  {
    name: 'giraffe-rule',
    conditions: [
      { pred: 'is-ungulate', args: ['?x'], degVar: '?d1' },
      { pred: 'has-long-neck', args: ['?x'], degVar: '?d2' },
    ],
    actions: [
      {
        type: 'add',
        fact: {
          pred: 'species',
          args: ['?x', 'giraffe'],
          deg: ['*', 0.9, ['min', '?d1', '?d2']],
        },
      },
    ],
    priority: 40,
  },
  {
    name: 'dolphin-rule',
    conditions: [
      { pred: 'is-mammal', args: ['?x'], degVar: '?d1' },
      { pred: 'is-aquatic', args: ['?x'], degVar: '?d2' },
    ],
    actions: [
      {
        type: 'add',
        fact: {
          pred: 'species',
          args: ['?x', 'dolphin'],
          deg: ['*', 0.9, ['min', '?d1', '?d2']],
        },
      },
    ],
    priority: 40,
  },
];
