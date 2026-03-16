import { describe, it, expect } from 'vitest';
import { epsilonClosure, nfaMove, nfaToDfa } from '../src/automata';
import { parseRegex, validateRegex } from '../src/parser';

describe('parseRegex', () => {
  it('builds NFA for single character', () => {
    const nfa = parseRegex('a');
    expect(nfa.states.size).toBe(2);
    expect(nfa.alphabet.has('a')).toBe(true);
  });

  it('builds NFA for concatenation', () => {
    const nfa = parseRegex('ab');
    expect(nfa.alphabet.has('a')).toBe(true);
    expect(nfa.alphabet.has('b')).toBe(true);
  });

  it('builds NFA for union', () => {
    const nfa = parseRegex('a|b');
    expect(nfa.alphabet.size).toBe(2);
  });

  it('builds NFA for Kleene star', () => {
    const nfa = parseRegex('a*');
    // Star adds 2 wrapper states around the inner NFA
    expect(nfa.states.size).toBe(4);
  });
});

describe('NFA simulation', () => {
  function accepts(regex: string, input: string): boolean {
    const nfa = parseRegex(regex);
    let states = epsilonClosure(nfa, new Set([nfa.initial]));
    for (const ch of input) {
      states = epsilonClosure(nfa, nfaMove(nfa, states, ch));
    }
    return [...states].some(s => nfa.accepting.has(s));
  }

  it('(a|b)*abb accepts aabb', () => expect(accepts('(a|b)*abb', 'aabb')).toBe(true));
  it('(a|b)*abb rejects aab', () => expect(accepts('(a|b)*abb', 'aab')).toBe(false));
  it('a*b+ accepts aaabb', () => expect(accepts('a*b+', 'aaabb')).toBe(true));
  it('a*b+ rejects empty', () => expect(accepts('a*b+', '')).toBe(false));
  it('a*b+ accepts b', () => expect(accepts('a*b+', 'b')).toBe(true));
  it('(ab|cd)* accepts ababcd', () => expect(accepts('(ab|cd)*', 'ababcd')).toBe(true));
  it('(ab|cd)* accepts empty', () => expect(accepts('(ab|cd)*', '')).toBe(true));
  it('(ab|cd)* rejects abc', () => expect(accepts('(ab|cd)*', 'abc')).toBe(false));
  it('a(b|c)*d accepts abcbd', () => expect(accepts('a(b|c)*d', 'abcbd')).toBe(true));
  it('a(b|c)*d rejects abcb', () => expect(accepts('a(b|c)*d', 'abcb')).toBe(false));
  it('a? accepts empty', () => expect(accepts('a?', '')).toBe(true));
  it('a? accepts a', () => expect(accepts('a?', 'a')).toBe(true));
  it('a+ rejects empty', () => expect(accepts('a+', '')).toBe(false));
  it('a+ accepts aaa', () => expect(accepts('a+', 'aaa')).toBe(true));
});

describe('nfaToDfa', () => {
  it('produces correct DFA for (a|b)*abb', () => {
    const nfa = parseRegex('(a|b)*abb');
    const dfa = nfaToDfa(nfa);
    expect(dfa.states.size).toBe(5);
    expect(dfa.accepting.size).toBe(1);
    expect(dfa.stateMap).toBeDefined();
  });

  function dfaAccepts(regex: string, input: string): boolean {
    const dfa = nfaToDfa(parseRegex(regex));
    let state: string | null = dfa.initial;
    for (const ch of input) {
      state = dfa.transitions[state!]?.[ch]?.[0] ?? null;
      if (!state) return false;
    }
    return state !== null && dfa.accepting.has(state);
  }

  it('DFA matches NFA for (a|b)*abb', () => {
    expect(dfaAccepts('(a|b)*abb', 'aabb')).toBe(true);
    expect(dfaAccepts('(a|b)*abb', 'aab')).toBe(false);
  });

  it('DFA matches NFA for a*b+', () => {
    expect(dfaAccepts('a*b+', 'aaabb')).toBe(true);
    expect(dfaAccepts('a*b+', '')).toBe(false);
  });
});

describe('validateRegex', () => {
  it('accepts valid patterns', () => {
    expect(validateRegex('(a|b)*abb')).toBeNull();
    expect(validateRegex('a*b+')).toBeNull();
    expect(validateRegex('a')).toBeNull();
  });

  it('rejects unbalanced parens', () => {
    expect(validateRegex('(a')).toBe('Unmatched opening parenthesis.');
    expect(validateRegex('a)')).toBe('Unmatched closing parenthesis.');
  });

  it('rejects empty groups', () => {
    expect(validateRegex('()')).toBe('Empty group.');
  });

  it('rejects leading quantifier', () => {
    expect(validateRegex('*a')).toBe('Nothing to repeat.');
  });
});
