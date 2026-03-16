import { Automaton, DFA, SimState } from './types';
import { sortedStates, nfaToDfa } from './automata';
import { parseRegex, validateRegex } from './parser';
import { layoutGraph } from './layout';
import { renderGraph } from './renderer';
import { initSim, stepSim, isAccepted } from './simulator';

let curNfa: Automaton | null = null;
let curDfa: DFA | null = null;
let curTab: 'nfa' | 'dfa' = 'nfa';
let nfaLayout: Record<string, { x: number; y: number }> | null = null;
let dfaLayout: Record<string, { x: number; y: number }> | null = null;
let sim: SimState | null = null;

export function init(): void {
  const elRegex = document.getElementById('sim-regex') as HTMLInputElement;
  const elInput = document.getElementById('sim-input') as HTMLInputElement;
  const elBuild = document.getElementById('sim-build')!;
  const elError = document.getElementById('sim-error')!;
  const elSvg = document.getElementById('sim-svg') as unknown as SVGElement;
  const elTape = document.getElementById('sim-tape')!;
  const elReset = document.getElementById('sim-reset') as HTMLButtonElement;
  const elStep = document.getElementById('sim-step') as HTMLButtonElement;
  const elPlay = document.getElementById('sim-play') as HTMLButtonElement;
  const elResult = document.getElementById('sim-result')!;
  const elTrace = document.getElementById('sim-trace')!;
  const elLegend = document.getElementById('sim-legend')!;
  const tabs = document.querySelectorAll('.sim-tab');

  function showError(msg: string | null) {
    elError.textContent = msg || '';
    elError.classList.toggle('visible', !!msg);
  }

  function getActive(): Set<string> {
    if (!sim) return new Set();
    if (curTab === 'nfa') return sim.nfaStates;
    if (sim.dfaState) return new Set([sim.dfaState]);
    return new Set();
  }

  function updateView() {
    const automaton = curTab === 'nfa' ? curNfa : curDfa;
    const layout = curTab === 'nfa' ? nfaLayout : dfaLayout;
    if (automaton && layout) {
      renderGraph(elSvg, automaton, layout, sim ? getActive() : new Set());
    }

    // Tape
    elTape.textContent = '';
    if (sim) {
      for (let i = 0; i < sim.input.length; i++) {
        const cell = document.createElement('div');
        cell.className = 'tape-cell';
        if (sim.step >= 0 && i < sim.step) cell.className += ' consumed';
        else if (sim.step >= 0 && i === sim.step) cell.className += ' current';
        cell.textContent = sim.input[i];
        elTape.appendChild(cell);
      }
    }

    // Trace
    elTrace.textContent = '';
    if (sim && sim.trace.length > 0) {
      elTrace.classList.add('visible');
      for (let ti = 0; ti < sim.trace.length; ti++) {
        const t = sim.trace[ti];
        const line = document.createElement('div');
        line.className = 'trace-line';
        if (ti === sim.trace.length - 1) line.className += ' current';
        if (t.sym) {
          const symSpan = document.createElement('span');
          symSpan.className = 'sym';
          symSpan.textContent = `'${t.sym}'`;
          line.appendChild(symSpan);
          line.appendChild(document.createTextNode(' \u2192 '));
        }
        line.appendChild(document.createTextNode(t.desc));
        elTrace.appendChild(line);
      }
      elTrace.scrollTop = elTrace.scrollHeight;
    } else {
      elTrace.classList.remove('visible');
    }

    // Result
    elResult.className = 'sim-result';
    elResult.textContent = '';
    if (sim) {
      const acc = isAccepted(sim, curTab);
      if (acc === true) { elResult.className = 'sim-result accept'; elResult.textContent = '\u2713 Accepted'; }
      else if (acc === false) { elResult.className = 'sim-result reject'; elResult.textContent = '\u2717 Rejected'; }
    }

    // Buttons
    const canStep = !!sim && sim.step < sim.input.length - 1;
    elReset.disabled = !sim;
    elStep.disabled = !canStep;
    elPlay.disabled = !canStep;

    // Legend (DFA tab)
    elLegend.textContent = '';
    if (curTab === 'dfa' && curDfa?.stateMap) {
      const names = Object.keys(curDfa.stateMap).sort((a, b) =>
        (parseInt(a.replace(/\D/g, '')) || 0) - (parseInt(b.replace(/\D/g, '')) || 0)
      );
      names.forEach((n, i) => {
        if (i > 0) elLegend.appendChild(document.createTextNode(' \u00b7 '));
        const sp = document.createElement('span');
        sp.textContent = `${n} = {${sortedStates(curDfa!.stateMap![n])}}`;
        elLegend.appendChild(sp);
      });
      elLegend.classList.add('visible');
    } else {
      elLegend.classList.remove('visible');
    }
  }

  function build() {
    stopPlay();
    showError(null);
    const rx = elRegex.value.trim();
    const inp = elInput.value;

    if (rx.length > 20) { showError('Pattern too long (max 20 characters).'); return; }
    if (inp.length > 40) { showError('Input too long (max 40 characters).'); return; }

    const valErr = validateRegex(rx);
    if (valErr) { showError(valErr); return; }

    try { curNfa = parseRegex(rx); }
    catch (err) { showError('Invalid pattern: ' + (err instanceof Error ? err.message : err)); return; }

    for (const ch of inp) {
      if (!curNfa.alphabet.has(ch)) {
        showError(`Character '${ch}' not in alphabet {${sortedStates(curNfa.alphabet)}}.`);
        return;
      }
    }

    curDfa = nfaToDfa(curNfa);
    nfaLayout = layoutGraph(curNfa);
    dfaLayout = layoutGraph(curDfa);
    sim = initSim(curNfa, curDfa, inp);
    updateView();
  }

  function step() {
    if (!sim) return;
    stepSim(sim, curTab);
    updateView();
    if (sim.step >= sim.input.length - 1) stopPlay();
  }

  function stopPlay() {
    if (sim?.interval) { clearInterval(sim.interval); sim.interval = null; }
    if (sim) sim.playing = false;
    elPlay.textContent = 'Play';
    elPlay.classList.remove('playing');
  }

  function togglePlay() {
    if (!sim) return;
    if (sim.playing) { stopPlay(); return; }
    sim.playing = true;
    elPlay.textContent = 'Pause';
    elPlay.classList.add('playing');
    sim.interval = setInterval(() => {
      stepSim(sim!, curTab);
      updateView();
      if (sim!.step >= sim!.input.length - 1) stopPlay();
    }, 700);
  }

  function reset() {
    if (!curNfa || !curDfa) return;
    stopPlay();
    sim = initSim(curNfa, curDfa, elInput.value);
    updateView();
  }

  function switchTab(tab: 'nfa' | 'dfa') {
    curTab = tab;
    tabs.forEach(t => t.classList.toggle('active', t.getAttribute('data-tab') === tab));
    updateView();
  }

  // Wire events
  elBuild.addEventListener('click', build);
  elStep.addEventListener('click', step);
  elPlay.addEventListener('click', togglePlay);
  elReset.addEventListener('click', reset);
  elRegex.addEventListener('keydown', e => { if (e.key === 'Enter') build(); });
  elInput.addEventListener('keydown', e => { if (e.key === 'Enter') build(); });
  tabs.forEach(t => t.addEventListener('click', (ev) => {
    switchTab((ev.currentTarget as Element).getAttribute('data-tab') as 'nfa' | 'dfa');
  }));
  document.querySelectorAll('.sim-presets button').forEach(btn =>
    btn.addEventListener('click', (ev) => {
      const el = ev.currentTarget as Element;
      elRegex.value = el.getAttribute('data-regex')!;
      elInput.value = el.getAttribute('data-input')!;
      build();
    })
  );

  build();
}
