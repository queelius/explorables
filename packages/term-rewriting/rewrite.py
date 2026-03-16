#!/usr/bin/env python3
"""Complete symbolic differentiator. Engine + rules + demo."""

# === Engine (20 lines) ===

class _W:
    def __repr__(self): return '_'
_ = _W()

def rewrite(t, *rules):
    while True:
        for r in rules:
            n = r(t)
            if n != t: t = n; break
        else: return t

def bottom_up(rule):
    def go(t):
        if isinstance(t, tuple) and t:
            t = (t[0],) + tuple(go(c) for c in t[1:])
        return rule(t)
    return go

class when:
    def __init__(self, *pat):
        self.pat, self.fn = pat, None

    def then(self, f):
        self.fn = f if callable(f) else (lambda *_, v=f: v)
        return self

    def __call__(self, t):
        b = self._m(self.pat, t)
        if b is not None and self.fn:
            return self.fn(*b.values())
        return t

    def _m(self, p, t, b=None):
        if b is None: b = {}
        if callable(p) and not isinstance(p, type):
            if not p(t): return None
            b[f'_{len(b)}'] = t; return b
        if p is _:
            b[f'_{len(b)}'] = t; return b
        if isinstance(p, str) and p.startswith('$'):
            if p in b: return b if b[p] == t else None
            b[p] = t; return b
        if p == t: return b
        if isinstance(p, tuple) and isinstance(t, tuple) and len(p) == len(t):
            for pe, te in zip(p, t):
                if self._m(pe, te, b) is None: return None
            return b
        return None

# === Predicates ===

is_lit = lambda x: isinstance(x, (int, float))

def const_wrt(var):
    def check(e):
        if e == var: return False
        if isinstance(e, tuple): return all(check(s) for s in e[1:])
        return True
    return check

# === Rules ===

simplify = [
    when('+', 0, _).then(lambda x: x),
    when('+', _, 0).then(lambda x: x),
    when('*', 0, _).then(0),
    when('*', _, 0).then(0),
    when('*', 1, _).then(lambda x: x),
    when('*', _, 1).then(lambda x: x),
    when('^', _, 0).then(1),
    when('^', _, 1).then(lambda x: x),
    when('+', is_lit, is_lit).then(lambda a, b: a + b),
    when('-', is_lit, is_lit).then(lambda a, b: a - b),
    when('*', is_lit, is_lit).then(lambda a, b: a * b),
]

diff = [
    when('d', const_wrt('x'), 'x').then(0),
    when('d', 'x', 'x').then(1),
    when('d', ('+', _, _), '$v').then(lambda u, w, v: ('+', ('d', u, v), ('d', w, v))),
    when('d', ('-', _, _), '$v').then(lambda u, w, v: ('-', ('d', u, v), ('d', w, v))),
    when('d', ('*', _, _), '$v').then(lambda u, w, v: ('+', ('*', u, ('d', w, v)), ('*', w, ('d', u, v)))),
    when('d', ('^', 'x', is_lit), 'x').then(lambda n: ('*', n, ('^', 'x', n - 1))),
    when('d', ('^', _, is_lit), '$v').then(lambda u, n, v: ('*', ('*', n, ('^', u, n - 1)), ('d', u, v))),
    when('d', ('sin', 'x'), 'x').then(('cos', 'x')),
    when('d', ('sin', _), '$v').then(lambda u, v: ('*', ('cos', u), ('d', u, v))),
    when('d', ('cos', 'x'), 'x').then(('-', 0, ('sin', 'x'))),
    when('d', ('cos', _), '$v').then(lambda u, v: ('*', ('-', 0, ('sin', u)), ('d', u, v))),
    when('d', ('exp', 'x'), 'x').then(('exp', 'x')),
    when('d', ('exp', _), '$v').then(lambda u, v: ('*', ('exp', u), ('d', u, v))),
    when('d', ('ln', 'x'), 'x').then(('/', 1, 'x')),
    when('d', ('/', _, _), '$v').then(
        lambda u, w, v: ('/', ('-', ('*', w, ('d', u, v)), ('*', u, ('d', w, v))), ('^', w, 2))),
]

rules = [bottom_up(r) for r in diff + simplify]

# === Demo ===

tests = [
    ('x^3',           ('^', 'x', 3)),
    ('x^2 * sin(x)',  ('*', ('^', 'x', 2), ('sin', 'x'))),
    ('sin(x^2)',      ('sin', ('^', 'x', 2))),
    ('e^(x^2)',       ('exp', ('^', 'x', 2))),
]

for name, expr in tests:
    result = rewrite(('d', expr, 'x'), *rules)
    print(f"d/dx {name:16} = {result}")
