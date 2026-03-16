import type { Rule } from '../types';
import { RULES_25 } from './rules-25';

/**
 * Tier 2: ~100 animal classification rules for the fuzzy inference explorable.
 *
 * Superset of RULES_25 (tier 1), adding rules for:
 *   - Insect classification: has-exoskeleton, has-six-legs
 *   - Arachnid classification: has-eight-legs + has-exoskeleton
 *   - Primate classification: is-mammal + has-opposable-thumbs
 *   - Canine/feline intermediate classes
 *   - Habitat-based reasoning: desert, arctic, jungle, savanna
 *   - Behavioral traits: burrows, climbs-trees, hunts-at-night, migrates
 *   - Edge-case disambiguation: pangolin vs armadillo, crow vs raven, seal vs sea lion
 *   - ~30 total species identifiable
 *
 * Priority bands (inherited):
 *   60: base classification (mammal, bird, carnivore, insect, arachnid, primate, etc.)
 *   50: intermediate (ungulate, reptile, canine, feline, habitat combos, etc.)
 *   40: species identification
 */
export const RULES_100: Rule[] = [
  ...RULES_25,

  // =====================================================================
  // Base classification (priority 60)
  // =====================================================================
  {
    name: 'insect-base-rule',
    conditions: [
      { pred: 'has-exoskeleton', args: ['?x'], degVar: '?d1' },
      { pred: 'has-six-legs', args: ['?x'], degVar: '?d2' },
    ],
    actions: [
      {
        type: 'add',
        fact: { pred: 'is-insect', args: ['?x'], deg: ['*', 0.9, ['min', '?d1', '?d2']] },
      },
    ],
    priority: 60,
  },
  {
    name: 'arachnid-base-rule',
    conditions: [
      { pred: 'has-exoskeleton', args: ['?x'], degVar: '?d1' },
      { pred: 'has-eight-legs', args: ['?x'], degVar: '?d2' },
    ],
    actions: [
      {
        type: 'add',
        fact: { pred: 'is-arachnid', args: ['?x'], deg: ['*', 0.9, ['min', '?d1', '?d2']] },
      },
    ],
    priority: 60,
  },
  {
    name: 'herbivore-rule',
    conditions: [
      { pred: 'eats-plants', args: ['?x'], degVar: '?d1' },
      { pred: 'has-hooves', args: ['?x'], degVar: '?d2' },
    ],
    actions: [
      {
        type: 'add',
        fact: { pred: 'is-herbivore', args: ['?x'], deg: ['*', 0.9, ['min', '?d1', '?d2']] },
      },
    ],
    priority: 60,
  },
  {
    name: 'bird-warm-blooded-rule',
    conditions: [{ pred: 'is-bird', args: ['?x'], degVar: '?d' }],
    actions: [
      { type: 'add', fact: { pred: 'is-warm-blooded', args: ['?x'], deg: ['*', 0.95, '?d'] } },
    ],
    priority: 60,
  },
  {
    name: 'mammal-from-milk-rule',
    conditions: [{ pred: 'produces-milk', args: ['?x'], degVar: '?d' }],
    actions: [
      { type: 'add', fact: { pred: 'is-mammal', args: ['?x'], deg: ['*', 0.95, '?d'] } },
    ],
    priority: 60,
  },
  {
    name: 'scavenger-rule',
    conditions: [
      { pred: 'eats-meat', args: ['?x'], degVar: '?d1' },
      { pred: 'eats-carrion', args: ['?x'], degVar: '?d2' },
    ],
    actions: [
      {
        type: 'add',
        fact: { pred: 'is-scavenger', args: ['?x'], deg: ['*', 0.9, ['min', '?d1', '?d2']] },
      },
    ],
    priority: 60,
  },

  // =====================================================================
  // Intermediate classification (priority 50)
  // =====================================================================
  {
    name: 'primate-rule',
    conditions: [
      { pred: 'is-mammal', args: ['?x'], degVar: '?d1' },
      { pred: 'has-opposable-thumbs', args: ['?x'], degVar: '?d2' },
    ],
    actions: [
      {
        type: 'add',
        fact: { pred: 'is-primate', args: ['?x'], deg: ['*', 0.9, ['min', '?d1', '?d2']] },
      },
    ],
    priority: 50,
  },
  {
    name: 'canine-rule',
    conditions: [
      { pred: 'is-mammal', args: ['?x'], degVar: '?d1' },
      { pred: 'is-carnivore', args: ['?x'], degVar: '?d2' },
      { pred: 'has-snout', args: ['?x'], degVar: '?d3' },
    ],
    actions: [
      {
        type: 'add',
        fact: {
          pred: 'is-canine',
          args: ['?x'],
          deg: ['*', 0.9, ['min', '?d1', '?d2', '?d3']],
        },
      },
    ],
    priority: 50,
  },
  {
    name: 'feline-rule',
    conditions: [
      { pred: 'is-mammal', args: ['?x'], degVar: '?d1' },
      { pred: 'is-carnivore', args: ['?x'], degVar: '?d2' },
      { pred: 'has-retractable-claws', args: ['?x'], degVar: '?d3' },
    ],
    actions: [
      {
        type: 'add',
        fact: {
          pred: 'is-feline',
          args: ['?x'],
          deg: ['*', 0.9, ['min', '?d1', '?d2', '?d3']],
        },
      },
    ],
    priority: 50,
  },
  {
    name: 'raptor-rule',
    conditions: [
      { pred: 'is-bird', args: ['?x'], degVar: '?d1' },
      { pred: 'is-carnivore', args: ['?x'], degVar: '?d2' },
      { pred: 'has-talons', args: ['?x'], degVar: '?d3' },
    ],
    actions: [
      {
        type: 'add',
        fact: {
          pred: 'is-raptor',
          args: ['?x'],
          deg: ['*', 0.9, ['min', '?d1', '?d2', '?d3']],
        },
      },
    ],
    priority: 50,
  },
  {
    name: 'marsupial-rule',
    conditions: [
      { pred: 'is-mammal', args: ['?x'], degVar: '?d1' },
      { pred: 'has-pouch', args: ['?x'], degVar: '?d2' },
    ],
    actions: [
      {
        type: 'add',
        fact: { pred: 'is-marsupial', args: ['?x'], deg: ['*', 0.9, ['min', '?d1', '?d2']] },
      },
    ],
    priority: 50,
  },
  {
    name: 'pinniped-rule',
    conditions: [
      { pred: 'is-mammal', args: ['?x'], degVar: '?d1' },
      { pred: 'is-aquatic', args: ['?x'], degVar: '?d2' },
      { pred: 'has-flippers', args: ['?x'], degVar: '?d3' },
    ],
    actions: [
      {
        type: 'add',
        fact: {
          pred: 'is-pinniped',
          args: ['?x'],
          deg: ['*', 0.9, ['min', '?d1', '?d2', '?d3']],
        },
      },
    ],
    priority: 50,
  },
  {
    name: 'waterfowl-rule',
    conditions: [
      { pred: 'is-bird', args: ['?x'], degVar: '?d1' },
      { pred: 'is-aquatic', args: ['?x'], degVar: '?d2' },
    ],
    actions: [
      {
        type: 'add',
        fact: { pred: 'is-waterfowl', args: ['?x'], deg: ['*', 0.9, ['min', '?d1', '?d2']] },
      },
    ],
    priority: 50,
  },
  {
    name: 'rodent-rule',
    conditions: [
      { pred: 'is-mammal', args: ['?x'], degVar: '?d1' },
      { pred: 'has-incisors', args: ['?x'], degVar: '?d2' },
      { pred: 'is-small', args: ['?x'], degVar: '?d3' },
    ],
    actions: [
      {
        type: 'add',
        fact: {
          pred: 'is-rodent',
          args: ['?x'],
          deg: ['*', 0.9, ['min', '?d1', '?d2', '?d3']],
        },
      },
    ],
    priority: 50,
  },
  {
    name: 'cetacean-rule',
    conditions: [
      { pred: 'is-mammal', args: ['?x'], degVar: '?d1' },
      { pred: 'is-aquatic', args: ['?x'], degVar: '?d2' },
      { pred: 'has-blowhole', args: ['?x'], degVar: '?d3' },
    ],
    actions: [
      {
        type: 'add',
        fact: {
          pred: 'is-cetacean',
          args: ['?x'],
          deg: ['*', 0.9, ['min', '?d1', '?d2', '?d3']],
        },
      },
    ],
    priority: 50,
  },
  {
    name: 'flightless-bird-rule',
    conditions: [
      { pred: 'is-bird', args: ['?x'], degVar: '?d1' },
      { pred: 'cannot-fly', args: ['?x'], degVar: '?d2' },
      { pred: 'is-large', args: ['?x'], degVar: '?d3' },
    ],
    actions: [
      {
        type: 'add',
        fact: {
          pred: 'is-flightless-bird',
          args: ['?x'],
          deg: ['*', 0.9, ['min', '?d1', '?d2', '?d3']],
        },
      },
    ],
    priority: 50,
  },
  {
    name: 'desert-dweller-rule',
    conditions: [
      { pred: 'lives-in-desert', args: ['?x'], degVar: '?d1' },
      { pred: 'is-mammal', args: ['?x'], degVar: '?d2' },
    ],
    actions: [
      {
        type: 'add',
        fact: {
          pred: 'is-desert-mammal',
          args: ['?x'],
          deg: ['*', 0.9, ['min', '?d1', '?d2']],
        },
      },
    ],
    priority: 50,
  },
  {
    name: 'arctic-dweller-rule',
    conditions: [
      { pred: 'lives-in-arctic', args: ['?x'], degVar: '?d1' },
      { pred: 'is-mammal', args: ['?x'], degVar: '?d2' },
    ],
    actions: [
      {
        type: 'add',
        fact: {
          pred: 'is-arctic-mammal',
          args: ['?x'],
          deg: ['*', 0.9, ['min', '?d1', '?d2']],
        },
      },
    ],
    priority: 50,
  },
  {
    name: 'nocturnal-mammal-rule',
    conditions: [
      { pred: 'is-mammal', args: ['?x'], degVar: '?d1' },
      { pred: 'is-nocturnal', args: ['?x'], degVar: '?d2' },
    ],
    actions: [
      {
        type: 'add',
        fact: {
          pred: 'is-nocturnal-mammal',
          args: ['?x'],
          deg: ['*', 0.9, ['min', '?d1', '?d2']],
        },
      },
    ],
    priority: 50,
  },
  {
    name: 'turtle-class-rule',
    conditions: [
      { pred: 'is-reptile', args: ['?x'], degVar: '?d1' },
      { pred: 'has-shell', args: ['?x'], degVar: '?d2' },
    ],
    actions: [
      {
        type: 'add',
        fact: { pred: 'is-turtle', args: ['?x'], deg: ['*', 0.9, ['min', '?d1', '?d2']] },
      },
    ],
    priority: 50,
  },

  // =====================================================================
  // Species rules (priority 40)
  // =====================================================================

  // --- Mammals: canines ---
  {
    name: 'wolf-rule',
    conditions: [
      { pred: 'is-canine', args: ['?x'], degVar: '?d1' },
      { pred: 'hunts-in-packs', args: ['?x'], degVar: '?d2' },
    ],
    actions: [
      {
        type: 'add',
        fact: { pred: 'species', args: ['?x', 'wolf'], deg: ['*', 0.9, ['min', '?d1', '?d2']] },
      },
    ],
    priority: 40,
  },
  {
    name: 'fox-rule',
    conditions: [
      { pred: 'is-canine', args: ['?x'], degVar: '?d1' },
      { pred: 'is-small', args: ['?x'], degVar: '?d2' },
    ],
    actions: [
      {
        type: 'add',
        fact: { pred: 'species', args: ['?x', 'fox'], deg: ['*', 0.9, ['min', '?d1', '?d2']] },
      },
    ],
    priority: 40,
  },

  // --- Mammals: felines ---
  {
    name: 'lion-rule',
    conditions: [
      { pred: 'is-feline', args: ['?x'], degVar: '?d1' },
      { pred: 'has-mane', args: ['?x'], degVar: '?d2' },
    ],
    actions: [
      {
        type: 'add',
        fact: { pred: 'species', args: ['?x', 'lion'], deg: ['*', 0.9, ['min', '?d1', '?d2']] },
      },
    ],
    priority: 40,
  },
  {
    name: 'leopard-rule',
    conditions: [
      { pred: 'is-feline', args: ['?x'], degVar: '?d1' },
      { pred: 'has-spots', args: ['?x'], degVar: '?d2' },
      { pred: 'climbs-trees', args: ['?x'], degVar: '?d3' },
    ],
    actions: [
      {
        type: 'add',
        fact: {
          pred: 'species',
          args: ['?x', 'leopard'],
          deg: ['*', 0.9, ['min', '?d1', '?d2', '?d3']],
        },
      },
    ],
    priority: 40,
  },

  // --- Mammals: primates ---
  {
    name: 'gorilla-rule',
    conditions: [
      { pred: 'is-primate', args: ['?x'], degVar: '?d1' },
      { pred: 'is-large', args: ['?x'], degVar: '?d2' },
    ],
    actions: [
      {
        type: 'add',
        fact: {
          pred: 'species',
          args: ['?x', 'gorilla'],
          deg: ['*', 0.9, ['min', '?d1', '?d2']],
        },
      },
    ],
    priority: 40,
  },
  {
    name: 'chimpanzee-rule',
    conditions: [
      { pred: 'is-primate', args: ['?x'], degVar: '?d1' },
      { pred: 'uses-tools', args: ['?x'], degVar: '?d2' },
    ],
    actions: [
      {
        type: 'add',
        fact: {
          pred: 'species',
          args: ['?x', 'chimpanzee'],
          deg: ['*', 0.9, ['min', '?d1', '?d2']],
        },
      },
    ],
    priority: 40,
  },

  // --- Mammals: marsupials ---
  {
    name: 'kangaroo-rule',
    conditions: [
      { pred: 'is-marsupial', args: ['?x'], degVar: '?d1' },
      { pred: 'can-jump', args: ['?x'], degVar: '?d2' },
    ],
    actions: [
      {
        type: 'add',
        fact: {
          pred: 'species',
          args: ['?x', 'kangaroo'],
          deg: ['*', 0.9, ['min', '?d1', '?d2']],
        },
      },
    ],
    priority: 40,
  },
  {
    name: 'koala-rule',
    conditions: [
      { pred: 'is-marsupial', args: ['?x'], degVar: '?d1' },
      { pred: 'climbs-trees', args: ['?x'], degVar: '?d2' },
    ],
    actions: [
      {
        type: 'add',
        fact: {
          pred: 'species',
          args: ['?x', 'koala'],
          deg: ['*', 0.9, ['min', '?d1', '?d2']],
        },
      },
    ],
    priority: 40,
  },

  // --- Mammals: pinnipeds ---
  {
    name: 'seal-rule',
    conditions: [
      { pred: 'is-pinniped', args: ['?x'], degVar: '?d1' },
      { pred: 'is-small', args: ['?x'], degVar: '?d2' },
    ],
    actions: [
      {
        type: 'add',
        fact: { pred: 'species', args: ['?x', 'seal'], deg: ['*', 0.9, ['min', '?d1', '?d2']] },
      },
    ],
    priority: 40,
  },
  {
    name: 'sea-lion-rule',
    conditions: [
      { pred: 'is-pinniped', args: ['?x'], degVar: '?d1' },
      { pred: 'has-ear-flaps', args: ['?x'], degVar: '?d2' },
    ],
    actions: [
      {
        type: 'add',
        fact: {
          pred: 'species',
          args: ['?x', 'sea-lion'],
          deg: ['*', 0.9, ['min', '?d1', '?d2']],
        },
      },
    ],
    priority: 40,
  },

  // --- Mammals: cetaceans ---
  {
    name: 'orca-rule',
    conditions: [
      { pred: 'is-cetacean', args: ['?x'], degVar: '?d1' },
      { pred: 'has-black-white-pattern', args: ['?x'], degVar: '?d2' },
    ],
    actions: [
      {
        type: 'add',
        fact: { pred: 'species', args: ['?x', 'orca'], deg: ['*', 0.9, ['min', '?d1', '?d2']] },
      },
    ],
    priority: 40,
  },

  // --- Mammals: elephants, camels, rhinos ---
  {
    name: 'elephant-rule',
    conditions: [
      { pred: 'is-mammal', args: ['?x'], degVar: '?d1' },
      { pred: 'has-trunk', args: ['?x'], degVar: '?d2' },
      { pred: 'is-large', args: ['?x'], degVar: '?d3' },
    ],
    actions: [
      {
        type: 'add',
        fact: {
          pred: 'species',
          args: ['?x', 'elephant'],
          deg: ['*', 0.9, ['min', '?d1', '?d2', '?d3']],
        },
      },
    ],
    priority: 40,
  },
  {
    name: 'camel-rule',
    conditions: [
      { pred: 'is-desert-mammal', args: ['?x'], degVar: '?d1' },
      { pred: 'has-humps', args: ['?x'], degVar: '?d2' },
    ],
    actions: [
      {
        type: 'add',
        fact: {
          pred: 'species',
          args: ['?x', 'camel'],
          deg: ['*', 0.9, ['min', '?d1', '?d2']],
        },
      },
    ],
    priority: 40,
  },
  {
    name: 'rhinoceros-rule',
    conditions: [
      { pred: 'is-ungulate', args: ['?x'], degVar: '?d1' },
      { pred: 'has-horn', args: ['?x'], degVar: '?d2' },
      { pred: 'is-large', args: ['?x'], degVar: '?d3' },
    ],
    actions: [
      {
        type: 'add',
        fact: {
          pred: 'species',
          args: ['?x', 'rhinoceros'],
          deg: ['*', 0.9, ['min', '?d1', '?d2', '?d3']],
        },
      },
    ],
    priority: 40,
  },

  // --- Mammals: rodents ---
  {
    name: 'squirrel-rule',
    conditions: [
      { pred: 'is-rodent', args: ['?x'], degVar: '?d1' },
      { pred: 'climbs-trees', args: ['?x'], degVar: '?d2' },
    ],
    actions: [
      {
        type: 'add',
        fact: {
          pred: 'species',
          args: ['?x', 'squirrel'],
          deg: ['*', 0.9, ['min', '?d1', '?d2']],
        },
      },
    ],
    priority: 40,
  },
  {
    name: 'beaver-rule',
    conditions: [
      { pred: 'is-rodent', args: ['?x'], degVar: '?d1' },
      { pred: 'is-aquatic', args: ['?x'], degVar: '?d2' },
    ],
    actions: [
      {
        type: 'add',
        fact: {
          pred: 'species',
          args: ['?x', 'beaver'],
          deg: ['*', 0.9, ['min', '?d1', '?d2']],
        },
      },
    ],
    priority: 40,
  },

  // --- Mammals: nocturnal/arctic/desert ---
  {
    name: 'polar-bear-rule',
    conditions: [
      { pred: 'is-arctic-mammal', args: ['?x'], degVar: '?d1' },
      { pred: 'is-carnivore', args: ['?x'], degVar: '?d2' },
      { pred: 'is-large', args: ['?x'], degVar: '?d3' },
    ],
    actions: [
      {
        type: 'add',
        fact: {
          pred: 'species',
          args: ['?x', 'polar-bear'],
          deg: ['*', 0.9, ['min', '?d1', '?d2', '?d3']],
        },
      },
    ],
    priority: 40,
  },

  // --- Mammals: misc ---
  {
    name: 'horse-rule',
    conditions: [
      { pred: 'is-ungulate', args: ['?x'], degVar: '?d1' },
      { pred: 'has-mane', args: ['?x'], degVar: '?d2' },
      { pred: 'is-fast', args: ['?x'], degVar: '?d3' },
    ],
    actions: [
      {
        type: 'add',
        fact: {
          pred: 'species',
          args: ['?x', 'horse'],
          deg: ['*', 0.9, ['min', '?d1', '?d2', '?d3']],
        },
      },
    ],
    priority: 40,
  },
  {
    name: 'hippopotamus-rule',
    conditions: [
      { pred: 'is-mammal', args: ['?x'], degVar: '?d1' },
      { pred: 'is-aquatic', args: ['?x'], degVar: '?d2' },
      { pred: 'is-large', args: ['?x'], degVar: '?d3' },
      { pred: 'is-herbivore', args: ['?x'], degVar: '?d4' },
    ],
    actions: [
      {
        type: 'add',
        fact: {
          pred: 'species',
          args: ['?x', 'hippopotamus'],
          deg: ['*', 0.9, ['min', '?d1', '?d2', '?d3', '?d4']],
        },
      },
    ],
    priority: 40,
  },

  // --- Birds ---
  {
    name: 'hawk-rule',
    conditions: [
      { pred: 'is-raptor', args: ['?x'], degVar: '?d1' },
      { pred: 'is-small', args: ['?x'], degVar: '?d2' },
    ],
    actions: [
      {
        type: 'add',
        fact: { pred: 'species', args: ['?x', 'hawk'], deg: ['*', 0.9, ['min', '?d1', '?d2']] },
      },
    ],
    priority: 40,
  },
  {
    name: 'falcon-rule',
    conditions: [
      { pred: 'is-raptor', args: ['?x'], degVar: '?d1' },
      { pred: 'is-fast', args: ['?x'], degVar: '?d2' },
    ],
    actions: [
      {
        type: 'add',
        fact: {
          pred: 'species',
          args: ['?x', 'falcon'],
          deg: ['*', 0.9, ['min', '?d1', '?d2']],
        },
      },
    ],
    priority: 40,
  },
  {
    name: 'crow-rule',
    conditions: [
      { pred: 'is-bird', args: ['?x'], degVar: '?d1' },
      { pred: 'is-scavenger', args: ['?x'], degVar: '?d2' },
      { pred: 'is-small', args: ['?x'], degVar: '?d3' },
    ],
    actions: [
      {
        type: 'add',
        fact: {
          pred: 'species',
          args: ['?x', 'crow'],
          deg: ['*', 0.9, ['min', '?d1', '?d2', '?d3']],
        },
      },
    ],
    priority: 40,
  },
  {
    name: 'raven-rule',
    conditions: [
      { pred: 'is-bird', args: ['?x'], degVar: '?d1' },
      { pred: 'is-scavenger', args: ['?x'], degVar: '?d2' },
      { pred: 'is-large', args: ['?x'], degVar: '?d3' },
    ],
    actions: [
      {
        type: 'add',
        fact: {
          pred: 'species',
          args: ['?x', 'raven'],
          deg: ['*', 0.9, ['min', '?d1', '?d2', '?d3']],
        },
      },
    ],
    priority: 40,
  },
  {
    name: 'ostrich-rule',
    conditions: [
      { pred: 'is-flightless-bird', args: ['?x'], degVar: '?d1' },
      { pred: 'is-fast', args: ['?x'], degVar: '?d2' },
    ],
    actions: [
      {
        type: 'add',
        fact: {
          pred: 'species',
          args: ['?x', 'ostrich'],
          deg: ['*', 0.9, ['min', '?d1', '?d2']],
        },
      },
    ],
    priority: 40,
  },
  {
    name: 'flamingo-rule',
    conditions: [
      { pred: 'is-waterfowl', args: ['?x'], degVar: '?d1' },
      { pred: 'has-long-legs', args: ['?x'], degVar: '?d2' },
    ],
    actions: [
      {
        type: 'add',
        fact: {
          pred: 'species',
          args: ['?x', 'flamingo'],
          deg: ['*', 0.9, ['min', '?d1', '?d2']],
        },
      },
    ],
    priority: 40,
  },
  {
    name: 'duck-rule',
    conditions: [
      { pred: 'is-waterfowl', args: ['?x'], degVar: '?d1' },
      { pred: 'has-webbed-feet', args: ['?x'], degVar: '?d2' },
    ],
    actions: [
      {
        type: 'add',
        fact: { pred: 'species', args: ['?x', 'duck'], deg: ['*', 0.9, ['min', '?d1', '?d2']] },
      },
    ],
    priority: 40,
  },

  // --- Reptiles ---
  {
    name: 'turtle-rule',
    conditions: [
      { pred: 'is-turtle', args: ['?x'], degVar: '?d1' },
      { pred: 'is-aquatic', args: ['?x'], degVar: '?d2' },
    ],
    actions: [
      {
        type: 'add',
        fact: {
          pred: 'species',
          args: ['?x', 'sea-turtle'],
          deg: ['*', 0.9, ['min', '?d1', '?d2']],
        },
      },
    ],
    priority: 40,
  },
  {
    name: 'tortoise-rule',
    conditions: [
      { pred: 'is-turtle', args: ['?x'], degVar: '?d1' },
      { pred: 'lives-on-land', args: ['?x'], degVar: '?d2' },
    ],
    actions: [
      {
        type: 'add',
        fact: {
          pred: 'species',
          args: ['?x', 'tortoise'],
          deg: ['*', 0.9, ['min', '?d1', '?d2']],
        },
      },
    ],
    priority: 40,
  },
  {
    name: 'lizard-rule',
    conditions: [
      { pred: 'is-reptile', args: ['?x'], degVar: '?d1' },
      { pred: 'has-legs', args: ['?x'], degVar: '?d2' },
      { pred: 'is-small', args: ['?x'], degVar: '?d3' },
    ],
    actions: [
      {
        type: 'add',
        fact: {
          pred: 'species',
          args: ['?x', 'lizard'],
          deg: ['*', 0.9, ['min', '?d1', '?d2', '?d3']],
        },
      },
    ],
    priority: 40,
  },
  {
    name: 'chameleon-rule',
    conditions: [
      { pred: 'is-reptile', args: ['?x'], degVar: '?d1' },
      { pred: 'changes-color', args: ['?x'], degVar: '?d2' },
    ],
    actions: [
      {
        type: 'add',
        fact: {
          pred: 'species',
          args: ['?x', 'chameleon'],
          deg: ['*', 0.9, ['min', '?d1', '?d2']],
        },
      },
    ],
    priority: 40,
  },

  // --- Amphibians ---
  {
    name: 'salamander-rule',
    conditions: [
      { pred: 'is-amphibian', args: ['?x'], degVar: '?d1' },
      { pred: 'has-tail', args: ['?x'], degVar: '?d2' },
    ],
    actions: [
      {
        type: 'add',
        fact: {
          pred: 'species',
          args: ['?x', 'salamander'],
          deg: ['*', 0.9, ['min', '?d1', '?d2']],
        },
      },
    ],
    priority: 40,
  },
  {
    name: 'toad-rule',
    conditions: [
      { pred: 'is-amphibian', args: ['?x'], degVar: '?d1' },
      { pred: 'has-dry-skin', args: ['?x'], degVar: '?d2' },
    ],
    actions: [
      {
        type: 'add',
        fact: {
          pred: 'species',
          args: ['?x', 'toad'],
          deg: ['*', 0.9, ['min', '?d1', '?d2']],
        },
      },
    ],
    priority: 40,
  },

  // --- Insects ---
  {
    name: 'butterfly-rule',
    conditions: [
      { pred: 'is-insect', args: ['?x'], degVar: '?d1' },
      { pred: 'has-wings', args: ['?x'], degVar: '?d2' },
      { pred: 'has-bright-colors', args: ['?x'], degVar: '?d3' },
    ],
    actions: [
      {
        type: 'add',
        fact: {
          pred: 'species',
          args: ['?x', 'butterfly'],
          deg: ['*', 0.9, ['min', '?d1', '?d2', '?d3']],
        },
      },
    ],
    priority: 40,
  },
  {
    name: 'ant-rule',
    conditions: [
      { pred: 'is-insect', args: ['?x'], degVar: '?d1' },
      { pred: 'lives-in-colony', args: ['?x'], degVar: '?d2' },
    ],
    actions: [
      {
        type: 'add',
        fact: { pred: 'species', args: ['?x', 'ant'], deg: ['*', 0.9, ['min', '?d1', '?d2']] },
      },
    ],
    priority: 40,
  },
  {
    name: 'bee-rule',
    conditions: [
      { pred: 'is-insect', args: ['?x'], degVar: '?d1' },
      { pred: 'produces-honey', args: ['?x'], degVar: '?d2' },
    ],
    actions: [
      {
        type: 'add',
        fact: { pred: 'species', args: ['?x', 'bee'], deg: ['*', 0.9, ['min', '?d1', '?d2']] },
      },
    ],
    priority: 40,
  },

  // --- Arachnids ---
  {
    name: 'spider-rule',
    conditions: [
      { pred: 'is-arachnid', args: ['?x'], degVar: '?d1' },
      { pred: 'spins-webs', args: ['?x'], degVar: '?d2' },
    ],
    actions: [
      {
        type: 'add',
        fact: {
          pred: 'species',
          args: ['?x', 'spider'],
          deg: ['*', 0.9, ['min', '?d1', '?d2']],
        },
      },
    ],
    priority: 40,
  },
  {
    name: 'scorpion-rule',
    conditions: [
      { pred: 'is-arachnid', args: ['?x'], degVar: '?d1' },
      { pred: 'has-stinger', args: ['?x'], degVar: '?d2' },
    ],
    actions: [
      {
        type: 'add',
        fact: {
          pred: 'species',
          args: ['?x', 'scorpion'],
          deg: ['*', 0.9, ['min', '?d1', '?d2']],
        },
      },
    ],
    priority: 40,
  },

  // --- Edge-case disambiguators ---
  {
    name: 'pangolin-rule',
    conditions: [
      { pred: 'is-mammal', args: ['?x'], degVar: '?d1' },
      { pred: 'has-scales', args: ['?x'], degVar: '?d2' },
      { pred: 'eats-insects', args: ['?x'], degVar: '?d3' },
    ],
    actions: [
      {
        type: 'add',
        fact: {
          pred: 'species',
          args: ['?x', 'pangolin'],
          deg: ['*', 0.9, ['min', '?d1', '?d2', '?d3']],
        },
      },
    ],
    priority: 40,
  },
  {
    name: 'armadillo-rule',
    conditions: [
      { pred: 'is-mammal', args: ['?x'], degVar: '?d1' },
      { pred: 'has-armor', args: ['?x'], degVar: '?d2' },
      { pred: 'burrows', args: ['?x'], degVar: '?d3' },
    ],
    actions: [
      {
        type: 'add',
        fact: {
          pred: 'species',
          args: ['?x', 'armadillo'],
          deg: ['*', 0.9, ['min', '?d1', '?d2', '?d3']],
        },
      },
    ],
    priority: 40,
  },
  {
    name: 'hedgehog-rule',
    conditions: [
      { pred: 'is-mammal', args: ['?x'], degVar: '?d1' },
      { pred: 'has-spines', args: ['?x'], degVar: '?d2' },
      { pred: 'is-nocturnal', args: ['?x'], degVar: '?d3' },
    ],
    actions: [
      {
        type: 'add',
        fact: {
          pred: 'species',
          args: ['?x', 'hedgehog'],
          deg: ['*', 0.9, ['min', '?d1', '?d2', '?d3']],
        },
      },
    ],
    priority: 40,
  },
  {
    name: 'porcupine-rule',
    conditions: [
      { pred: 'is-rodent', args: ['?x'], degVar: '?d1' },
      { pred: 'has-quills', args: ['?x'], degVar: '?d2' },
    ],
    actions: [
      {
        type: 'add',
        fact: {
          pred: 'species',
          args: ['?x', 'porcupine'],
          deg: ['*', 0.9, ['min', '?d1', '?d2']],
        },
      },
    ],
    priority: 40,
  },

  // --- Mammals: additional species ---
  {
    name: 'raccoon-rule',
    conditions: [
      { pred: 'is-nocturnal-mammal', args: ['?x'], degVar: '?d1' },
      { pred: 'is-omnivore', args: ['?x'], degVar: '?d2' },
      { pred: 'is-small', args: ['?x'], degVar: '?d3' },
    ],
    actions: [
      {
        type: 'add',
        fact: {
          pred: 'species',
          args: ['?x', 'raccoon'],
          deg: ['*', 0.9, ['min', '?d1', '?d2', '?d3']],
        },
      },
    ],
    priority: 40,
  },
  {
    name: 'otter-rule',
    conditions: [
      { pred: 'is-mammal', args: ['?x'], degVar: '?d1' },
      { pred: 'is-aquatic', args: ['?x'], degVar: '?d2' },
      { pred: 'is-small', args: ['?x'], degVar: '?d3' },
      { pred: 'uses-tools', args: ['?x'], degVar: '?d4' },
    ],
    actions: [
      {
        type: 'add',
        fact: {
          pred: 'species',
          args: ['?x', 'otter'],
          deg: ['*', 0.9, ['min', '?d1', '?d2', '?d3', '?d4']],
        },
      },
    ],
    priority: 40,
  },
  {
    name: 'sloth-rule',
    conditions: [
      { pred: 'is-mammal', args: ['?x'], degVar: '?d1' },
      { pred: 'climbs-trees', args: ['?x'], degVar: '?d2' },
      { pred: 'is-slow', args: ['?x'], degVar: '?d3' },
    ],
    actions: [
      {
        type: 'add',
        fact: {
          pred: 'species',
          args: ['?x', 'sloth'],
          deg: ['*', 0.9, ['min', '?d1', '?d2', '?d3']],
        },
      },
    ],
    priority: 40,
  },
  {
    name: 'moose-rule',
    conditions: [
      { pred: 'is-ungulate', args: ['?x'], degVar: '?d1' },
      { pred: 'has-antlers', args: ['?x'], degVar: '?d2' },
      { pred: 'is-large', args: ['?x'], degVar: '?d3' },
    ],
    actions: [
      {
        type: 'add',
        fact: {
          pred: 'species',
          args: ['?x', 'moose'],
          deg: ['*', 0.9, ['min', '?d1', '?d2', '?d3']],
        },
      },
    ],
    priority: 40,
  },
  {
    name: 'deer-rule',
    conditions: [
      { pred: 'is-ungulate', args: ['?x'], degVar: '?d1' },
      { pred: 'has-antlers', args: ['?x'], degVar: '?d2' },
      { pred: 'is-small', args: ['?x'], degVar: '?d3' },
    ],
    actions: [
      {
        type: 'add',
        fact: {
          pred: 'species',
          args: ['?x', 'deer'],
          deg: ['*', 0.9, ['min', '?d1', '?d2', '?d3']],
        },
      },
    ],
    priority: 40,
  },

  // --- Birds: additional species ---
  {
    name: 'hummingbird-rule',
    conditions: [
      { pred: 'is-bird', args: ['?x'], degVar: '?d1' },
      { pred: 'is-small', args: ['?x'], degVar: '?d2' },
      { pred: 'hovers', args: ['?x'], degVar: '?d3' },
    ],
    actions: [
      {
        type: 'add',
        fact: {
          pred: 'species',
          args: ['?x', 'hummingbird'],
          deg: ['*', 0.9, ['min', '?d1', '?d2', '?d3']],
        },
      },
    ],
    priority: 40,
  },
  {
    name: 'pelican-rule',
    conditions: [
      { pred: 'is-waterfowl', args: ['?x'], degVar: '?d1' },
      { pred: 'has-large-beak', args: ['?x'], degVar: '?d2' },
    ],
    actions: [
      {
        type: 'add',
        fact: {
          pred: 'species',
          args: ['?x', 'pelican'],
          deg: ['*', 0.9, ['min', '?d1', '?d2']],
        },
      },
    ],
    priority: 40,
  },
  {
    name: 'woodpecker-rule',
    conditions: [
      { pred: 'is-bird', args: ['?x'], degVar: '?d1' },
      { pred: 'pecks-wood', args: ['?x'], degVar: '?d2' },
    ],
    actions: [
      {
        type: 'add',
        fact: {
          pred: 'species',
          args: ['?x', 'woodpecker'],
          deg: ['*', 0.9, ['min', '?d1', '?d2']],
        },
      },
    ],
    priority: 40,
  },

  // --- Reptiles: additional ---
  {
    name: 'alligator-rule',
    conditions: [
      { pred: 'is-reptile', args: ['?x'], degVar: '?d1' },
      { pred: 'is-aquatic', args: ['?x'], degVar: '?d2' },
      { pred: 'has-broad-snout', args: ['?x'], degVar: '?d3' },
    ],
    actions: [
      {
        type: 'add',
        fact: {
          pred: 'species',
          args: ['?x', 'alligator'],
          deg: ['*', 0.9, ['min', '?d1', '?d2', '?d3']],
        },
      },
    ],
    priority: 40,
  },
  {
    name: 'iguana-rule',
    conditions: [
      { pred: 'is-reptile', args: ['?x'], degVar: '?d1' },
      { pred: 'has-legs', args: ['?x'], degVar: '?d2' },
      { pred: 'is-herbivore', args: ['?x'], degVar: '?d3' },
    ],
    actions: [
      {
        type: 'add',
        fact: {
          pred: 'species',
          args: ['?x', 'iguana'],
          deg: ['*', 0.9, ['min', '?d1', '?d2', '?d3']],
        },
      },
    ],
    priority: 40,
  },
  {
    name: 'gecko-rule',
    conditions: [
      { pred: 'is-reptile', args: ['?x'], degVar: '?d1' },
      { pred: 'climbs-walls', args: ['?x'], degVar: '?d2' },
      { pred: 'is-small', args: ['?x'], degVar: '?d3' },
    ],
    actions: [
      {
        type: 'add',
        fact: {
          pred: 'species',
          args: ['?x', 'gecko'],
          deg: ['*', 0.9, ['min', '?d1', '?d2', '?d3']],
        },
      },
    ],
    priority: 40,
  },

  // --- Insects: additional ---
  {
    name: 'dragonfly-rule',
    conditions: [
      { pred: 'is-insect', args: ['?x'], degVar: '?d1' },
      { pred: 'has-wings', args: ['?x'], degVar: '?d2' },
      { pred: 'is-aquatic', args: ['?x'], degVar: '?d3' },
    ],
    actions: [
      {
        type: 'add',
        fact: {
          pred: 'species',
          args: ['?x', 'dragonfly'],
          deg: ['*', 0.9, ['min', '?d1', '?d2', '?d3']],
        },
      },
    ],
    priority: 40,
  },
  {
    name: 'beetle-rule',
    conditions: [
      { pred: 'is-insect', args: ['?x'], degVar: '?d1' },
      { pred: 'has-hard-shell', args: ['?x'], degVar: '?d2' },
    ],
    actions: [
      {
        type: 'add',
        fact: {
          pred: 'species',
          args: ['?x', 'beetle'],
          deg: ['*', 0.9, ['min', '?d1', '?d2']],
        },
      },
    ],
    priority: 40,
  },
];
