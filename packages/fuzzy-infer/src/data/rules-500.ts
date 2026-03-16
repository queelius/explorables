import type { Rule, DegreeExpr } from '../types';
import { RULES_100 } from './rules-100';

/**
 * Tier 3: ~500 animal classification rules for the fuzzy inference explorable.
 *
 * Superset of RULES_100 (tier 2), adding rules for the "long tail" of knowledge:
 *   - Obscure species: axolotl, platypus, narwhal, pangolin variant, okapi, cassowary
 *   - Detailed trait combinations for disambiguation
 *   - Regional/habitat variants (jungle, tundra, savanna, reef, deep-sea)
 *   - Behavioral and dietary specifics (filter-feeds, echolocates, hibernates)
 *   - Fish, mollusk, crustacean classifications
 *   - Domestic vs wild variants
 *   - ~100+ total species identifiable
 *
 * Priority bands (inherited):
 *   60: base classification
 *   50: intermediate classification
 *   40: species identification
 *   35: subspecies / variant identification
 */

// --- Helper: build a species rule concisely ---
function sp(
  name: string,
  conditions: Array<{ pred: string; args: string[]; degVar?: string }>,
  species: string,
  priority = 40
): Rule {
  const degVars = conditions.map((c) => c.degVar).filter(Boolean) as string[];
  const degExpr =
    degVars.length === 1
      ? ['*', 0.9, degVars[0]] as DegreeExpr
      : ['*', 0.9, ['min', ...degVars]] as DegreeExpr;
  return {
    name,
    conditions: conditions.map((c) => ({
      pred: c.pred,
      args: c.args,
      ...(c.degVar ? { degVar: c.degVar } : {}),
    })),
    actions: [{ type: 'add', fact: { pred: 'species', args: ['?x', species], deg: degExpr } }],
    priority,
  };
}

// --- Helper: build an intermediate classification rule ---
function cls(
  name: string,
  conditions: Array<{ pred: string; args: string[]; degVar?: string }>,
  resultPred: string,
  priority = 50
): Rule {
  const degVars = conditions.map((c) => c.degVar).filter(Boolean) as string[];
  const degExpr: DegreeExpr =
    degVars.length === 1
      ? ['*', 0.9, degVars[0]]
      : ['*', 0.9, ['min', ...degVars]];
  return {
    name,
    conditions: conditions.map((c) => ({
      pred: c.pred,
      args: c.args,
      ...(c.degVar ? { degVar: c.degVar } : {}),
    })),
    actions: [{ type: 'add', fact: { pred: resultPred, args: ['?x'], deg: degExpr } }],
    priority,
  };
}

export const RULES_500: Rule[] = [
  ...RULES_100,

  // =====================================================================
  // BASE CLASSIFICATION (priority 60) — new trait-to-class mappings
  // =====================================================================
  cls(
    'fish-base-rule',
    [
      { pred: 'has-gills', args: ['?x'], degVar: '?d1' },
      { pred: 'has-fins', args: ['?x'], degVar: '?d2' },
    ],
    'is-fish',
    60
  ),
  cls(
    'mollusk-base-rule',
    [
      { pred: 'has-soft-body', args: ['?x'], degVar: '?d1' },
      { pred: 'is-aquatic', args: ['?x'], degVar: '?d2' },
    ],
    'is-mollusk',
    60
  ),
  cls(
    'crustacean-base-rule',
    [
      { pred: 'has-exoskeleton', args: ['?x'], degVar: '?d1' },
      { pred: 'is-aquatic', args: ['?x'], degVar: '?d2' },
    ],
    'is-crustacean',
    60
  ),
  cls(
    'bird-from-eggs-feathers-rule',
    [
      { pred: 'lays-eggs', args: ['?x'], degVar: '?d1' },
      { pred: 'has-feathers', args: ['?x'], degVar: '?d2' },
    ],
    'is-bird',
    60
  ),
  cls(
    'mammal-from-hair-warm-rule',
    [
      { pred: 'has-hair', args: ['?x'], degVar: '?d1' },
      { pred: 'is-warm-blooded', args: ['?x'], degVar: '?d2' },
    ],
    'is-mammal',
    60
  ),
  cls(
    'venomous-rule',
    [
      { pred: 'has-venom', args: ['?x'], degVar: '?d1' },
      { pred: 'has-fangs', args: ['?x'], degVar: '?d2' },
    ],
    'is-venomous',
    60
  ),
  cls(
    'filter-feeder-rule',
    [{ pred: 'filter-feeds', args: ['?x'], degVar: '?d1' }],
    'is-filter-feeder',
    60
  ),
  cls(
    'echolocator-rule',
    [{ pred: 'echolocates', args: ['?x'], degVar: '?d1' }],
    'uses-echolocation',
    60
  ),
  cls(
    'migratory-rule',
    [{ pred: 'migrates', args: ['?x'], degVar: '?d1' }],
    'is-migratory',
    60
  ),
  cls(
    'bioluminescent-rule',
    [{ pred: 'produces-light', args: ['?x'], degVar: '?d1' }],
    'is-bioluminescent',
    60
  ),
  cls(
    'domesticated-rule',
    [{ pred: 'is-domesticated', args: ['?x'], degVar: '?d1' }],
    'is-domestic',
    60
  ),
  cls(
    'pack-animal-rule',
    [
      { pred: 'hunts-in-packs', args: ['?x'], degVar: '?d1' },
      { pred: 'is-carnivore', args: ['?x'], degVar: '?d2' },
    ],
    'is-pack-hunter',
    60
  ),
  cls(
    'parasitic-rule',
    [{ pred: 'is-parasitic', args: ['?x'], degVar: '?d1' }],
    'is-parasite',
    60
  ),
  cls(
    'symbiotic-rule',
    [{ pred: 'lives-symbiotically', args: ['?x'], degVar: '?d1' }],
    'is-symbiont',
    60
  ),

  // =====================================================================
  // INTERMEDIATE CLASSIFICATION (priority 50)
  // =====================================================================

  // --- Fish sub-classes ---
  cls(
    'shark-class-rule',
    [
      { pred: 'is-fish', args: ['?x'], degVar: '?d1' },
      { pred: 'is-carnivore', args: ['?x'], degVar: '?d2' },
      { pred: 'is-large', args: ['?x'], degVar: '?d3' },
    ],
    'is-shark',
    50
  ),
  cls(
    'ray-class-rule',
    [
      { pred: 'is-fish', args: ['?x'], degVar: '?d1' },
      { pred: 'has-flat-body', args: ['?x'], degVar: '?d2' },
    ],
    'is-ray',
    50
  ),
  cls(
    'reef-fish-rule',
    [
      { pred: 'is-fish', args: ['?x'], degVar: '?d1' },
      { pred: 'lives-in-reef', args: ['?x'], degVar: '?d2' },
    ],
    'is-reef-fish',
    50
  ),
  cls(
    'deep-sea-fish-rule',
    [
      { pred: 'is-fish', args: ['?x'], degVar: '?d1' },
      { pred: 'lives-in-deep-sea', args: ['?x'], degVar: '?d2' },
    ],
    'is-deep-sea-fish',
    50
  ),
  cls(
    'freshwater-fish-rule',
    [
      { pred: 'is-fish', args: ['?x'], degVar: '?d1' },
      { pred: 'lives-in-freshwater', args: ['?x'], degVar: '?d2' },
    ],
    'is-freshwater-fish',
    50
  ),

  // --- Mollusk sub-classes ---
  cls(
    'cephalopod-rule',
    [
      { pred: 'is-mollusk', args: ['?x'], degVar: '?d1' },
      { pred: 'has-tentacles', args: ['?x'], degVar: '?d2' },
    ],
    'is-cephalopod',
    50
  ),
  cls(
    'bivalve-rule',
    [
      { pred: 'is-mollusk', args: ['?x'], degVar: '?d1' },
      { pred: 'has-two-shells', args: ['?x'], degVar: '?d2' },
    ],
    'is-bivalve',
    50
  ),
  cls(
    'gastropod-rule',
    [
      { pred: 'is-mollusk', args: ['?x'], degVar: '?d1' },
      { pred: 'has-single-shell', args: ['?x'], degVar: '?d2' },
    ],
    'is-gastropod',
    50
  ),

  // --- Crustacean sub-classes ---
  cls(
    'decapod-rule',
    [
      { pred: 'is-crustacean', args: ['?x'], degVar: '?d1' },
      { pred: 'has-ten-legs', args: ['?x'], degVar: '?d2' },
    ],
    'is-decapod',
    50
  ),

  // --- More mammal sub-classes ---
  cls(
    'bovine-rule',
    [
      { pred: 'is-ungulate', args: ['?x'], degVar: '?d1' },
      { pred: 'has-horns', args: ['?x'], degVar: '?d2' },
    ],
    'is-bovine',
    50
  ),
  cls(
    'equine-rule',
    [
      { pred: 'is-ungulate', args: ['?x'], degVar: '?d1' },
      { pred: 'has-mane', args: ['?x'], degVar: '?d2' },
    ],
    'is-equine',
    50
  ),
  cls(
    'pachyderm-rule',
    [
      { pred: 'is-mammal', args: ['?x'], degVar: '?d1' },
      { pred: 'has-thick-skin', args: ['?x'], degVar: '?d2' },
      { pred: 'is-large', args: ['?x'], degVar: '?d3' },
    ],
    'is-pachyderm',
    50
  ),
  cls(
    'mustelid-rule',
    [
      { pred: 'is-mammal', args: ['?x'], degVar: '?d1' },
      { pred: 'is-carnivore', args: ['?x'], degVar: '?d2' },
      { pred: 'has-elongated-body', args: ['?x'], degVar: '?d3' },
    ],
    'is-mustelid',
    50
  ),
  cls(
    'ursine-rule',
    [
      { pred: 'is-mammal', args: ['?x'], degVar: '?d1' },
      { pred: 'is-large', args: ['?x'], degVar: '?d2' },
      { pred: 'has-claws', args: ['?x'], degVar: '?d3' },
    ],
    'is-ursine',
    50
  ),
  cls(
    'lagomorph-rule',
    [
      { pred: 'is-mammal', args: ['?x'], degVar: '?d1' },
      { pred: 'has-long-ears', args: ['?x'], degVar: '?d2' },
      { pred: 'can-jump', args: ['?x'], degVar: '?d3' },
    ],
    'is-lagomorph',
    50
  ),
  cls(
    'flying-insect-rule',
    [
      { pred: 'is-insect', args: ['?x'], degVar: '?d1' },
      { pred: 'has-wings', args: ['?x'], degVar: '?d2' },
    ],
    'is-flying-insect',
    50
  ),
  cls(
    'social-insect-rule',
    [
      { pred: 'is-insect', args: ['?x'], degVar: '?d1' },
      { pred: 'lives-in-colony', args: ['?x'], degVar: '?d2' },
    ],
    'is-social-insect',
    50
  ),
  cls(
    'wading-bird-rule',
    [
      { pred: 'is-bird', args: ['?x'], degVar: '?d1' },
      { pred: 'has-long-legs', args: ['?x'], degVar: '?d2' },
      { pred: 'is-aquatic', args: ['?x'], degVar: '?d3' },
    ],
    'is-wading-bird',
    50
  ),
  cls(
    'songbird-rule',
    [
      { pred: 'is-bird', args: ['?x'], degVar: '?d1' },
      { pred: 'sings', args: ['?x'], degVar: '?d2' },
      { pred: 'is-small', args: ['?x'], degVar: '?d3' },
    ],
    'is-songbird',
    50
  ),
  cls(
    'seabird-rule',
    [
      { pred: 'is-bird', args: ['?x'], degVar: '?d1' },
      { pred: 'lives-near-coast', args: ['?x'], degVar: '?d2' },
    ],
    'is-seabird',
    50
  ),
  cls(
    'tropical-bird-rule',
    [
      { pred: 'is-bird', args: ['?x'], degVar: '?d1' },
      { pred: 'lives-in-tropics', args: ['?x'], degVar: '?d2' },
      { pred: 'has-bright-colors', args: ['?x'], degVar: '?d3' },
    ],
    'is-tropical-bird',
    50
  ),
  cls(
    'jungle-mammal-rule',
    [
      { pred: 'is-mammal', args: ['?x'], degVar: '?d1' },
      { pred: 'lives-in-jungle', args: ['?x'], degVar: '?d2' },
    ],
    'is-jungle-mammal',
    50
  ),
  cls(
    'savanna-mammal-rule',
    [
      { pred: 'is-mammal', args: ['?x'], degVar: '?d1' },
      { pred: 'lives-in-savanna', args: ['?x'], degVar: '?d2' },
    ],
    'is-savanna-mammal',
    50
  ),
  cls(
    'tundra-mammal-rule',
    [
      { pred: 'is-mammal', args: ['?x'], degVar: '?d1' },
      { pred: 'lives-in-tundra', args: ['?x'], degVar: '?d2' },
    ],
    'is-tundra-mammal',
    50
  ),
  cls(
    'cave-dweller-rule',
    [
      { pred: 'lives-in-caves', args: ['?x'], degVar: '?d1' },
      { pred: 'is-nocturnal', args: ['?x'], degVar: '?d2' },
    ],
    'is-cave-dweller',
    50
  ),
  cls(
    'arboreal-rule',
    [
      { pred: 'climbs-trees', args: ['?x'], degVar: '?d1' },
      { pred: 'lives-in-trees', args: ['?x'], degVar: '?d2' },
    ],
    'is-arboreal',
    50
  ),
  cls(
    'burrowing-mammal-rule',
    [
      { pred: 'is-mammal', args: ['?x'], degVar: '?d1' },
      { pred: 'burrows', args: ['?x'], degVar: '?d2' },
    ],
    'is-burrowing-mammal',
    50
  ),
  cls(
    'monotreme-rule',
    [
      { pred: 'is-mammal', args: ['?x'], degVar: '?d1' },
      { pred: 'lays-eggs', args: ['?x'], degVar: '?d2' },
    ],
    'is-monotreme',
    50
  ),
  cls(
    'venomous-snake-rule',
    [
      { pred: 'is-reptile', args: ['?x'], degVar: '?d1' },
      { pred: 'has-no-legs', args: ['?x'], degVar: '?d2' },
      { pred: 'is-venomous', args: ['?x'], degVar: '?d3' },
    ],
    'is-venomous-snake',
    50
  ),
  cls(
    'constrictor-rule',
    [
      { pred: 'is-reptile', args: ['?x'], degVar: '?d1' },
      { pred: 'has-no-legs', args: ['?x'], degVar: '?d2' },
      { pred: 'constricts-prey', args: ['?x'], degVar: '?d3' },
    ],
    'is-constrictor',
    50
  ),
  cls(
    'marine-reptile-rule',
    [
      { pred: 'is-reptile', args: ['?x'], degVar: '?d1' },
      { pred: 'is-aquatic', args: ['?x'], degVar: '?d2' },
      { pred: 'lives-in-ocean', args: ['?x'], degVar: '?d3' },
    ],
    'is-marine-reptile',
    50
  ),
  cls(
    'aquatic-amphibian-rule',
    [
      { pred: 'is-amphibian', args: ['?x'], degVar: '?d1' },
      { pred: 'lives-in-water', args: ['?x'], degVar: '?d2' },
      { pred: 'has-gills', args: ['?x'], degVar: '?d3' },
    ],
    'is-aquatic-amphibian',
    50
  ),

  // =====================================================================
  // SPECIES RULES (priority 40) — the long tail
  // =====================================================================

  // --- Monotremes & oddities ---
  sp(
    'platypus-rule',
    [
      { pred: 'is-monotreme', args: ['?x'], degVar: '?d1' },
      { pred: 'has-bill', args: ['?x'], degVar: '?d2' },
      { pred: 'is-aquatic', args: ['?x'], degVar: '?d3' },
    ],
    'platypus'
  ),
  sp(
    'echidna-rule',
    [
      { pred: 'is-monotreme', args: ['?x'], degVar: '?d1' },
      { pred: 'has-spines', args: ['?x'], degVar: '?d2' },
    ],
    'echidna'
  ),

  // --- Marsupials ---
  sp(
    'wombat-rule',
    [
      { pred: 'is-marsupial', args: ['?x'], degVar: '?d1' },
      { pred: 'burrows', args: ['?x'], degVar: '?d2' },
    ],
    'wombat'
  ),
  sp(
    'opossum-rule',
    [
      { pred: 'is-marsupial', args: ['?x'], degVar: '?d1' },
      { pred: 'plays-dead', args: ['?x'], degVar: '?d2' },
    ],
    'opossum'
  ),
  sp(
    'tasmanian-devil-rule',
    [
      { pred: 'is-marsupial', args: ['?x'], degVar: '?d1' },
      { pred: 'is-carnivore', args: ['?x'], degVar: '?d2' },
      { pred: 'is-small', args: ['?x'], degVar: '?d3' },
    ],
    'tasmanian-devil'
  ),
  sp(
    'wallaby-rule',
    [
      { pred: 'is-marsupial', args: ['?x'], degVar: '?d1' },
      { pred: 'can-jump', args: ['?x'], degVar: '?d2' },
      { pred: 'is-small', args: ['?x'], degVar: '?d3' },
    ],
    'wallaby'
  ),
  sp(
    'sugar-glider-rule',
    [
      { pred: 'is-marsupial', args: ['?x'], degVar: '?d1' },
      { pred: 'glides', args: ['?x'], degVar: '?d2' },
    ],
    'sugar-glider'
  ),

  // --- Primates ---
  sp(
    'orangutan-rule',
    [
      { pred: 'is-primate', args: ['?x'], degVar: '?d1' },
      { pred: 'is-arboreal', args: ['?x'], degVar: '?d2' },
      { pred: 'is-large', args: ['?x'], degVar: '?d3' },
    ],
    'orangutan'
  ),
  sp(
    'lemur-rule',
    [
      { pred: 'is-primate', args: ['?x'], degVar: '?d1' },
      { pred: 'has-long-tail', args: ['?x'], degVar: '?d2' },
      { pred: 'is-nocturnal', args: ['?x'], degVar: '?d3' },
    ],
    'lemur'
  ),
  sp(
    'baboon-rule',
    [
      { pred: 'is-primate', args: ['?x'], degVar: '?d1' },
      { pred: 'has-snout', args: ['?x'], degVar: '?d2' },
    ],
    'baboon'
  ),
  sp(
    'gibbon-rule',
    [
      { pred: 'is-primate', args: ['?x'], degVar: '?d1' },
      { pred: 'swings-from-branches', args: ['?x'], degVar: '?d2' },
    ],
    'gibbon'
  ),
  sp(
    'mandrill-rule',
    [
      { pred: 'is-primate', args: ['?x'], degVar: '?d1' },
      { pred: 'has-bright-face', args: ['?x'], degVar: '?d2' },
    ],
    'mandrill'
  ),
  sp(
    'tarsier-rule',
    [
      { pred: 'is-primate', args: ['?x'], degVar: '?d1' },
      { pred: 'has-large-eyes', args: ['?x'], degVar: '?d2' },
      { pred: 'is-nocturnal', args: ['?x'], degVar: '?d3' },
    ],
    'tarsier'
  ),

  // --- Felines ---
  sp(
    'jaguar-rule',
    [
      { pred: 'is-feline', args: ['?x'], degVar: '?d1' },
      { pred: 'has-spots', args: ['?x'], degVar: '?d2' },
      { pred: 'is-aquatic', args: ['?x'], degVar: '?d3' },
    ],
    'jaguar'
  ),
  sp(
    'snow-leopard-rule',
    [
      { pred: 'is-feline', args: ['?x'], degVar: '?d1' },
      { pred: 'lives-in-mountains', args: ['?x'], degVar: '?d2' },
      { pred: 'has-thick-fur', args: ['?x'], degVar: '?d3' },
    ],
    'snow-leopard'
  ),
  sp(
    'lynx-rule',
    [
      { pred: 'is-feline', args: ['?x'], degVar: '?d1' },
      { pred: 'has-tufted-ears', args: ['?x'], degVar: '?d2' },
    ],
    'lynx'
  ),
  sp(
    'cougar-rule',
    [
      { pred: 'is-feline', args: ['?x'], degVar: '?d1' },
      { pred: 'lives-in-mountains', args: ['?x'], degVar: '?d2' },
      { pred: 'is-large', args: ['?x'], degVar: '?d3' },
    ],
    'cougar'
  ),
  sp(
    'serval-rule',
    [
      { pred: 'is-feline', args: ['?x'], degVar: '?d1' },
      { pred: 'has-long-legs', args: ['?x'], degVar: '?d2' },
      { pred: 'lives-in-savanna', args: ['?x'], degVar: '?d3' },
    ],
    'serval'
  ),
  sp(
    'ocelot-rule',
    [
      { pred: 'is-feline', args: ['?x'], degVar: '?d1' },
      { pred: 'has-spots', args: ['?x'], degVar: '?d2' },
      { pred: 'is-small', args: ['?x'], degVar: '?d3' },
    ],
    'ocelot'
  ),
  sp(
    'domestic-cat-rule',
    [
      { pred: 'is-feline', args: ['?x'], degVar: '?d1' },
      { pred: 'is-domestic', args: ['?x'], degVar: '?d2' },
    ],
    'domestic-cat'
  ),

  // --- Canines ---
  sp(
    'coyote-rule',
    [
      { pred: 'is-canine', args: ['?x'], degVar: '?d1' },
      { pred: 'lives-in-desert', args: ['?x'], degVar: '?d2' },
    ],
    'coyote'
  ),
  sp(
    'jackal-rule',
    [
      { pred: 'is-canine', args: ['?x'], degVar: '?d1' },
      { pred: 'is-scavenger', args: ['?x'], degVar: '?d2' },
    ],
    'jackal'
  ),
  sp(
    'domestic-dog-rule',
    [
      { pred: 'is-canine', args: ['?x'], degVar: '?d1' },
      { pred: 'is-domestic', args: ['?x'], degVar: '?d2' },
    ],
    'domestic-dog'
  ),
  sp(
    'african-wild-dog-rule',
    [
      { pred: 'is-canine', args: ['?x'], degVar: '?d1' },
      { pred: 'hunts-in-packs', args: ['?x'], degVar: '?d2' },
      { pred: 'lives-in-savanna', args: ['?x'], degVar: '?d3' },
    ],
    'african-wild-dog'
  ),
  sp(
    'arctic-fox-rule',
    [
      { pred: 'is-canine', args: ['?x'], degVar: '?d1' },
      { pred: 'lives-in-arctic', args: ['?x'], degVar: '?d2' },
      { pred: 'is-small', args: ['?x'], degVar: '?d3' },
    ],
    'arctic-fox'
  ),
  sp(
    'fennec-fox-rule',
    [
      { pred: 'is-canine', args: ['?x'], degVar: '?d1' },
      { pred: 'lives-in-desert', args: ['?x'], degVar: '?d2' },
      { pred: 'has-large-ears', args: ['?x'], degVar: '?d3' },
    ],
    'fennec-fox'
  ),

  // --- Bears (ursine) ---
  sp(
    'grizzly-bear-rule',
    [
      { pred: 'is-ursine', args: ['?x'], degVar: '?d1' },
      { pred: 'is-omnivore', args: ['?x'], degVar: '?d2' },
      { pred: 'lives-in-mountains', args: ['?x'], degVar: '?d3' },
    ],
    'grizzly-bear'
  ),
  sp(
    'panda-rule',
    [
      { pred: 'is-ursine', args: ['?x'], degVar: '?d1' },
      { pred: 'eats-bamboo', args: ['?x'], degVar: '?d2' },
      { pred: 'has-black-white-pattern', args: ['?x'], degVar: '?d3' },
    ],
    'panda'
  ),
  sp(
    'sun-bear-rule',
    [
      { pred: 'is-ursine', args: ['?x'], degVar: '?d1' },
      { pred: 'lives-in-tropics', args: ['?x'], degVar: '?d2' },
      { pred: 'is-small', args: ['?x'], degVar: '?d3' },
    ],
    'sun-bear'
  ),
  sp(
    'black-bear-rule',
    [
      { pred: 'is-ursine', args: ['?x'], degVar: '?d1' },
      { pred: 'climbs-trees', args: ['?x'], degVar: '?d2' },
      { pred: 'is-omnivore', args: ['?x'], degVar: '?d3' },
    ],
    'black-bear'
  ),
  sp(
    'spectacled-bear-rule',
    [
      { pred: 'is-ursine', args: ['?x'], degVar: '?d1' },
      { pred: 'lives-in-mountains', args: ['?x'], degVar: '?d2' },
      { pred: 'is-herbivore', args: ['?x'], degVar: '?d3' },
    ],
    'spectacled-bear'
  ),

  // --- Mustelids ---
  sp(
    'weasel-rule',
    [
      { pred: 'is-mustelid', args: ['?x'], degVar: '?d1' },
      { pred: 'is-small', args: ['?x'], degVar: '?d2' },
    ],
    'weasel'
  ),
  sp(
    'badger-rule',
    [
      { pred: 'is-mustelid', args: ['?x'], degVar: '?d1' },
      { pred: 'burrows', args: ['?x'], degVar: '?d2' },
    ],
    'badger'
  ),
  sp(
    'wolverine-rule',
    [
      { pred: 'is-mustelid', args: ['?x'], degVar: '?d1' },
      { pred: 'is-large', args: ['?x'], degVar: '?d2' },
      { pred: 'lives-in-tundra', args: ['?x'], degVar: '?d3' },
    ],
    'wolverine'
  ),
  sp(
    'ferret-rule',
    [
      { pred: 'is-mustelid', args: ['?x'], degVar: '?d1' },
      { pred: 'is-domestic', args: ['?x'], degVar: '?d2' },
    ],
    'ferret'
  ),
  sp(
    'mink-rule',
    [
      { pred: 'is-mustelid', args: ['?x'], degVar: '?d1' },
      { pred: 'is-aquatic', args: ['?x'], degVar: '?d2' },
    ],
    'mink'
  ),

  // --- Lagomorphs ---
  sp(
    'rabbit-rule',
    [
      { pred: 'is-lagomorph', args: ['?x'], degVar: '?d1' },
      { pred: 'is-small', args: ['?x'], degVar: '?d2' },
    ],
    'rabbit'
  ),
  sp(
    'hare-rule',
    [
      { pred: 'is-lagomorph', args: ['?x'], degVar: '?d1' },
      { pred: 'is-fast', args: ['?x'], degVar: '?d2' },
    ],
    'hare'
  ),
  sp(
    'pika-rule',
    [
      { pred: 'is-lagomorph', args: ['?x'], degVar: '?d1' },
      { pred: 'lives-in-mountains', args: ['?x'], degVar: '?d2' },
    ],
    'pika'
  ),

  // --- Cetaceans ---
  sp(
    'narwhal-rule',
    [
      { pred: 'is-cetacean', args: ['?x'], degVar: '?d1' },
      { pred: 'has-tusk', args: ['?x'], degVar: '?d2' },
      { pred: 'lives-in-arctic', args: ['?x'], degVar: '?d3' },
    ],
    'narwhal'
  ),
  sp(
    'beluga-rule',
    [
      { pred: 'is-cetacean', args: ['?x'], degVar: '?d1' },
      { pred: 'lives-in-arctic', args: ['?x'], degVar: '?d2' },
      { pred: 'is-white', args: ['?x'], degVar: '?d3' },
    ],
    'beluga'
  ),
  sp(
    'humpback-whale-rule',
    [
      { pred: 'is-cetacean', args: ['?x'], degVar: '?d1' },
      { pred: 'is-large', args: ['?x'], degVar: '?d2' },
      { pred: 'sings', args: ['?x'], degVar: '?d3' },
    ],
    'humpback-whale'
  ),
  sp(
    'blue-whale-rule',
    [
      { pred: 'is-cetacean', args: ['?x'], degVar: '?d1' },
      { pred: 'is-large', args: ['?x'], degVar: '?d2' },
      { pred: 'filter-feeds', args: ['?x'], degVar: '?d3' },
    ],
    'blue-whale'
  ),
  sp(
    'sperm-whale-rule',
    [
      { pred: 'is-cetacean', args: ['?x'], degVar: '?d1' },
      { pred: 'is-large', args: ['?x'], degVar: '?d2' },
      { pred: 'echolocates', args: ['?x'], degVar: '?d3' },
    ],
    'sperm-whale'
  ),
  sp(
    'porpoise-rule',
    [
      { pred: 'is-cetacean', args: ['?x'], degVar: '?d1' },
      { pred: 'is-small', args: ['?x'], degVar: '?d2' },
    ],
    'porpoise'
  ),
  sp(
    'bottlenose-dolphin-rule',
    [
      { pred: 'is-cetacean', args: ['?x'], degVar: '?d1' },
      { pred: 'is-playful', args: ['?x'], degVar: '?d2' },
      { pred: 'echolocates', args: ['?x'], degVar: '?d3' },
    ],
    'bottlenose-dolphin'
  ),

  // --- Pinnipeds ---
  sp(
    'walrus-rule',
    [
      { pred: 'is-pinniped', args: ['?x'], degVar: '?d1' },
      { pred: 'has-tusks', args: ['?x'], degVar: '?d2' },
      { pred: 'is-large', args: ['?x'], degVar: '?d3' },
    ],
    'walrus'
  ),
  sp(
    'elephant-seal-rule',
    [
      { pred: 'is-pinniped', args: ['?x'], degVar: '?d1' },
      { pred: 'is-large', args: ['?x'], degVar: '?d2' },
      { pred: 'has-large-nose', args: ['?x'], degVar: '?d3' },
    ],
    'elephant-seal'
  ),
  sp(
    'fur-seal-rule',
    [
      { pred: 'is-pinniped', args: ['?x'], degVar: '?d1' },
      { pred: 'has-thick-fur', args: ['?x'], degVar: '?d2' },
    ],
    'fur-seal'
  ),

  // --- Ungulates (bovines, equines) ---
  sp(
    'cow-rule',
    [
      { pred: 'is-bovine', args: ['?x'], degVar: '?d1' },
      { pred: 'is-domestic', args: ['?x'], degVar: '?d2' },
    ],
    'cow'
  ),
  sp(
    'buffalo-rule',
    [
      { pred: 'is-bovine', args: ['?x'], degVar: '?d1' },
      { pred: 'is-large', args: ['?x'], degVar: '?d2' },
      { pred: 'lives-in-savanna', args: ['?x'], degVar: '?d3' },
    ],
    'buffalo'
  ),
  sp(
    'bison-rule',
    [
      { pred: 'is-bovine', args: ['?x'], degVar: '?d1' },
      { pred: 'is-large', args: ['?x'], degVar: '?d2' },
      { pred: 'lives-in-grassland', args: ['?x'], degVar: '?d3' },
    ],
    'bison'
  ),
  sp(
    'goat-rule',
    [
      { pred: 'is-bovine', args: ['?x'], degVar: '?d1' },
      { pred: 'lives-in-mountains', args: ['?x'], degVar: '?d2' },
      { pred: 'is-small', args: ['?x'], degVar: '?d3' },
    ],
    'mountain-goat'
  ),
  sp(
    'sheep-rule',
    [
      { pred: 'is-bovine', args: ['?x'], degVar: '?d1' },
      { pred: 'has-wool', args: ['?x'], degVar: '?d2' },
    ],
    'sheep'
  ),
  sp(
    'yak-rule',
    [
      { pred: 'is-bovine', args: ['?x'], degVar: '?d1' },
      { pred: 'lives-in-mountains', args: ['?x'], degVar: '?d2' },
      { pred: 'has-thick-fur', args: ['?x'], degVar: '?d3' },
    ],
    'yak'
  ),
  sp(
    'okapi-rule',
    [
      { pred: 'is-ungulate', args: ['?x'], degVar: '?d1' },
      { pred: 'has-stripes', args: ['?x'], degVar: '?d2' },
      { pred: 'lives-in-jungle', args: ['?x'], degVar: '?d3' },
    ],
    'okapi'
  ),
  sp(
    'donkey-rule',
    [
      { pred: 'is-equine', args: ['?x'], degVar: '?d1' },
      { pred: 'has-long-ears', args: ['?x'], degVar: '?d2' },
    ],
    'donkey'
  ),
  sp(
    'mule-rule',
    [
      { pred: 'is-equine', args: ['?x'], degVar: '?d1' },
      { pred: 'is-sterile', args: ['?x'], degVar: '?d2' },
    ],
    'mule'
  ),
  sp(
    'antelope-rule',
    [
      { pred: 'is-ungulate', args: ['?x'], degVar: '?d1' },
      { pred: 'is-fast', args: ['?x'], degVar: '?d2' },
      { pred: 'lives-in-savanna', args: ['?x'], degVar: '?d3' },
    ],
    'antelope'
  ),
  sp(
    'gazelle-rule',
    [
      { pred: 'is-ungulate', args: ['?x'], degVar: '?d1' },
      { pred: 'is-fast', args: ['?x'], degVar: '?d2' },
      { pred: 'is-small', args: ['?x'], degVar: '?d3' },
    ],
    'gazelle'
  ),
  sp(
    'wildebeest-rule',
    [
      { pred: 'is-ungulate', args: ['?x'], degVar: '?d1' },
      { pred: 'migrates', args: ['?x'], degVar: '?d2' },
      { pred: 'lives-in-savanna', args: ['?x'], degVar: '?d3' },
    ],
    'wildebeest'
  ),
  sp(
    'llama-rule',
    [
      { pred: 'is-ungulate', args: ['?x'], degVar: '?d1' },
      { pred: 'lives-in-mountains', args: ['?x'], degVar: '?d2' },
      { pred: 'is-domestic', args: ['?x'], degVar: '?d3' },
    ],
    'llama'
  ),
  sp(
    'alpaca-rule',
    [
      { pred: 'is-ungulate', args: ['?x'], degVar: '?d1' },
      { pred: 'has-wool', args: ['?x'], degVar: '?d2' },
      { pred: 'lives-in-mountains', args: ['?x'], degVar: '?d3' },
    ],
    'alpaca'
  ),

  // --- Pachyderms ---
  sp(
    'african-elephant-rule',
    [
      { pred: 'is-pachyderm', args: ['?x'], degVar: '?d1' },
      { pred: 'has-trunk', args: ['?x'], degVar: '?d2' },
      { pred: 'has-large-ears', args: ['?x'], degVar: '?d3' },
    ],
    'african-elephant'
  ),
  sp(
    'asian-elephant-rule',
    [
      { pred: 'is-pachyderm', args: ['?x'], degVar: '?d1' },
      { pred: 'has-trunk', args: ['?x'], degVar: '?d2' },
      { pred: 'has-small-ears', args: ['?x'], degVar: '?d3' },
    ],
    'asian-elephant'
  ),
  sp(
    'white-rhino-rule',
    [
      { pred: 'is-pachyderm', args: ['?x'], degVar: '?d1' },
      { pred: 'has-horn', args: ['?x'], degVar: '?d2' },
      { pred: 'has-wide-mouth', args: ['?x'], degVar: '?d3' },
    ],
    'white-rhinoceros'
  ),
  sp(
    'black-rhino-rule',
    [
      { pred: 'is-pachyderm', args: ['?x'], degVar: '?d1' },
      { pred: 'has-horn', args: ['?x'], degVar: '?d2' },
      { pred: 'has-pointed-lip', args: ['?x'], degVar: '?d3' },
    ],
    'black-rhinoceros'
  ),

  // --- Burrowing mammals ---
  sp(
    'mole-rule',
    [
      { pred: 'is-burrowing-mammal', args: ['?x'], degVar: '?d1' },
      { pred: 'is-small', args: ['?x'], degVar: '?d2' },
      { pred: 'has-poor-eyesight', args: ['?x'], degVar: '?d3' },
    ],
    'mole'
  ),
  sp(
    'prairie-dog-rule',
    [
      { pred: 'is-burrowing-mammal', args: ['?x'], degVar: '?d1' },
      { pred: 'lives-in-colony', args: ['?x'], degVar: '?d2' },
    ],
    'prairie-dog'
  ),
  sp(
    'groundhog-rule',
    [
      { pred: 'is-burrowing-mammal', args: ['?x'], degVar: '?d1' },
      { pred: 'hibernates', args: ['?x'], degVar: '?d2' },
    ],
    'groundhog'
  ),
  sp(
    'gopher-rule',
    [
      { pred: 'is-burrowing-mammal', args: ['?x'], degVar: '?d1' },
      { pred: 'has-cheek-pouches', args: ['?x'], degVar: '?d2' },
    ],
    'gopher'
  ),

  // --- Rodents ---
  sp(
    'capybara-rule',
    [
      { pred: 'is-rodent', args: ['?x'], degVar: '?d1' },
      { pred: 'is-aquatic', args: ['?x'], degVar: '?d2' },
      { pred: 'is-large', args: ['?x'], degVar: '?d3' },
    ],
    'capybara'
  ),
  sp(
    'hamster-rule',
    [
      { pred: 'is-rodent', args: ['?x'], degVar: '?d1' },
      { pred: 'has-cheek-pouches', args: ['?x'], degVar: '?d2' },
      { pred: 'is-small', args: ['?x'], degVar: '?d3' },
    ],
    'hamster'
  ),
  sp(
    'mouse-rule',
    [
      { pred: 'is-rodent', args: ['?x'], degVar: '?d1' },
      { pred: 'is-small', args: ['?x'], degVar: '?d2' },
      { pred: 'is-nocturnal', args: ['?x'], degVar: '?d3' },
    ],
    'mouse'
  ),
  sp(
    'rat-rule',
    [
      { pred: 'is-rodent', args: ['?x'], degVar: '?d1' },
      { pred: 'has-long-tail', args: ['?x'], degVar: '?d2' },
    ],
    'rat'
  ),
  sp(
    'chinchilla-rule',
    [
      { pred: 'is-rodent', args: ['?x'], degVar: '?d1' },
      { pred: 'has-soft-fur', args: ['?x'], degVar: '?d2' },
    ],
    'chinchilla'
  ),
  sp(
    'guinea-pig-rule',
    [
      { pred: 'is-rodent', args: ['?x'], degVar: '?d1' },
      { pred: 'is-domestic', args: ['?x'], degVar: '?d2' },
      { pred: 'is-small', args: ['?x'], degVar: '?d3' },
    ],
    'guinea-pig'
  ),
  sp(
    'flying-squirrel-rule',
    [
      { pred: 'is-rodent', args: ['?x'], degVar: '?d1' },
      { pred: 'glides', args: ['?x'], degVar: '?d2' },
    ],
    'flying-squirrel'
  ),

  // --- Misc. mammals ---
  sp(
    'manatee-rule',
    [
      { pred: 'is-mammal', args: ['?x'], degVar: '?d1' },
      { pred: 'is-aquatic', args: ['?x'], degVar: '?d2' },
      { pred: 'is-herbivore', args: ['?x'], degVar: '?d3' },
      { pred: 'is-large', args: ['?x'], degVar: '?d4' },
    ],
    'manatee'
  ),
  sp(
    'hyena-rule',
    [
      { pred: 'is-mammal', args: ['?x'], degVar: '?d1' },
      { pred: 'is-scavenger', args: ['?x'], degVar: '?d2' },
      { pred: 'hunts-in-packs', args: ['?x'], degVar: '?d3' },
    ],
    'hyena'
  ),
  sp(
    'meerkat-rule',
    [
      { pred: 'is-mammal', args: ['?x'], degVar: '?d1' },
      { pred: 'lives-in-desert', args: ['?x'], degVar: '?d2' },
      { pred: 'lives-in-colony', args: ['?x'], degVar: '?d3' },
    ],
    'meerkat'
  ),
  sp(
    'aardvark-rule',
    [
      { pred: 'is-mammal', args: ['?x'], degVar: '?d1' },
      { pred: 'eats-insects', args: ['?x'], degVar: '?d2' },
      { pred: 'has-long-snout', args: ['?x'], degVar: '?d3' },
    ],
    'aardvark'
  ),
  sp(
    'anteater-rule',
    [
      { pred: 'is-mammal', args: ['?x'], degVar: '?d1' },
      { pred: 'eats-insects', args: ['?x'], degVar: '?d2' },
      { pred: 'has-long-tongue', args: ['?x'], degVar: '?d3' },
    ],
    'anteater'
  ),
  sp(
    'tapir-rule',
    [
      { pred: 'is-ungulate', args: ['?x'], degVar: '?d1' },
      { pred: 'has-short-trunk', args: ['?x'], degVar: '?d2' },
      { pred: 'lives-in-jungle', args: ['?x'], degVar: '?d3' },
    ],
    'tapir'
  ),
  sp(
    'red-panda-rule',
    [
      { pred: 'is-mammal', args: ['?x'], degVar: '?d1' },
      { pred: 'is-arboreal', args: ['?x'], degVar: '?d2' },
      { pred: 'has-red-fur', args: ['?x'], degVar: '?d3' },
    ],
    'red-panda'
  ),
  sp(
    'mongoose-rule',
    [
      { pred: 'is-mammal', args: ['?x'], degVar: '?d1' },
      { pred: 'is-carnivore', args: ['?x'], degVar: '?d2' },
      { pred: 'is-small', args: ['?x'], degVar: '?d3' },
      { pred: 'is-fast', args: ['?x'], degVar: '?d4' },
    ],
    'mongoose'
  ),
  sp(
    'skunk-rule',
    [
      { pred: 'is-mammal', args: ['?x'], degVar: '?d1' },
      { pred: 'sprays-scent', args: ['?x'], degVar: '?d2' },
    ],
    'skunk'
  ),

  // --- Bats ---
  sp(
    'fruit-bat-rule',
    [
      { pred: 'is-mammal', args: ['?x'], degVar: '?d1' },
      { pred: 'can-fly', args: ['?x'], degVar: '?d2' },
      { pred: 'eats-fruit', args: ['?x'], degVar: '?d3' },
    ],
    'fruit-bat'
  ),
  sp(
    'vampire-bat-rule',
    [
      { pred: 'is-mammal', args: ['?x'], degVar: '?d1' },
      { pred: 'can-fly', args: ['?x'], degVar: '?d2' },
      { pred: 'drinks-blood', args: ['?x'], degVar: '?d3' },
    ],
    'vampire-bat'
  ),

  // --- Birds: raptors ---
  sp(
    'bald-eagle-rule',
    [
      { pred: 'is-raptor', args: ['?x'], degVar: '?d1' },
      { pred: 'has-white-head', args: ['?x'], degVar: '?d2' },
    ],
    'bald-eagle'
  ),
  sp(
    'golden-eagle-rule',
    [
      { pred: 'is-raptor', args: ['?x'], degVar: '?d1' },
      { pred: 'lives-in-mountains', args: ['?x'], degVar: '?d2' },
      { pred: 'is-large', args: ['?x'], degVar: '?d3' },
    ],
    'golden-eagle'
  ),
  sp(
    'osprey-rule',
    [
      { pred: 'is-raptor', args: ['?x'], degVar: '?d1' },
      { pred: 'is-aquatic', args: ['?x'], degVar: '?d2' },
    ],
    'osprey'
  ),
  sp(
    'vulture-rule',
    [
      { pred: 'is-raptor', args: ['?x'], degVar: '?d1' },
      { pred: 'is-scavenger', args: ['?x'], degVar: '?d2' },
    ],
    'vulture'
  ),
  sp(
    'condor-rule',
    [
      { pred: 'is-raptor', args: ['?x'], degVar: '?d1' },
      { pred: 'is-scavenger', args: ['?x'], degVar: '?d2' },
      { pred: 'is-large', args: ['?x'], degVar: '?d3' },
    ],
    'condor'
  ),
  sp(
    'kestrel-rule',
    [
      { pred: 'is-raptor', args: ['?x'], degVar: '?d1' },
      { pred: 'hovers', args: ['?x'], degVar: '?d2' },
    ],
    'kestrel'
  ),
  sp(
    'harpy-eagle-rule',
    [
      { pred: 'is-raptor', args: ['?x'], degVar: '?d1' },
      { pred: 'lives-in-jungle', args: ['?x'], degVar: '?d2' },
      { pred: 'is-large', args: ['?x'], degVar: '?d3' },
    ],
    'harpy-eagle'
  ),

  // --- Birds: flightless ---
  sp(
    'emu-rule',
    [
      { pred: 'is-flightless-bird', args: ['?x'], degVar: '?d1' },
      { pred: 'lives-in-grassland', args: ['?x'], degVar: '?d2' },
    ],
    'emu'
  ),
  sp(
    'cassowary-rule',
    [
      { pred: 'is-flightless-bird', args: ['?x'], degVar: '?d1' },
      { pred: 'has-casque', args: ['?x'], degVar: '?d2' },
      { pred: 'lives-in-jungle', args: ['?x'], degVar: '?d3' },
    ],
    'cassowary'
  ),
  sp(
    'kiwi-rule',
    [
      { pred: 'is-flightless-bird', args: ['?x'], degVar: '?d1' },
      { pred: 'is-small', args: ['?x'], degVar: '?d2' },
      { pred: 'is-nocturnal', args: ['?x'], degVar: '?d3' },
    ],
    'kiwi'
  ),
  sp(
    'rhea-rule',
    [
      { pred: 'is-flightless-bird', args: ['?x'], degVar: '?d1' },
      { pred: 'lives-in-grassland', args: ['?x'], degVar: '?d2' },
      { pred: 'is-small', args: ['?x'], degVar: '?d3' },
    ],
    'rhea'
  ),

  // --- Birds: waterfowl ---
  sp(
    'swan-rule',
    [
      { pred: 'is-waterfowl', args: ['?x'], degVar: '?d1' },
      { pred: 'has-long-neck', args: ['?x'], degVar: '?d2' },
      { pred: 'is-white', args: ['?x'], degVar: '?d3' },
    ],
    'swan'
  ),
  sp(
    'goose-rule',
    [
      { pred: 'is-waterfowl', args: ['?x'], degVar: '?d1' },
      { pred: 'migrates', args: ['?x'], degVar: '?d2' },
    ],
    'goose'
  ),
  sp(
    'heron-rule',
    [
      { pred: 'is-wading-bird', args: ['?x'], degVar: '?d1' },
      { pred: 'has-long-neck', args: ['?x'], degVar: '?d2' },
    ],
    'heron'
  ),
  sp(
    'crane-rule',
    [
      { pred: 'is-wading-bird', args: ['?x'], degVar: '?d1' },
      { pred: 'migrates', args: ['?x'], degVar: '?d2' },
    ],
    'crane'
  ),
  sp(
    'stork-rule',
    [
      { pred: 'is-wading-bird', args: ['?x'], degVar: '?d1' },
      { pred: 'has-large-beak', args: ['?x'], degVar: '?d2' },
    ],
    'stork'
  ),
  sp(
    'ibis-rule',
    [
      { pred: 'is-wading-bird', args: ['?x'], degVar: '?d1' },
      { pred: 'has-curved-beak', args: ['?x'], degVar: '?d2' },
    ],
    'ibis'
  ),
  sp(
    'spoonbill-rule',
    [
      { pred: 'is-wading-bird', args: ['?x'], degVar: '?d1' },
      { pred: 'has-flat-beak', args: ['?x'], degVar: '?d2' },
    ],
    'spoonbill'
  ),
  sp(
    'albatross-rule',
    [
      { pred: 'is-seabird', args: ['?x'], degVar: '?d1' },
      { pred: 'is-large', args: ['?x'], degVar: '?d2' },
      { pred: 'has-long-wingspan', args: ['?x'], degVar: '?d3' },
    ],
    'albatross'
  ),
  sp(
    'puffin-rule',
    [
      { pred: 'is-seabird', args: ['?x'], degVar: '?d1' },
      { pred: 'has-bright-colors', args: ['?x'], degVar: '?d2' },
      { pred: 'is-small', args: ['?x'], degVar: '?d3' },
    ],
    'puffin'
  ),
  sp(
    'seagull-rule',
    [
      { pred: 'is-seabird', args: ['?x'], degVar: '?d1' },
      { pred: 'is-scavenger', args: ['?x'], degVar: '?d2' },
    ],
    'seagull'
  ),

  // --- Birds: tropical ---
  sp(
    'toucan-rule',
    [
      { pred: 'is-tropical-bird', args: ['?x'], degVar: '?d1' },
      { pred: 'has-large-beak', args: ['?x'], degVar: '?d2' },
    ],
    'toucan'
  ),
  sp(
    'macaw-rule',
    [
      { pred: 'is-tropical-bird', args: ['?x'], degVar: '?d1' },
      { pred: 'can-talk', args: ['?x'], degVar: '?d2' },
      { pred: 'is-large', args: ['?x'], degVar: '?d3' },
    ],
    'macaw'
  ),
  sp(
    'cockatoo-rule',
    [
      { pred: 'is-tropical-bird', args: ['?x'], degVar: '?d1' },
      { pred: 'has-crest', args: ['?x'], degVar: '?d2' },
    ],
    'cockatoo'
  ),
  sp(
    'bird-of-paradise-rule',
    [
      { pred: 'is-tropical-bird', args: ['?x'], degVar: '?d1' },
      { pred: 'has-elaborate-plumage', args: ['?x'], degVar: '?d2' },
    ],
    'bird-of-paradise'
  ),
  sp(
    'kingfisher-rule',
    [
      { pred: 'is-bird', args: ['?x'], degVar: '?d1' },
      { pred: 'is-aquatic', args: ['?x'], degVar: '?d2' },
      { pred: 'has-bright-colors', args: ['?x'], degVar: '?d3' },
      { pred: 'is-small', args: ['?x'], degVar: '?d4' },
    ],
    'kingfisher'
  ),

  // --- Birds: songbirds ---
  sp(
    'robin-rule',
    [
      { pred: 'is-songbird', args: ['?x'], degVar: '?d1' },
      { pred: 'has-red-breast', args: ['?x'], degVar: '?d2' },
    ],
    'robin'
  ),
  sp(
    'canary-rule',
    [
      { pred: 'is-songbird', args: ['?x'], degVar: '?d1' },
      { pred: 'is-yellow', args: ['?x'], degVar: '?d2' },
    ],
    'canary'
  ),
  sp(
    'nightingale-rule',
    [
      { pred: 'is-songbird', args: ['?x'], degVar: '?d1' },
      { pred: 'is-nocturnal', args: ['?x'], degVar: '?d2' },
    ],
    'nightingale'
  ),
  sp(
    'sparrow-rule',
    [
      { pred: 'is-songbird', args: ['?x'], degVar: '?d1' },
      { pred: 'lives-near-humans', args: ['?x'], degVar: '?d2' },
    ],
    'sparrow'
  ),
  sp(
    'finch-rule',
    [
      { pred: 'is-songbird', args: ['?x'], degVar: '?d1' },
      { pred: 'has-thick-beak', args: ['?x'], degVar: '?d2' },
    ],
    'finch'
  ),

  // --- Birds: miscellaneous ---
  sp(
    'peacock-rule',
    [
      { pred: 'is-bird', args: ['?x'], degVar: '?d1' },
      { pred: 'has-elaborate-plumage', args: ['?x'], degVar: '?d2' },
      { pred: 'is-large', args: ['?x'], degVar: '?d3' },
    ],
    'peacock'
  ),
  sp(
    'pigeon-rule',
    [
      { pred: 'is-bird', args: ['?x'], degVar: '?d1' },
      { pred: 'lives-near-humans', args: ['?x'], degVar: '?d2' },
      { pred: 'is-small', args: ['?x'], degVar: '?d3' },
    ],
    'pigeon'
  ),
  sp(
    'roadrunner-rule',
    [
      { pred: 'is-bird', args: ['?x'], degVar: '?d1' },
      { pred: 'is-fast', args: ['?x'], degVar: '?d2' },
      { pred: 'lives-in-desert', args: ['?x'], degVar: '?d3' },
    ],
    'roadrunner'
  ),

  // --- Snakes ---
  sp(
    'cobra-rule',
    [
      { pred: 'is-venomous-snake', args: ['?x'], degVar: '?d1' },
      { pred: 'has-hood', args: ['?x'], degVar: '?d2' },
    ],
    'cobra'
  ),
  sp(
    'rattlesnake-rule',
    [
      { pred: 'is-venomous-snake', args: ['?x'], degVar: '?d1' },
      { pred: 'has-rattle', args: ['?x'], degVar: '?d2' },
    ],
    'rattlesnake'
  ),
  sp(
    'mamba-rule',
    [
      { pred: 'is-venomous-snake', args: ['?x'], degVar: '?d1' },
      { pred: 'is-fast', args: ['?x'], degVar: '?d2' },
      { pred: 'lives-in-savanna', args: ['?x'], degVar: '?d3' },
    ],
    'mamba'
  ),
  sp(
    'viper-rule',
    [
      { pred: 'is-venomous-snake', args: ['?x'], degVar: '?d1' },
      { pred: 'has-triangular-head', args: ['?x'], degVar: '?d2' },
    ],
    'viper'
  ),
  sp(
    'python-rule',
    [
      { pred: 'is-constrictor', args: ['?x'], degVar: '?d1' },
      { pred: 'is-large', args: ['?x'], degVar: '?d2' },
      { pred: 'lives-in-tropics', args: ['?x'], degVar: '?d3' },
    ],
    'python'
  ),
  sp(
    'boa-rule',
    [
      { pred: 'is-constrictor', args: ['?x'], degVar: '?d1' },
      { pred: 'is-large', args: ['?x'], degVar: '?d2' },
      { pred: 'lives-in-jungle', args: ['?x'], degVar: '?d3' },
    ],
    'boa-constrictor'
  ),
  sp(
    'anaconda-rule',
    [
      { pred: 'is-constrictor', args: ['?x'], degVar: '?d1' },
      { pred: 'is-aquatic', args: ['?x'], degVar: '?d2' },
      { pred: 'is-large', args: ['?x'], degVar: '?d3' },
    ],
    'anaconda'
  ),
  sp(
    'coral-snake-rule',
    [
      { pred: 'is-venomous-snake', args: ['?x'], degVar: '?d1' },
      { pred: 'has-bright-colors', args: ['?x'], degVar: '?d2' },
      { pred: 'is-small', args: ['?x'], degVar: '?d3' },
    ],
    'coral-snake'
  ),
  sp(
    'king-snake-rule',
    [
      { pred: 'is-reptile', args: ['?x'], degVar: '?d1' },
      { pred: 'has-no-legs', args: ['?x'], degVar: '?d2' },
      { pred: 'eats-snakes', args: ['?x'], degVar: '?d3' },
    ],
    'king-snake'
  ),
  sp(
    'sea-snake-rule',
    [
      { pred: 'is-marine-reptile', args: ['?x'], degVar: '?d1' },
      { pred: 'has-no-legs', args: ['?x'], degVar: '?d2' },
      { pred: 'is-venomous', args: ['?x'], degVar: '?d3' },
    ],
    'sea-snake'
  ),

  // --- Lizards ---
  sp(
    'komodo-dragon-rule',
    [
      { pred: 'is-reptile', args: ['?x'], degVar: '?d1' },
      { pred: 'has-legs', args: ['?x'], degVar: '?d2' },
      { pred: 'is-large', args: ['?x'], degVar: '?d3' },
      { pred: 'is-carnivore', args: ['?x'], degVar: '?d4' },
    ],
    'komodo-dragon'
  ),
  sp(
    'monitor-lizard-rule',
    [
      { pred: 'is-reptile', args: ['?x'], degVar: '?d1' },
      { pred: 'has-legs', args: ['?x'], degVar: '?d2' },
      { pred: 'is-large', args: ['?x'], degVar: '?d3' },
      { pred: 'has-forked-tongue', args: ['?x'], degVar: '?d4' },
    ],
    'monitor-lizard'
  ),
  sp(
    'bearded-dragon-rule',
    [
      { pred: 'is-reptile', args: ['?x'], degVar: '?d1' },
      { pred: 'has-legs', args: ['?x'], degVar: '?d2' },
      { pred: 'has-beard', args: ['?x'], degVar: '?d3' },
    ],
    'bearded-dragon'
  ),
  sp(
    'skink-rule',
    [
      { pred: 'is-reptile', args: ['?x'], degVar: '?d1' },
      { pred: 'has-legs', args: ['?x'], degVar: '?d2' },
      { pred: 'has-smooth-scales', args: ['?x'], degVar: '?d3' },
    ],
    'skink'
  ),
  sp(
    'horned-lizard-rule',
    [
      { pred: 'is-reptile', args: ['?x'], degVar: '?d1' },
      { pred: 'has-horns', args: ['?x'], degVar: '?d2' },
      { pred: 'lives-in-desert', args: ['?x'], degVar: '?d3' },
    ],
    'horned-lizard'
  ),

  // --- Turtles ---
  sp(
    'leatherback-turtle-rule',
    [
      { pred: 'is-turtle', args: ['?x'], degVar: '?d1' },
      { pred: 'is-aquatic', args: ['?x'], degVar: '?d2' },
      { pred: 'is-large', args: ['?x'], degVar: '?d3' },
    ],
    'leatherback-turtle'
  ),
  sp(
    'box-turtle-rule',
    [
      { pred: 'is-turtle', args: ['?x'], degVar: '?d1' },
      { pred: 'lives-on-land', args: ['?x'], degVar: '?d2' },
      { pred: 'is-small', args: ['?x'], degVar: '?d3' },
    ],
    'box-turtle'
  ),
  sp(
    'snapping-turtle-rule',
    [
      { pred: 'is-turtle', args: ['?x'], degVar: '?d1' },
      { pred: 'is-carnivore', args: ['?x'], degVar: '?d2' },
    ],
    'snapping-turtle'
  ),

  // --- Crocodilians ---
  sp(
    'gharial-rule',
    [
      { pred: 'is-reptile', args: ['?x'], degVar: '?d1' },
      { pred: 'is-aquatic', args: ['?x'], degVar: '?d2' },
      { pred: 'has-narrow-snout', args: ['?x'], degVar: '?d3' },
    ],
    'gharial'
  ),
  sp(
    'caiman-rule',
    [
      { pred: 'is-reptile', args: ['?x'], degVar: '?d1' },
      { pred: 'is-aquatic', args: ['?x'], degVar: '?d2' },
      { pred: 'lives-in-jungle', args: ['?x'], degVar: '?d3' },
      { pred: 'is-small', args: ['?x'], degVar: '?d4' },
    ],
    'caiman'
  ),

  // --- Amphibians ---
  sp(
    'axolotl-rule',
    [
      { pred: 'is-aquatic-amphibian', args: ['?x'], degVar: '?d1' },
      { pred: 'has-external-gills', args: ['?x'], degVar: '?d2' },
    ],
    'axolotl'
  ),
  sp(
    'newt-rule',
    [
      { pred: 'is-amphibian', args: ['?x'], degVar: '?d1' },
      { pred: 'has-tail', args: ['?x'], degVar: '?d2' },
      { pred: 'is-aquatic', args: ['?x'], degVar: '?d3' },
    ],
    'newt'
  ),
  sp(
    'tree-frog-rule',
    [
      { pred: 'is-amphibian', args: ['?x'], degVar: '?d1' },
      { pred: 'can-jump', args: ['?x'], degVar: '?d2' },
      { pred: 'climbs-trees', args: ['?x'], degVar: '?d3' },
    ],
    'tree-frog'
  ),
  sp(
    'poison-dart-frog-rule',
    [
      { pred: 'is-amphibian', args: ['?x'], degVar: '?d1' },
      { pred: 'has-bright-colors', args: ['?x'], degVar: '?d2' },
      { pred: 'is-venomous', args: ['?x'], degVar: '?d3' },
    ],
    'poison-dart-frog'
  ),
  sp(
    'bullfrog-rule',
    [
      { pred: 'is-amphibian', args: ['?x'], degVar: '?d1' },
      { pred: 'can-jump', args: ['?x'], degVar: '?d2' },
      { pred: 'is-large', args: ['?x'], degVar: '?d3' },
    ],
    'bullfrog'
  ),
  sp(
    'caecilian-rule',
    [
      { pred: 'is-amphibian', args: ['?x'], degVar: '?d1' },
      { pred: 'has-no-legs', args: ['?x'], degVar: '?d2' },
    ],
    'caecilian'
  ),

  // --- Fish: sharks ---
  sp(
    'great-white-shark-rule',
    [
      { pred: 'is-shark', args: ['?x'], degVar: '?d1' },
      { pred: 'is-large', args: ['?x'], degVar: '?d2' },
    ],
    'great-white-shark'
  ),
  sp(
    'hammerhead-shark-rule',
    [
      { pred: 'is-shark', args: ['?x'], degVar: '?d1' },
      { pred: 'has-flat-head', args: ['?x'], degVar: '?d2' },
    ],
    'hammerhead-shark'
  ),
  sp(
    'whale-shark-rule',
    [
      { pred: 'is-shark', args: ['?x'], degVar: '?d1' },
      { pred: 'filter-feeds', args: ['?x'], degVar: '?d2' },
      { pred: 'is-large', args: ['?x'], degVar: '?d3' },
    ],
    'whale-shark'
  ),
  sp(
    'tiger-shark-rule',
    [
      { pred: 'is-shark', args: ['?x'], degVar: '?d1' },
      { pred: 'has-stripes', args: ['?x'], degVar: '?d2' },
    ],
    'tiger-shark'
  ),
  sp(
    'mako-shark-rule',
    [
      { pred: 'is-shark', args: ['?x'], degVar: '?d1' },
      { pred: 'is-fast', args: ['?x'], degVar: '?d2' },
    ],
    'mako-shark'
  ),
  sp(
    'nurse-shark-rule',
    [
      { pred: 'is-shark', args: ['?x'], degVar: '?d1' },
      { pred: 'is-docile', args: ['?x'], degVar: '?d2' },
    ],
    'nurse-shark'
  ),

  // --- Fish: rays ---
  sp(
    'manta-ray-rule',
    [
      { pred: 'is-ray', args: ['?x'], degVar: '?d1' },
      { pred: 'is-large', args: ['?x'], degVar: '?d2' },
    ],
    'manta-ray'
  ),
  sp(
    'stingray-rule',
    [
      { pred: 'is-ray', args: ['?x'], degVar: '?d1' },
      { pred: 'has-stinger', args: ['?x'], degVar: '?d2' },
    ],
    'stingray'
  ),
  sp(
    'electric-ray-rule',
    [
      { pred: 'is-ray', args: ['?x'], degVar: '?d1' },
      { pred: 'produces-electricity', args: ['?x'], degVar: '?d2' },
    ],
    'electric-ray'
  ),

  // --- Fish: reef & freshwater ---
  sp(
    'clownfish-rule',
    [
      { pred: 'is-reef-fish', args: ['?x'], degVar: '?d1' },
      { pred: 'lives-symbiotically', args: ['?x'], degVar: '?d2' },
    ],
    'clownfish'
  ),
  sp(
    'angelfish-rule',
    [
      { pred: 'is-reef-fish', args: ['?x'], degVar: '?d1' },
      { pred: 'has-bright-colors', args: ['?x'], degVar: '?d2' },
    ],
    'angelfish'
  ),
  sp(
    'lionfish-rule',
    [
      { pred: 'is-reef-fish', args: ['?x'], degVar: '?d1' },
      { pred: 'is-venomous', args: ['?x'], degVar: '?d2' },
      { pred: 'has-spines', args: ['?x'], degVar: '?d3' },
    ],
    'lionfish'
  ),
  sp(
    'parrotfish-rule',
    [
      { pred: 'is-reef-fish', args: ['?x'], degVar: '?d1' },
      { pred: 'has-beak-like-mouth', args: ['?x'], degVar: '?d2' },
    ],
    'parrotfish'
  ),
  sp(
    'swordfish-rule',
    [
      { pred: 'is-fish', args: ['?x'], degVar: '?d1' },
      { pred: 'has-sword-nose', args: ['?x'], degVar: '?d2' },
      { pred: 'is-fast', args: ['?x'], degVar: '?d3' },
    ],
    'swordfish'
  ),
  sp(
    'seahorse-rule',
    [
      { pred: 'is-fish', args: ['?x'], degVar: '?d1' },
      { pred: 'swims-upright', args: ['?x'], degVar: '?d2' },
    ],
    'seahorse'
  ),
  sp(
    'pufferfish-rule',
    [
      { pred: 'is-fish', args: ['?x'], degVar: '?d1' },
      { pred: 'inflates', args: ['?x'], degVar: '?d2' },
    ],
    'pufferfish'
  ),
  sp(
    'anglerfish-rule',
    [
      { pred: 'is-deep-sea-fish', args: ['?x'], degVar: '?d1' },
      { pred: 'is-bioluminescent', args: ['?x'], degVar: '?d2' },
    ],
    'anglerfish'
  ),
  sp(
    'salmon-rule',
    [
      { pred: 'is-freshwater-fish', args: ['?x'], degVar: '?d1' },
      { pred: 'migrates', args: ['?x'], degVar: '?d2' },
    ],
    'salmon'
  ),
  sp(
    'trout-rule',
    [
      { pred: 'is-freshwater-fish', args: ['?x'], degVar: '?d1' },
      { pred: 'has-spots', args: ['?x'], degVar: '?d2' },
    ],
    'trout'
  ),
  sp(
    'catfish-rule',
    [
      { pred: 'is-freshwater-fish', args: ['?x'], degVar: '?d1' },
      { pred: 'has-barbels', args: ['?x'], degVar: '?d2' },
    ],
    'catfish'
  ),
  sp(
    'piranha-rule',
    [
      { pred: 'is-freshwater-fish', args: ['?x'], degVar: '?d1' },
      { pred: 'is-carnivore', args: ['?x'], degVar: '?d2' },
      { pred: 'has-sharp-teeth', args: ['?x'], degVar: '?d3' },
    ],
    'piranha'
  ),
  sp(
    'electric-eel-rule',
    [
      { pred: 'is-freshwater-fish', args: ['?x'], degVar: '?d1' },
      { pred: 'produces-electricity', args: ['?x'], degVar: '?d2' },
    ],
    'electric-eel'
  ),
  sp(
    'tuna-rule',
    [
      { pred: 'is-fish', args: ['?x'], degVar: '?d1' },
      { pred: 'is-fast', args: ['?x'], degVar: '?d2' },
      { pred: 'is-large', args: ['?x'], degVar: '?d3' },
    ],
    'tuna'
  ),
  sp(
    'flying-fish-rule',
    [
      { pred: 'is-fish', args: ['?x'], degVar: '?d1' },
      { pred: 'can-fly', args: ['?x'], degVar: '?d2' },
    ],
    'flying-fish'
  ),
  sp(
    'barracuda-rule',
    [
      { pred: 'is-fish', args: ['?x'], degVar: '?d1' },
      { pred: 'is-fast', args: ['?x'], degVar: '?d2' },
      { pred: 'has-sharp-teeth', args: ['?x'], degVar: '?d3' },
    ],
    'barracuda'
  ),

  // --- Cephalopods ---
  sp(
    'octopus-rule',
    [
      { pred: 'is-cephalopod', args: ['?x'], degVar: '?d1' },
      { pred: 'has-eight-legs', args: ['?x'], degVar: '?d2' },
    ],
    'octopus'
  ),
  sp(
    'squid-rule',
    [
      { pred: 'is-cephalopod', args: ['?x'], degVar: '?d1' },
      { pred: 'has-ten-legs', args: ['?x'], degVar: '?d2' },
    ],
    'squid'
  ),
  sp(
    'giant-squid-rule',
    [
      { pred: 'is-cephalopod', args: ['?x'], degVar: '?d1' },
      { pred: 'has-ten-legs', args: ['?x'], degVar: '?d2' },
      { pred: 'is-large', args: ['?x'], degVar: '?d3' },
      { pred: 'lives-in-deep-sea', args: ['?x'], degVar: '?d4' },
    ],
    'giant-squid'
  ),
  sp(
    'cuttlefish-rule',
    [
      { pred: 'is-cephalopod', args: ['?x'], degVar: '?d1' },
      { pred: 'changes-color', args: ['?x'], degVar: '?d2' },
    ],
    'cuttlefish'
  ),
  sp(
    'nautilus-rule',
    [
      { pred: 'is-cephalopod', args: ['?x'], degVar: '?d1' },
      { pred: 'has-external-shell', args: ['?x'], degVar: '?d2' },
    ],
    'nautilus'
  ),

  // --- Bivalves ---
  sp(
    'oyster-rule',
    [
      { pred: 'is-bivalve', args: ['?x'], degVar: '?d1' },
      { pred: 'produces-pearls', args: ['?x'], degVar: '?d2' },
    ],
    'oyster'
  ),
  sp(
    'mussel-rule',
    [
      { pred: 'is-bivalve', args: ['?x'], degVar: '?d1' },
      { pred: 'lives-in-colony', args: ['?x'], degVar: '?d2' },
    ],
    'mussel'
  ),
  sp(
    'clam-rule',
    [
      { pred: 'is-bivalve', args: ['?x'], degVar: '?d1' },
      { pred: 'burrows', args: ['?x'], degVar: '?d2' },
    ],
    'clam'
  ),
  sp(
    'scallop-rule',
    [
      { pred: 'is-bivalve', args: ['?x'], degVar: '?d1' },
      { pred: 'can-swim', args: ['?x'], degVar: '?d2' },
    ],
    'scallop'
  ),

  // --- Gastropods ---
  sp(
    'snail-rule',
    [
      { pred: 'is-gastropod', args: ['?x'], degVar: '?d1' },
      { pred: 'lives-on-land', args: ['?x'], degVar: '?d2' },
    ],
    'snail'
  ),
  sp(
    'slug-rule',
    [
      { pred: 'is-mollusk', args: ['?x'], degVar: '?d1' },
      { pred: 'lives-on-land', args: ['?x'], degVar: '?d2' },
      { pred: 'has-no-shell', args: ['?x'], degVar: '?d3' },
    ],
    'slug'
  ),
  sp(
    'sea-slug-rule',
    [
      { pred: 'is-gastropod', args: ['?x'], degVar: '?d1' },
      { pred: 'has-bright-colors', args: ['?x'], degVar: '?d2' },
      { pred: 'lives-in-ocean', args: ['?x'], degVar: '?d3' },
    ],
    'sea-slug'
  ),

  // --- Crustaceans ---
  sp(
    'lobster-rule',
    [
      { pred: 'is-decapod', args: ['?x'], degVar: '?d1' },
      { pred: 'has-claws', args: ['?x'], degVar: '?d2' },
      { pred: 'is-large', args: ['?x'], degVar: '?d3' },
    ],
    'lobster'
  ),
  sp(
    'crab-rule',
    [
      { pred: 'is-decapod', args: ['?x'], degVar: '?d1' },
      { pred: 'has-claws', args: ['?x'], degVar: '?d2' },
    ],
    'crab'
  ),
  sp(
    'shrimp-rule',
    [
      { pred: 'is-decapod', args: ['?x'], degVar: '?d1' },
      { pred: 'is-small', args: ['?x'], degVar: '?d2' },
    ],
    'shrimp'
  ),
  sp(
    'hermit-crab-rule',
    [
      { pred: 'is-decapod', args: ['?x'], degVar: '?d1' },
      { pred: 'uses-borrowed-shell', args: ['?x'], degVar: '?d2' },
    ],
    'hermit-crab'
  ),
  sp(
    'mantis-shrimp-rule',
    [
      { pred: 'is-crustacean', args: ['?x'], degVar: '?d1' },
      { pred: 'has-powerful-strike', args: ['?x'], degVar: '?d2' },
      { pred: 'has-bright-colors', args: ['?x'], degVar: '?d3' },
    ],
    'mantis-shrimp'
  ),
  sp(
    'barnacle-rule',
    [
      { pred: 'is-crustacean', args: ['?x'], degVar: '?d1' },
      { pred: 'is-sessile', args: ['?x'], degVar: '?d2' },
    ],
    'barnacle'
  ),
  sp(
    'krill-rule',
    [
      { pred: 'is-crustacean', args: ['?x'], degVar: '?d1' },
      { pred: 'is-small', args: ['?x'], degVar: '?d2' },
      { pred: 'lives-in-colony', args: ['?x'], degVar: '?d3' },
    ],
    'krill'
  ),

  // --- Insects: additional ---
  sp(
    'moth-rule',
    [
      { pred: 'is-flying-insect', args: ['?x'], degVar: '?d1' },
      { pred: 'is-nocturnal', args: ['?x'], degVar: '?d2' },
    ],
    'moth'
  ),
  sp(
    'firefly-rule',
    [
      { pred: 'is-flying-insect', args: ['?x'], degVar: '?d1' },
      { pred: 'is-bioluminescent', args: ['?x'], degVar: '?d2' },
    ],
    'firefly'
  ),
  sp(
    'mosquito-rule',
    [
      { pred: 'is-flying-insect', args: ['?x'], degVar: '?d1' },
      { pred: 'drinks-blood', args: ['?x'], degVar: '?d2' },
    ],
    'mosquito'
  ),
  sp(
    'wasp-rule',
    [
      { pred: 'is-flying-insect', args: ['?x'], degVar: '?d1' },
      { pred: 'has-stinger', args: ['?x'], degVar: '?d2' },
      { pred: 'is-carnivore', args: ['?x'], degVar: '?d3' },
    ],
    'wasp'
  ),
  sp(
    'ladybug-rule',
    [
      { pred: 'is-insect', args: ['?x'], degVar: '?d1' },
      { pred: 'has-spots', args: ['?x'], degVar: '?d2' },
      { pred: 'has-bright-colors', args: ['?x'], degVar: '?d3' },
    ],
    'ladybug'
  ),
  sp(
    'praying-mantis-rule',
    [
      { pred: 'is-insect', args: ['?x'], degVar: '?d1' },
      { pred: 'is-carnivore', args: ['?x'], degVar: '?d2' },
      { pred: 'has-grasping-forelegs', args: ['?x'], degVar: '?d3' },
    ],
    'praying-mantis'
  ),
  sp(
    'grasshopper-rule',
    [
      { pred: 'is-insect', args: ['?x'], degVar: '?d1' },
      { pred: 'can-jump', args: ['?x'], degVar: '?d2' },
      { pred: 'is-herbivore', args: ['?x'], degVar: '?d3' },
    ],
    'grasshopper'
  ),
  sp(
    'cricket-rule',
    [
      { pred: 'is-insect', args: ['?x'], degVar: '?d1' },
      { pred: 'can-jump', args: ['?x'], degVar: '?d2' },
      { pred: 'chirps', args: ['?x'], degVar: '?d3' },
    ],
    'cricket'
  ),
  sp(
    'cockroach-rule',
    [
      { pred: 'is-insect', args: ['?x'], degVar: '?d1' },
      { pred: 'is-nocturnal', args: ['?x'], degVar: '?d2' },
      { pred: 'is-fast', args: ['?x'], degVar: '?d3' },
    ],
    'cockroach'
  ),
  sp(
    'termite-rule',
    [
      { pred: 'is-social-insect', args: ['?x'], degVar: '?d1' },
      { pred: 'eats-wood', args: ['?x'], degVar: '?d2' },
    ],
    'termite'
  ),
  sp(
    'cicada-rule',
    [
      { pred: 'is-insect', args: ['?x'], degVar: '?d1' },
      { pred: 'is-loud', args: ['?x'], degVar: '?d2' },
      { pred: 'lives-underground', args: ['?x'], degVar: '?d3' },
    ],
    'cicada'
  ),
  sp(
    'stick-insect-rule',
    [
      { pred: 'is-insect', args: ['?x'], degVar: '?d1' },
      { pred: 'uses-camouflage', args: ['?x'], degVar: '?d2' },
      { pred: 'has-elongated-body', args: ['?x'], degVar: '?d3' },
    ],
    'stick-insect'
  ),
  sp(
    'dung-beetle-rule',
    [
      { pred: 'is-insect', args: ['?x'], degVar: '?d1' },
      { pred: 'rolls-dung', args: ['?x'], degVar: '?d2' },
    ],
    'dung-beetle'
  ),
  sp(
    'weevil-rule',
    [
      { pred: 'is-insect', args: ['?x'], degVar: '?d1' },
      { pred: 'has-long-snout', args: ['?x'], degVar: '?d2' },
      { pred: 'is-small', args: ['?x'], degVar: '?d3' },
    ],
    'weevil'
  ),

  // --- Arachnids: additional ---
  sp(
    'tarantula-rule',
    [
      { pred: 'is-arachnid', args: ['?x'], degVar: '?d1' },
      { pred: 'is-large', args: ['?x'], degVar: '?d2' },
      { pred: 'has-hair', args: ['?x'], degVar: '?d3' },
    ],
    'tarantula'
  ),
  sp(
    'black-widow-rule',
    [
      { pred: 'is-arachnid', args: ['?x'], degVar: '?d1' },
      { pred: 'is-venomous', args: ['?x'], degVar: '?d2' },
      { pred: 'has-red-markings', args: ['?x'], degVar: '?d3' },
    ],
    'black-widow'
  ),
  sp(
    'tick-rule',
    [
      { pred: 'is-arachnid', args: ['?x'], degVar: '?d1' },
      { pred: 'is-parasite', args: ['?x'], degVar: '?d2' },
    ],
    'tick'
  ),

  // --- Misc. marine invertebrates ---
  sp(
    'jellyfish-rule',
    [
      { pred: 'is-aquatic', args: ['?x'], degVar: '?d1' },
      { pred: 'has-tentacles', args: ['?x'], degVar: '?d2' },
      { pred: 'has-no-brain', args: ['?x'], degVar: '?d3' },
    ],
    'jellyfish'
  ),
  sp(
    'starfish-rule',
    [
      { pred: 'is-aquatic', args: ['?x'], degVar: '?d1' },
      { pred: 'has-five-arms', args: ['?x'], degVar: '?d2' },
    ],
    'starfish'
  ),
  sp(
    'sea-urchin-rule',
    [
      { pred: 'is-aquatic', args: ['?x'], degVar: '?d1' },
      { pred: 'has-spines', args: ['?x'], degVar: '?d2' },
      { pred: 'is-small', args: ['?x'], degVar: '?d3' },
    ],
    'sea-urchin'
  ),
  sp(
    'sea-cucumber-rule',
    [
      { pred: 'is-aquatic', args: ['?x'], degVar: '?d1' },
      { pred: 'has-soft-body', args: ['?x'], degVar: '?d2' },
      { pred: 'lives-on-ocean-floor', args: ['?x'], degVar: '?d3' },
    ],
    'sea-cucumber'
  ),
  sp(
    'coral-rule',
    [
      { pred: 'is-aquatic', args: ['?x'], degVar: '?d1' },
      { pred: 'is-sessile', args: ['?x'], degVar: '?d2' },
      { pred: 'lives-in-colony', args: ['?x'], degVar: '?d3' },
    ],
    'coral'
  ),
  sp(
    'sea-anemone-rule',
    [
      { pred: 'is-aquatic', args: ['?x'], degVar: '?d1' },
      { pred: 'has-tentacles', args: ['?x'], degVar: '?d2' },
      { pred: 'is-sessile', args: ['?x'], degVar: '?d3' },
    ],
    'sea-anemone'
  ),
  sp(
    'sponge-rule',
    [
      { pred: 'is-aquatic', args: ['?x'], degVar: '?d1' },
      { pred: 'is-sessile', args: ['?x'], degVar: '?d2' },
      { pred: 'filter-feeds', args: ['?x'], degVar: '?d3' },
    ],
    'sponge'
  ),

  // --- Worms/annelids ---
  sp(
    'earthworm-rule',
    [
      { pred: 'lives-on-land', args: ['?x'], degVar: '?d1' },
      { pred: 'burrows', args: ['?x'], degVar: '?d2' },
      { pred: 'has-no-legs', args: ['?x'], degVar: '?d3' },
      { pred: 'has-segments', args: ['?x'], degVar: '?d4' },
    ],
    'earthworm'
  ),
  sp(
    'leech-rule',
    [
      { pred: 'is-aquatic', args: ['?x'], degVar: '?d1' },
      { pred: 'is-parasite', args: ['?x'], degVar: '?d2' },
      { pred: 'has-segments', args: ['?x'], degVar: '?d3' },
    ],
    'leech'
  ),

  // --- Domestic animals ---
  sp(
    'chicken-rule',
    [
      { pred: 'is-bird', args: ['?x'], degVar: '?d1' },
      { pred: 'is-domestic', args: ['?x'], degVar: '?d2' },
      { pred: 'cannot-fly', args: ['?x'], degVar: '?d3' },
    ],
    'chicken'
  ),
  sp(
    'turkey-rule',
    [
      { pred: 'is-bird', args: ['?x'], degVar: '?d1' },
      { pred: 'is-domestic', args: ['?x'], degVar: '?d2' },
      { pred: 'has-wattle', args: ['?x'], degVar: '?d3' },
    ],
    'turkey'
  ),
  sp(
    'domestic-goose-rule',
    [
      { pred: 'is-waterfowl', args: ['?x'], degVar: '?d1' },
      { pred: 'is-domestic', args: ['?x'], degVar: '?d2' },
    ],
    'domestic-goose'
  ),
  sp(
    'goldfish-rule',
    [
      { pred: 'is-freshwater-fish', args: ['?x'], degVar: '?d1' },
      { pred: 'is-domestic', args: ['?x'], degVar: '?d2' },
    ],
    'goldfish'
  ),
  sp(
    'pig-rule',
    [
      { pred: 'is-mammal', args: ['?x'], degVar: '?d1' },
      { pred: 'is-domestic', args: ['?x'], degVar: '?d2' },
      { pred: 'is-omnivore', args: ['?x'], degVar: '?d3' },
      { pred: 'has-snout', args: ['?x'], degVar: '?d4' },
    ],
    'pig'
  ),

  // --- Subspecies/variants (priority 35) ---
  sp(
    'bengal-tiger-rule',
    [
      { pred: 'species', args: ['?x', 'tiger'], degVar: '?d1' },
      { pred: 'lives-in-jungle', args: ['?x'], degVar: '?d2' },
    ],
    'bengal-tiger',
    35
  ),
  sp(
    'siberian-tiger-rule',
    [
      { pred: 'species', args: ['?x', 'tiger'], degVar: '?d1' },
      { pred: 'lives-in-tundra', args: ['?x'], degVar: '?d2' },
    ],
    'siberian-tiger',
    35
  ),
  sp(
    'emperor-penguin-rule',
    [
      { pred: 'species', args: ['?x', 'penguin'], degVar: '?d1' },
      { pred: 'is-large', args: ['?x'], degVar: '?d2' },
    ],
    'emperor-penguin',
    35
  ),
  sp(
    'rockhopper-penguin-rule',
    [
      { pred: 'species', args: ['?x', 'penguin'], degVar: '?d1' },
      { pred: 'is-small', args: ['?x'], degVar: '?d2' },
      { pred: 'has-crest', args: ['?x'], degVar: '?d3' },
    ],
    'rockhopper-penguin',
    35
  ),
  sp(
    'king-cobra-rule',
    [
      { pred: 'species', args: ['?x', 'cobra'], degVar: '?d1' },
      { pred: 'is-large', args: ['?x'], degVar: '?d2' },
    ],
    'king-cobra',
    35
  ),
  sp(
    'green-tree-python-rule',
    [
      { pred: 'species', args: ['?x', 'python'], degVar: '?d1' },
      { pred: 'climbs-trees', args: ['?x'], degVar: '?d2' },
    ],
    'green-tree-python',
    35
  ),
  sp(
    'barn-owl-rule',
    [
      { pred: 'species', args: ['?x', 'owl'], degVar: '?d1' },
      { pred: 'lives-near-humans', args: ['?x'], degVar: '?d2' },
    ],
    'barn-owl',
    35
  ),
  sp(
    'snowy-owl-rule',
    [
      { pred: 'species', args: ['?x', 'owl'], degVar: '?d1' },
      { pred: 'lives-in-arctic', args: ['?x'], degVar: '?d2' },
    ],
    'snowy-owl',
    35
  ),
  sp(
    'grey-wolf-rule',
    [
      { pred: 'species', args: ['?x', 'wolf'], degVar: '?d1' },
      { pred: 'lives-in-tundra', args: ['?x'], degVar: '?d2' },
    ],
    'grey-wolf',
    35
  ),
  sp(
    'red-wolf-rule',
    [
      { pred: 'species', args: ['?x', 'wolf'], degVar: '?d1' },
      { pred: 'is-endangered', args: ['?x'], degVar: '?d2' },
    ],
    'red-wolf',
    35
  ),
  sp(
    'african-grey-parrot-rule',
    [
      { pred: 'species', args: ['?x', 'parrot'], degVar: '?d1' },
      { pred: 'is-grey', args: ['?x'], degVar: '?d2' },
    ],
    'african-grey-parrot',
    35
  ),
  sp(
    'blue-ringed-octopus-rule',
    [
      { pred: 'species', args: ['?x', 'octopus'], degVar: '?d1' },
      { pred: 'is-venomous', args: ['?x'], degVar: '?d2' },
    ],
    'blue-ringed-octopus',
    35
  ),
  sp(
    'indian-elephant-rule',
    [
      { pred: 'species', args: ['?x', 'elephant'], degVar: '?d1' },
      { pred: 'is-domestic', args: ['?x'], degVar: '?d2' },
    ],
    'indian-elephant',
    35
  ),
  sp(
    'peregrine-falcon-rule',
    [
      { pred: 'species', args: ['?x', 'falcon'], degVar: '?d1' },
      { pred: 'is-fast', args: ['?x'], degVar: '?d2' },
    ],
    'peregrine-falcon',
    35
  ),
  sp(
    'green-sea-turtle-rule',
    [
      { pred: 'species', args: ['?x', 'sea-turtle'], degVar: '?d1' },
      { pred: 'is-herbivore', args: ['?x'], degVar: '?d2' },
    ],
    'green-sea-turtle',
    35
  ),
  sp(
    'galapagos-tortoise-rule',
    [
      { pred: 'species', args: ['?x', 'tortoise'], degVar: '?d1' },
      { pred: 'is-large', args: ['?x'], degVar: '?d2' },
    ],
    'galapagos-tortoise',
    35
  ),
  sp(
    'bottlenose-dolphin-spinner-rule',
    [
      { pred: 'species', args: ['?x', 'dolphin'], degVar: '?d1' },
      { pred: 'spins-when-jumping', args: ['?x'], degVar: '?d2' },
    ],
    'spinner-dolphin',
    35
  ),
  sp(
    'albino-crocodile-rule',
    [
      { pred: 'species', args: ['?x', 'crocodile'], degVar: '?d1' },
      { pred: 'is-albino', args: ['?x'], degVar: '?d2' },
    ],
    'albino-crocodile',
    35
  ),
  sp(
    'golden-poison-frog-rule',
    [
      { pred: 'species', args: ['?x', 'poison-dart-frog'], degVar: '?d1' },
      { pred: 'is-yellow', args: ['?x'], degVar: '?d2' },
    ],
    'golden-poison-frog',
    35
  ),
  sp(
    'monarch-butterfly-rule',
    [
      { pred: 'species', args: ['?x', 'butterfly'], degVar: '?d1' },
      { pred: 'migrates', args: ['?x'], degVar: '?d2' },
    ],
    'monarch-butterfly',
    35
  ),
  sp(
    'atlas-moth-rule',
    [
      { pred: 'species', args: ['?x', 'moth'], degVar: '?d1' },
      { pred: 'is-large', args: ['?x'], degVar: '?d2' },
    ],
    'atlas-moth',
    35
  ),
  sp(
    'japanese-spider-crab-rule',
    [
      { pred: 'species', args: ['?x', 'crab'], degVar: '?d1' },
      { pred: 'is-large', args: ['?x'], degVar: '?d2' },
    ],
    'japanese-spider-crab',
    35
  ),

  // =====================================================================
  // ADDITIONAL INTERMEDIATE CLASSES (priority 50)
  // =====================================================================
  cls(
    'scavenger-bird-rule',
    [
      { pred: 'is-bird', args: ['?x'], degVar: '?d1' },
      { pred: 'is-scavenger', args: ['?x'], degVar: '?d2' },
    ],
    'is-scavenger-bird',
    50
  ),
  cls(
    'burrowing-reptile-rule',
    [
      { pred: 'is-reptile', args: ['?x'], degVar: '?d1' },
      { pred: 'burrows', args: ['?x'], degVar: '?d2' },
    ],
    'is-burrowing-reptile',
    50
  ),
  cls(
    'climbing-mammal-rule',
    [
      { pred: 'is-mammal', args: ['?x'], degVar: '?d1' },
      { pred: 'climbs-trees', args: ['?x'], degVar: '?d2' },
    ],
    'is-climbing-mammal',
    50
  ),
  cls(
    'gliding-mammal-rule',
    [
      { pred: 'is-mammal', args: ['?x'], degVar: '?d1' },
      { pred: 'glides', args: ['?x'], degVar: '?d2' },
    ],
    'is-gliding-mammal',
    50
  ),
  cls(
    'arctic-bird-rule',
    [
      { pred: 'is-bird', args: ['?x'], degVar: '?d1' },
      { pred: 'lives-in-arctic', args: ['?x'], degVar: '?d2' },
    ],
    'is-arctic-bird',
    50
  ),
  cls(
    'desert-reptile-rule',
    [
      { pred: 'is-reptile', args: ['?x'], degVar: '?d1' },
      { pred: 'lives-in-desert', args: ['?x'], degVar: '?d2' },
    ],
    'is-desert-reptile',
    50
  ),
  cls(
    'island-species-rule',
    [
      { pred: 'lives-on-island', args: ['?x'], degVar: '?d1' },
      { pred: 'is-endemic', args: ['?x'], degVar: '?d2' },
    ],
    'is-island-endemic',
    50
  ),
  cls(
    'migratory-bird-rule',
    [
      { pred: 'is-bird', args: ['?x'], degVar: '?d1' },
      { pred: 'migrates', args: ['?x'], degVar: '?d2' },
    ],
    'is-migratory-bird',
    50
  ),
  cls(
    'hibernating-mammal-rule',
    [
      { pred: 'is-mammal', args: ['?x'], degVar: '?d1' },
      { pred: 'hibernates', args: ['?x'], degVar: '?d2' },
    ],
    'is-hibernating-mammal',
    50
  ),
  cls(
    'aquatic-insect-rule',
    [
      { pred: 'is-insect', args: ['?x'], degVar: '?d1' },
      { pred: 'is-aquatic', args: ['?x'], degVar: '?d2' },
    ],
    'is-aquatic-insect',
    50
  ),
  cls(
    'venomous-fish-rule',
    [
      { pred: 'is-fish', args: ['?x'], degVar: '?d1' },
      { pred: 'is-venomous', args: ['?x'], degVar: '?d2' },
    ],
    'is-venomous-fish',
    50
  ),
  cls(
    'nocturnal-bird-rule',
    [
      { pred: 'is-bird', args: ['?x'], degVar: '?d1' },
      { pred: 'is-nocturnal', args: ['?x'], degVar: '?d2' },
    ],
    'is-nocturnal-bird',
    50
  ),
  cls(
    'predatory-fish-rule',
    [
      { pred: 'is-fish', args: ['?x'], degVar: '?d1' },
      { pred: 'is-carnivore', args: ['?x'], degVar: '?d2' },
    ],
    'is-predatory-fish',
    50
  ),
  cls(
    'freshwater-crustacean-rule',
    [
      { pred: 'is-crustacean', args: ['?x'], degVar: '?d1' },
      { pred: 'lives-in-freshwater', args: ['?x'], degVar: '?d2' },
    ],
    'is-freshwater-crustacean',
    50
  ),

  // =====================================================================
  // ADDITIONAL SPECIES (priority 40)
  // =====================================================================

  // --- More mammals ---
  sp(
    'dugong-rule',
    [
      { pred: 'is-mammal', args: ['?x'], degVar: '?d1' },
      { pred: 'is-aquatic', args: ['?x'], degVar: '?d2' },
      { pred: 'is-herbivore', args: ['?x'], degVar: '?d3' },
      { pred: 'is-small', args: ['?x'], degVar: '?d4' },
    ],
    'dugong'
  ),
  sp(
    'pangolin-variant-rule',
    [
      { pred: 'is-mammal', args: ['?x'], degVar: '?d1' },
      { pred: 'has-scales', args: ['?x'], degVar: '?d2' },
      { pred: 'is-nocturnal', args: ['?x'], degVar: '?d3' },
    ],
    'nocturnal-pangolin'
  ),
  sp(
    'flying-lemur-rule',
    [
      { pred: 'is-gliding-mammal', args: ['?x'], degVar: '?d1' },
      { pred: 'is-nocturnal', args: ['?x'], degVar: '?d2' },
      { pred: 'lives-in-tropics', args: ['?x'], degVar: '?d3' },
    ],
    'flying-lemur'
  ),
  sp(
    'wild-boar-rule',
    [
      { pred: 'is-mammal', args: ['?x'], degVar: '?d1' },
      { pred: 'is-omnivore', args: ['?x'], degVar: '?d2' },
      { pred: 'has-tusks', args: ['?x'], degVar: '?d3' },
    ],
    'wild-boar'
  ),
  sp(
    'warthog-rule',
    [
      { pred: 'is-mammal', args: ['?x'], degVar: '?d1' },
      { pred: 'has-tusks', args: ['?x'], degVar: '?d2' },
      { pred: 'lives-in-savanna', args: ['?x'], degVar: '?d3' },
    ],
    'warthog'
  ),
  sp(
    'peccary-rule',
    [
      { pred: 'is-mammal', args: ['?x'], degVar: '?d1' },
      { pred: 'is-omnivore', args: ['?x'], degVar: '?d2' },
      { pred: 'lives-in-jungle', args: ['?x'], degVar: '?d3' },
      { pred: 'has-snout', args: ['?x'], degVar: '?d4' },
    ],
    'peccary'
  ),
  sp(
    'numbat-rule',
    [
      { pred: 'is-marsupial', args: ['?x'], degVar: '?d1' },
      { pred: 'eats-insects', args: ['?x'], degVar: '?d2' },
      { pred: 'has-stripes', args: ['?x'], degVar: '?d3' },
    ],
    'numbat'
  ),
  sp(
    'quokka-rule',
    [
      { pred: 'is-marsupial', args: ['?x'], degVar: '?d1' },
      { pred: 'is-small', args: ['?x'], degVar: '?d2' },
      { pred: 'lives-on-island', args: ['?x'], degVar: '?d3' },
    ],
    'quokka'
  ),
  sp(
    'binturong-rule',
    [
      { pred: 'is-mammal', args: ['?x'], degVar: '?d1' },
      { pred: 'is-arboreal', args: ['?x'], degVar: '?d2' },
      { pred: 'has-prehensile-tail', args: ['?x'], degVar: '?d3' },
    ],
    'binturong'
  ),
  sp(
    'coati-rule',
    [
      { pred: 'is-mammal', args: ['?x'], degVar: '?d1' },
      { pred: 'is-omnivore', args: ['?x'], degVar: '?d2' },
      { pred: 'has-long-snout', args: ['?x'], degVar: '?d3' },
      { pred: 'has-long-tail', args: ['?x'], degVar: '?d4' },
    ],
    'coati'
  ),
  sp(
    'civet-rule',
    [
      { pred: 'is-mammal', args: ['?x'], degVar: '?d1' },
      { pred: 'is-nocturnal', args: ['?x'], degVar: '?d2' },
      { pred: 'is-arboreal', args: ['?x'], degVar: '?d3' },
      { pred: 'has-spots', args: ['?x'], degVar: '?d4' },
    ],
    'civet'
  ),
  sp(
    'genet-rule',
    [
      { pred: 'is-mammal', args: ['?x'], degVar: '?d1' },
      { pred: 'is-nocturnal', args: ['?x'], degVar: '?d2' },
      { pred: 'has-spots', args: ['?x'], degVar: '?d3' },
      { pred: 'has-long-tail', args: ['?x'], degVar: '?d4' },
    ],
    'genet'
  ),

  // --- More birds ---
  sp(
    'secretary-bird-rule',
    [
      { pred: 'is-bird', args: ['?x'], degVar: '?d1' },
      { pred: 'is-carnivore', args: ['?x'], degVar: '?d2' },
      { pred: 'has-long-legs', args: ['?x'], degVar: '?d3' },
      { pred: 'lives-in-savanna', args: ['?x'], degVar: '?d4' },
    ],
    'secretary-bird'
  ),
  sp(
    'shoebill-rule',
    [
      { pred: 'is-wading-bird', args: ['?x'], degVar: '?d1' },
      { pred: 'has-large-beak', args: ['?x'], degVar: '?d2' },
      { pred: 'is-large', args: ['?x'], degVar: '?d3' },
    ],
    'shoebill'
  ),
  sp(
    'hornbill-rule',
    [
      { pred: 'is-tropical-bird', args: ['?x'], degVar: '?d1' },
      { pred: 'has-casque', args: ['?x'], degVar: '?d2' },
    ],
    'hornbill'
  ),
  sp(
    'swift-rule',
    [
      { pred: 'is-bird', args: ['?x'], degVar: '?d1' },
      { pred: 'is-fast', args: ['?x'], degVar: '?d2' },
      { pred: 'is-small', args: ['?x'], degVar: '?d3' },
      { pred: 'can-fly', args: ['?x'], degVar: '?d4' },
    ],
    'swift'
  ),
  sp(
    'swallow-rule',
    [
      { pred: 'is-migratory-bird', args: ['?x'], degVar: '?d1' },
      { pred: 'is-small', args: ['?x'], degVar: '?d2' },
      { pred: 'has-forked-tail', args: ['?x'], degVar: '?d3' },
    ],
    'swallow'
  ),
  sp(
    'jay-rule',
    [
      { pred: 'is-bird', args: ['?x'], degVar: '?d1' },
      { pred: 'has-bright-colors', args: ['?x'], degVar: '?d2' },
      { pred: 'is-loud', args: ['?x'], degVar: '?d3' },
    ],
    'jay'
  ),
  sp(
    'magpie-rule',
    [
      { pred: 'is-bird', args: ['?x'], degVar: '?d1' },
      { pred: 'has-black-white-pattern', args: ['?x'], degVar: '?d2' },
      { pred: 'collects-shiny-objects', args: ['?x'], degVar: '?d3' },
    ],
    'magpie'
  ),
  sp(
    'cuckoo-rule',
    [
      { pred: 'is-bird', args: ['?x'], degVar: '?d1' },
      { pred: 'is-parasitic', args: ['?x'], degVar: '?d2' },
    ],
    'cuckoo'
  ),
  sp(
    'lyrebird-rule',
    [
      { pred: 'is-songbird', args: ['?x'], degVar: '?d1' },
      { pred: 'mimics-sounds', args: ['?x'], degVar: '?d2' },
    ],
    'lyrebird'
  ),
  sp(
    'wren-rule',
    [
      { pred: 'is-songbird', args: ['?x'], degVar: '?d1' },
      { pred: 'is-small', args: ['?x'], degVar: '?d2' },
      { pred: 'has-upright-tail', args: ['?x'], degVar: '?d3' },
    ],
    'wren'
  ),
  sp(
    'loon-rule',
    [
      { pred: 'is-waterfowl', args: ['?x'], degVar: '?d1' },
      { pred: 'has-distinctive-call', args: ['?x'], degVar: '?d2' },
    ],
    'loon'
  ),
  sp(
    'cormorant-rule',
    [
      { pred: 'is-seabird', args: ['?x'], degVar: '?d1' },
      { pred: 'dives', args: ['?x'], degVar: '?d2' },
    ],
    'cormorant'
  ),
  sp(
    'booby-rule',
    [
      { pred: 'is-seabird', args: ['?x'], degVar: '?d1' },
      { pred: 'has-bright-feet', args: ['?x'], degVar: '?d2' },
    ],
    'booby'
  ),
  sp(
    'frigatebird-rule',
    [
      { pred: 'is-seabird', args: ['?x'], degVar: '?d1' },
      { pred: 'has-inflatable-pouch', args: ['?x'], degVar: '?d2' },
    ],
    'frigatebird'
  ),
  sp(
    'arctic-tern-rule',
    [
      { pred: 'is-arctic-bird', args: ['?x'], degVar: '?d1' },
      { pred: 'migrates', args: ['?x'], degVar: '?d2' },
    ],
    'arctic-tern'
  ),
  sp(
    'snowy-egret-rule',
    [
      { pred: 'is-wading-bird', args: ['?x'], degVar: '?d1' },
      { pred: 'is-white', args: ['?x'], degVar: '?d2' },
    ],
    'snowy-egret'
  ),

  // --- More reptiles ---
  sp(
    'gila-monster-rule',
    [
      { pred: 'is-desert-reptile', args: ['?x'], degVar: '?d1' },
      { pred: 'is-venomous', args: ['?x'], degVar: '?d2' },
    ],
    'gila-monster'
  ),
  sp(
    'thorny-devil-rule',
    [
      { pred: 'is-desert-reptile', args: ['?x'], degVar: '?d1' },
      { pred: 'has-spines', args: ['?x'], degVar: '?d2' },
    ],
    'thorny-devil'
  ),
  sp(
    'frilled-lizard-rule',
    [
      { pred: 'is-reptile', args: ['?x'], degVar: '?d1' },
      { pred: 'has-frill', args: ['?x'], degVar: '?d2' },
    ],
    'frilled-lizard'
  ),
  sp(
    'tuatara-rule',
    [
      { pred: 'is-reptile', args: ['?x'], degVar: '?d1' },
      { pred: 'is-island-endemic', args: ['?x'], degVar: '?d2' },
      { pred: 'has-third-eye', args: ['?x'], degVar: '?d3' },
    ],
    'tuatara'
  ),
  sp(
    'marine-iguana-rule',
    [
      { pred: 'is-marine-reptile', args: ['?x'], degVar: '?d1' },
      { pred: 'has-legs', args: ['?x'], degVar: '?d2' },
      { pred: 'is-herbivore', args: ['?x'], degVar: '?d3' },
    ],
    'marine-iguana'
  ),

  // --- More fish ---
  sp(
    'moray-eel-rule',
    [
      { pred: 'is-predatory-fish', args: ['?x'], degVar: '?d1' },
      { pred: 'lives-in-reef', args: ['?x'], degVar: '?d2' },
      { pred: 'has-elongated-body', args: ['?x'], degVar: '?d3' },
    ],
    'moray-eel'
  ),
  sp(
    'grouper-rule',
    [
      { pred: 'is-predatory-fish', args: ['?x'], degVar: '?d1' },
      { pred: 'is-large', args: ['?x'], degVar: '?d2' },
      { pred: 'lives-in-reef', args: ['?x'], degVar: '?d3' },
    ],
    'grouper'
  ),
  sp(
    'sturgeon-rule',
    [
      { pred: 'is-freshwater-fish', args: ['?x'], degVar: '?d1' },
      { pred: 'is-large', args: ['?x'], degVar: '?d2' },
      { pred: 'has-armor', args: ['?x'], degVar: '?d3' },
    ],
    'sturgeon'
  ),
  sp(
    'carp-rule',
    [
      { pred: 'is-freshwater-fish', args: ['?x'], degVar: '?d1' },
      { pred: 'is-herbivore', args: ['?x'], degVar: '?d2' },
    ],
    'carp'
  ),
  sp(
    'bass-rule',
    [
      { pred: 'is-freshwater-fish', args: ['?x'], degVar: '?d1' },
      { pred: 'is-carnivore', args: ['?x'], degVar: '?d2' },
    ],
    'bass'
  ),
  sp(
    'marlin-rule',
    [
      { pred: 'is-fish', args: ['?x'], degVar: '?d1' },
      { pred: 'has-sword-nose', args: ['?x'], degVar: '?d2' },
      { pred: 'is-large', args: ['?x'], degVar: '?d3' },
    ],
    'marlin'
  ),
  sp(
    'remora-rule',
    [
      { pred: 'is-fish', args: ['?x'], degVar: '?d1' },
      { pred: 'lives-symbiotically', args: ['?x'], degVar: '?d2' },
      { pred: 'has-suction-pad', args: ['?x'], degVar: '?d3' },
    ],
    'remora'
  ),

  // --- More insects ---
  sp(
    'hornet-rule',
    [
      { pred: 'is-flying-insect', args: ['?x'], degVar: '?d1' },
      { pred: 'has-stinger', args: ['?x'], degVar: '?d2' },
      { pred: 'is-large', args: ['?x'], degVar: '?d3' },
    ],
    'hornet'
  ),
  sp(
    'leaf-cutter-ant-rule',
    [
      { pred: 'is-social-insect', args: ['?x'], degVar: '?d1' },
      { pred: 'cuts-leaves', args: ['?x'], degVar: '?d2' },
    ],
    'leaf-cutter-ant'
  ),
  sp(
    'army-ant-rule',
    [
      { pred: 'is-social-insect', args: ['?x'], degVar: '?d1' },
      { pred: 'hunts-in-packs', args: ['?x'], degVar: '?d2' },
    ],
    'army-ant'
  ),
  sp(
    'stag-beetle-rule',
    [
      { pred: 'is-insect', args: ['?x'], degVar: '?d1' },
      { pred: 'has-large-mandibles', args: ['?x'], degVar: '?d2' },
    ],
    'stag-beetle'
  ),
  sp(
    'water-strider-rule',
    [
      { pred: 'is-aquatic-insect', args: ['?x'], degVar: '?d1' },
      { pred: 'walks-on-water', args: ['?x'], degVar: '?d2' },
    ],
    'water-strider'
  ),
  sp(
    'diving-beetle-rule',
    [
      { pred: 'is-aquatic-insect', args: ['?x'], degVar: '?d1' },
      { pred: 'is-carnivore', args: ['?x'], degVar: '?d2' },
    ],
    'diving-beetle'
  ),
  sp(
    'atlas-beetle-rule',
    [
      { pred: 'is-insect', args: ['?x'], degVar: '?d1' },
      { pred: 'has-horn', args: ['?x'], degVar: '?d2' },
      { pred: 'is-large', args: ['?x'], degVar: '?d3' },
    ],
    'atlas-beetle'
  ),
  sp(
    'luna-moth-rule',
    [
      { pred: 'is-flying-insect', args: ['?x'], degVar: '?d1' },
      { pred: 'is-nocturnal', args: ['?x'], degVar: '?d2' },
      { pred: 'has-long-tail', args: ['?x'], degVar: '?d3' },
    ],
    'luna-moth'
  ),

  // --- More crustaceans ---
  sp(
    'crayfish-rule',
    [
      { pred: 'is-freshwater-crustacean', args: ['?x'], degVar: '?d1' },
      { pred: 'has-claws', args: ['?x'], degVar: '?d2' },
    ],
    'crayfish'
  ),
  sp(
    'isopod-rule',
    [
      { pred: 'is-crustacean', args: ['?x'], degVar: '?d1' },
      { pred: 'has-segments', args: ['?x'], degVar: '?d2' },
      { pred: 'lives-in-deep-sea', args: ['?x'], degVar: '?d3' },
    ],
    'giant-isopod'
  ),

  // --- More marine animals ---
  sp(
    'sea-otter-rule',
    [
      { pred: 'is-mammal', args: ['?x'], degVar: '?d1' },
      { pred: 'is-aquatic', args: ['?x'], degVar: '?d2' },
      { pred: 'uses-tools', args: ['?x'], degVar: '?d3' },
      { pred: 'lives-near-coast', args: ['?x'], degVar: '?d4' },
    ],
    'sea-otter'
  ),
  sp(
    'sea-lion-steller-rule',
    [
      { pred: 'is-pinniped', args: ['?x'], degVar: '?d1' },
      { pred: 'has-ear-flaps', args: ['?x'], degVar: '?d2' },
      { pred: 'is-large', args: ['?x'], degVar: '?d3' },
    ],
    'steller-sea-lion'
  ),

  // --- More amphibians ---
  sp(
    'fire-salamander-rule',
    [
      { pred: 'is-amphibian', args: ['?x'], degVar: '?d1' },
      { pred: 'has-tail', args: ['?x'], degVar: '?d2' },
      { pred: 'has-bright-colors', args: ['?x'], degVar: '?d3' },
    ],
    'fire-salamander'
  ),
  sp(
    'hellbender-rule',
    [
      { pred: 'is-aquatic-amphibian', args: ['?x'], degVar: '?d1' },
      { pred: 'is-large', args: ['?x'], degVar: '?d2' },
    ],
    'hellbender'
  ),
  sp(
    'mudpuppy-rule',
    [
      { pred: 'is-aquatic-amphibian', args: ['?x'], degVar: '?d1' },
      { pred: 'has-external-gills', args: ['?x'], degVar: '?d2' },
      { pred: 'is-small', args: ['?x'], degVar: '?d3' },
    ],
    'mudpuppy'
  ),

  // --- More arachnids ---
  sp(
    'harvestman-rule',
    [
      { pred: 'is-arachnid', args: ['?x'], degVar: '?d1' },
      { pred: 'has-long-legs', args: ['?x'], degVar: '?d2' },
      { pred: 'has-single-body-segment', args: ['?x'], degVar: '?d3' },
    ],
    'harvestman'
  ),
  sp(
    'wolf-spider-rule',
    [
      { pred: 'is-arachnid', args: ['?x'], degVar: '?d1' },
      { pred: 'hunts-on-ground', args: ['?x'], degVar: '?d2' },
      { pred: 'has-good-eyesight', args: ['?x'], degVar: '?d3' },
    ],
    'wolf-spider'
  ),
  sp(
    'jumping-spider-rule',
    [
      { pred: 'is-arachnid', args: ['?x'], degVar: '?d1' },
      { pred: 'can-jump', args: ['?x'], degVar: '?d2' },
      { pred: 'has-large-eyes', args: ['?x'], degVar: '?d3' },
    ],
    'jumping-spider'
  ),

  // --- More subspecies/variants (priority 35) ---
  sp(
    'king-cheetah-rule',
    [
      { pred: 'species', args: ['?x', 'cheetah'], degVar: '?d1' },
      { pred: 'has-blotches', args: ['?x'], degVar: '?d2' },
    ],
    'king-cheetah',
    35
  ),
  sp(
    'clouded-leopard-rule',
    [
      { pred: 'species', args: ['?x', 'leopard'], degVar: '?d1' },
      { pred: 'is-small', args: ['?x'], degVar: '?d2' },
    ],
    'clouded-leopard',
    35
  ),
  sp(
    'pygmy-seahorse-rule',
    [
      { pred: 'species', args: ['?x', 'seahorse'], degVar: '?d1' },
      { pred: 'is-small', args: ['?x'], degVar: '?d2' },
    ],
    'pygmy-seahorse',
    35
  ),
  sp(
    'nile-crocodile-rule',
    [
      { pred: 'species', args: ['?x', 'crocodile'], degVar: '?d1' },
      { pred: 'is-large', args: ['?x'], degVar: '?d2' },
    ],
    'nile-crocodile',
    35
  ),
  sp(
    'komodo-dragon-island-rule',
    [
      { pred: 'species', args: ['?x', 'komodo-dragon'], degVar: '?d1' },
      { pred: 'is-island-endemic', args: ['?x'], degVar: '?d2' },
    ],
    'komodo-dragon-flores',
    35
  ),
  sp(
    'blue-poison-dart-frog-rule',
    [
      { pred: 'species', args: ['?x', 'poison-dart-frog'], degVar: '?d1' },
      { pred: 'is-blue', args: ['?x'], degVar: '?d2' },
    ],
    'blue-poison-dart-frog',
    35
  ),
  sp(
    'black-mamba-rule',
    [
      { pred: 'species', args: ['?x', 'mamba'], degVar: '?d1' },
      { pred: 'is-large', args: ['?x'], degVar: '?d2' },
    ],
    'black-mamba',
    35
  ),
  sp(
    'green-mamba-rule',
    [
      { pred: 'species', args: ['?x', 'mamba'], degVar: '?d1' },
      { pred: 'is-arboreal', args: ['?x'], degVar: '?d2' },
    ],
    'green-mamba',
    35
  ),
  sp(
    'adelie-penguin-rule',
    [
      { pred: 'species', args: ['?x', 'penguin'], degVar: '?d1' },
      { pred: 'lives-in-arctic', args: ['?x'], degVar: '?d2' },
      { pred: 'is-small', args: ['?x'], degVar: '?d3' },
    ],
    'adelie-penguin',
    35
  ),
  sp(
    'indian-cobra-rule',
    [
      { pred: 'species', args: ['?x', 'cobra'], degVar: '?d1' },
      { pred: 'lives-in-tropics', args: ['?x'], degVar: '?d2' },
    ],
    'indian-cobra',
    35
  ),
  sp(
    'red-fox-rule',
    [
      { pred: 'species', args: ['?x', 'fox'], degVar: '?d1' },
      { pred: 'has-red-fur', args: ['?x'], degVar: '?d2' },
    ],
    'red-fox',
    35
  ),

  // =====================================================================
  // ADDITIONAL SPECIES (priority 40) — reaching ~500
  // =====================================================================
  sp(
    'sawfish-rule',
    [
      { pred: 'is-ray', args: ['?x'], degVar: '?d1' },
      { pred: 'has-saw-nose', args: ['?x'], degVar: '?d2' },
    ],
    'sawfish'
  ),
  sp(
    'guitarfish-rule',
    [
      { pred: 'is-ray', args: ['?x'], degVar: '?d1' },
      { pred: 'has-elongated-body', args: ['?x'], degVar: '?d2' },
    ],
    'guitarfish'
  ),
  sp(
    'garden-eel-rule',
    [
      { pred: 'is-fish', args: ['?x'], degVar: '?d1' },
      { pred: 'lives-in-colony', args: ['?x'], degVar: '?d2' },
      { pred: 'burrows', args: ['?x'], degVar: '?d3' },
    ],
    'garden-eel'
  ),
  sp(
    'sunfish-rule',
    [
      { pred: 'is-fish', args: ['?x'], degVar: '?d1' },
      { pred: 'is-large', args: ['?x'], degVar: '?d2' },
      { pred: 'has-flat-body', args: ['?x'], degVar: '?d3' },
    ],
    'ocean-sunfish'
  ),
  sp(
    'oarfish-rule',
    [
      { pred: 'is-deep-sea-fish', args: ['?x'], degVar: '?d1' },
      { pred: 'has-elongated-body', args: ['?x'], degVar: '?d2' },
      { pred: 'is-large', args: ['?x'], degVar: '?d3' },
    ],
    'oarfish'
  ),
  sp(
    'hagfish-rule',
    [
      { pred: 'is-deep-sea-fish', args: ['?x'], degVar: '?d1' },
      { pred: 'produces-slime', args: ['?x'], degVar: '?d2' },
    ],
    'hagfish'
  ),
  sp(
    'lamprey-rule',
    [
      { pred: 'is-fish', args: ['?x'], degVar: '?d1' },
      { pred: 'is-parasite', args: ['?x'], degVar: '?d2' },
    ],
    'lamprey'
  ),
  sp(
    'arapaima-rule',
    [
      { pred: 'is-freshwater-fish', args: ['?x'], degVar: '?d1' },
      { pred: 'is-large', args: ['?x'], degVar: '?d2' },
      { pred: 'lives-in-jungle', args: ['?x'], degVar: '?d3' },
    ],
    'arapaima'
  ),
  sp(
    'triggerfish-rule',
    [
      { pred: 'is-reef-fish', args: ['?x'], degVar: '?d1' },
      { pred: 'has-strong-jaws', args: ['?x'], degVar: '?d2' },
    ],
    'triggerfish'
  ),
  sp(
    'wrasse-rule',
    [
      { pred: 'is-reef-fish', args: ['?x'], degVar: '?d1' },
      { pred: 'is-cleaner', args: ['?x'], degVar: '?d2' },
    ],
    'cleaner-wrasse'
  ),
  sp(
    'goby-rule',
    [
      { pred: 'is-reef-fish', args: ['?x'], degVar: '?d1' },
      { pred: 'is-small', args: ['?x'], degVar: '?d2' },
      { pred: 'lives-symbiotically', args: ['?x'], degVar: '?d3' },
    ],
    'goby'
  ),
  sp(
    'boxfish-rule',
    [
      { pred: 'is-reef-fish', args: ['?x'], degVar: '?d1' },
      { pred: 'has-boxy-shape', args: ['?x'], degVar: '?d2' },
    ],
    'boxfish'
  ),
  sp(
    'frogfish-rule',
    [
      { pred: 'is-fish', args: ['?x'], degVar: '?d1' },
      { pred: 'uses-camouflage', args: ['?x'], degVar: '?d2' },
      { pred: 'has-lure', args: ['?x'], degVar: '?d3' },
    ],
    'frogfish'
  ),

  // --- Extra mollusks ---
  sp(
    'abalone-rule',
    [
      { pred: 'is-gastropod', args: ['?x'], degVar: '?d1' },
      { pred: 'lives-in-ocean', args: ['?x'], degVar: '?d2' },
    ],
    'abalone'
  ),
  sp(
    'cone-snail-rule',
    [
      { pred: 'is-gastropod', args: ['?x'], degVar: '?d1' },
      { pred: 'is-venomous', args: ['?x'], degVar: '?d2' },
    ],
    'cone-snail'
  ),
  sp(
    'giant-clam-rule',
    [
      { pred: 'is-bivalve', args: ['?x'], degVar: '?d1' },
      { pred: 'is-large', args: ['?x'], degVar: '?d2' },
      { pred: 'lives-in-reef', args: ['?x'], degVar: '?d3' },
    ],
    'giant-clam'
  ),

  // --- Extra misc ---
  sp(
    'horseshoe-crab-rule',
    [
      { pred: 'is-aquatic', args: ['?x'], degVar: '?d1' },
      { pred: 'has-exoskeleton', args: ['?x'], degVar: '?d2' },
      { pred: 'has-blue-blood', args: ['?x'], degVar: '?d3' },
    ],
    'horseshoe-crab'
  ),
  sp(
    'planarian-rule',
    [
      { pred: 'is-aquatic', args: ['?x'], degVar: '?d1' },
      { pred: 'regenerates', args: ['?x'], degVar: '?d2' },
      { pred: 'is-small', args: ['?x'], degVar: '?d3' },
    ],
    'planarian'
  ),
  sp(
    'tardigrade-rule',
    [
      { pred: 'has-eight-legs', args: ['?x'], degVar: '?d1' },
      { pred: 'is-microscopic', args: ['?x'], degVar: '?d2' },
      { pred: 'survives-extreme-conditions', args: ['?x'], degVar: '?d3' },
    ],
    'tardigrade'
  ),
  sp(
    'nautilus-chambered-rule',
    [
      { pred: 'is-cephalopod', args: ['?x'], degVar: '?d1' },
      { pred: 'has-external-shell', args: ['?x'], degVar: '?d2' },
      { pred: 'has-many-tentacles', args: ['?x'], degVar: '?d3' },
    ],
    'chambered-nautilus'
  ),
  sp(
    'giant-pacific-octopus-rule',
    [
      { pred: 'species', args: ['?x', 'octopus'], degVar: '?d1' },
      { pred: 'is-large', args: ['?x'], degVar: '?d2' },
    ],
    'giant-pacific-octopus',
    35
  ),
  sp(
    'dumbo-octopus-rule',
    [
      { pred: 'species', args: ['?x', 'octopus'], degVar: '?d1' },
      { pred: 'lives-in-deep-sea', args: ['?x'], degVar: '?d2' },
    ],
    'dumbo-octopus',
    35
  ),
  sp(
    'colossal-squid-rule',
    [
      { pred: 'species', args: ['?x', 'squid'], degVar: '?d1' },
      { pred: 'lives-in-deep-sea', args: ['?x'], degVar: '?d2' },
      { pred: 'is-large', args: ['?x'], degVar: '?d3' },
    ],
    'colossal-squid',
    35
  ),
  sp(
    'snow-goose-rule',
    [
      { pred: 'species', args: ['?x', 'goose'], degVar: '?d1' },
      { pred: 'is-white', args: ['?x'], degVar: '?d2' },
    ],
    'snow-goose',
    35
  ),
  sp(
    'canada-goose-rule',
    [
      { pred: 'species', args: ['?x', 'goose'], degVar: '?d1' },
      { pred: 'has-black-neck', args: ['?x'], degVar: '?d2' },
    ],
    'canada-goose',
    35
  ),
];
