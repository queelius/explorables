export interface TraitToggle {
  pred: string;
  label: string;
  active: boolean;
  deg: number;
}

export interface ControlsConfig {
  container: HTMLElement;
  traits: TraitToggle[];
  onChange: (traits: TraitToggle[]) => void;
  showRuleSlider?: boolean;
  onRuleTierChange?: (tier: number) => void;
  showStepControls?: boolean;
  onStep?: () => void;
  onPlay?: () => void;
  onReset?: () => void;
}

const RULE_TIERS: Array<{ count: number; label: string }> = [
  { count: 10, label: '10 (hand-crafted)' },
  { count: 25, label: '25 (expanded)' },
  { count: 100, label: '100 (LLM-curated)' },
  { count: 500, label: '500 (LLM-generated)' },
];

export class WidgetControls {
  private config: ControlsConfig;
  private traits: TraitToggle[];
  private selectedIndex: number = -1;

  constructor(config: ControlsConfig) {
    this.config = config;
    // Deep copy traits to avoid mutating caller's data
    this.traits = config.traits.map((t) => ({ ...t }));
    this.render();
  }

  getTraits(): TraitToggle[] {
    return this.traits.map((t) => ({ ...t }));
  }

  /** Replace the trait list (e.g. when the tier changes). Re-renders controls. */
  setTraits(traits: TraitToggle[]): void {
    this.traits = traits.map((t) => ({ ...t }));
    this.selectedIndex = -1;
    this.render();
  }

  render(): void {
    const container = this.config.container;
    clearChildren(container);

    const root = createElement('div', 'fuzzy-controls');

    // Trait toggles section
    root.appendChild(this.buildToggles());

    // Degree slider for selected trait
    if (this.selectedIndex >= 0 && this.traits[this.selectedIndex]?.active) {
      root.appendChild(this.buildDegreeSlider());
    }

    // Rule-count tier slider
    if (this.config.showRuleSlider) {
      root.appendChild(this.buildTierSlider());
    }

    // Step controls
    if (this.config.showStepControls) {
      root.appendChild(this.buildStepControls());
    }

    container.appendChild(root);
  }

  destroy(): void {
    clearChildren(this.config.container);
  }

  // --- Toggle section ---

  private buildToggles(): HTMLElement {
    const wrap = createElement('div', 'fuzzy-toggles');

    for (let i = 0; i < this.traits.length; i++) {
      const trait = this.traits[i];
      const row = createElement('div', trait.active ? 'fuzzy-toggle active' : 'fuzzy-toggle');

      // Checkbox
      const check = document.createElement('input');
      check.type = 'checkbox';
      check.checked = trait.active;
      check.className = 'fuzzy-toggle-check';
      check.addEventListener('change', () => {
        this.traits[i].active = check.checked;
        if (check.checked && this.selectedIndex !== i) {
          this.selectedIndex = i;
        } else if (!check.checked && this.selectedIndex === i) {
          this.selectedIndex = -1;
        }
        this.config.onChange(this.getTraits());
        this.render();
      });
      row.appendChild(check);

      // Label (clickable to select for slider)
      const label = createElement('span', 'fuzzy-toggle-label');
      label.textContent = trait.label;
      label.addEventListener('click', () => {
        if (trait.active) {
          this.selectedIndex = this.selectedIndex === i ? -1 : i;
          this.render();
        }
      });
      row.appendChild(label);

      // Degree display
      const deg = createElement('span', 'fuzzy-toggle-deg');
      deg.textContent = trait.active ? trait.deg.toFixed(2) : '\u2014';
      row.appendChild(deg);

      wrap.appendChild(row);
    }

    return wrap;
  }

  // --- Degree slider ---

  private buildDegreeSlider(): HTMLElement {
    const trait = this.traits[this.selectedIndex];
    const wrap = createElement('div', 'fuzzy-slider-wrap');

    const label = createElement('span', 'fuzzy-slider-label');
    label.textContent = `${trait.label}: ${trait.deg.toFixed(2)}`;
    wrap.appendChild(label);

    const slider = document.createElement('input');
    slider.type = 'range';
    slider.className = 'fuzzy-slider';
    slider.min = '0';
    slider.max = '1';
    slider.step = '0.01';
    slider.value = String(trait.deg);
    slider.addEventListener('input', () => {
      const val = parseFloat(slider.value);
      if (!isFinite(val)) return;
      this.traits[this.selectedIndex].deg = val;
      label.textContent = `${trait.label}: ${val.toFixed(2)}`;
      // Update the degree display in the toggle row
      const degSpans = this.config.container.querySelectorAll('.fuzzy-toggle-deg');
      const span = degSpans[this.selectedIndex];
      if (span) span.textContent = val.toFixed(2);
      this.config.onChange(this.getTraits());
    });
    wrap.appendChild(slider);

    return wrap;
  }

  // --- Rule tier slider ---

  private buildTierSlider(): HTMLElement {
    const wrap = createElement('div', 'fuzzy-tier-wrap');

    const label = createElement('span', 'fuzzy-tier-label');
    label.textContent = RULE_TIERS[0].label;
    wrap.appendChild(label);

    const slider = document.createElement('input');
    slider.type = 'range';
    slider.className = 'fuzzy-tier-slider';
    slider.min = '0';
    slider.max = String(RULE_TIERS.length - 1);
    slider.step = '1';
    slider.value = '0';
    slider.addEventListener('input', () => {
      const idx = parseInt(slider.value, 10);
      if (idx < 0 || idx >= RULE_TIERS.length) return;
      label.textContent = RULE_TIERS[idx].label;
      this.config.onRuleTierChange?.(idx);
    });
    wrap.appendChild(slider);

    return wrap;
  }

  // --- Step controls ---

  private buildStepControls(): HTMLElement {
    const wrap = createElement('div', 'fuzzy-step-controls');

    const resetBtn = createElement('button', 'fuzzy-btn');
    resetBtn.textContent = 'Reset';
    resetBtn.addEventListener('click', () => this.config.onReset?.());
    wrap.appendChild(resetBtn);

    const stepBtn = createElement('button', 'fuzzy-btn');
    stepBtn.textContent = 'Step';
    stepBtn.addEventListener('click', () => this.config.onStep?.());
    wrap.appendChild(stepBtn);

    const playBtn = createElement('button', 'fuzzy-btn fuzzy-btn-primary');
    playBtn.textContent = 'Play';
    playBtn.addEventListener('click', () => this.config.onPlay?.());
    wrap.appendChild(playBtn);

    return wrap;
  }
}

// --- DOM helpers (safe, no innerHTML) ---

function createElement(tag: string, className: string): HTMLElement {
  const el = document.createElement(tag);
  el.className = className;
  return el;
}

function clearChildren(el: HTMLElement): void {
  while (el.firstChild) el.removeChild(el.firstChild);
}
