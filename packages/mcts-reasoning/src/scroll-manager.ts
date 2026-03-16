import type { TreeRenderer } from './tree-renderer';
import type { TraceData } from './trace-data';

export class ScrollStateManager {
  renderer: TreeRenderer;
  data: TraceData;
  currentSection: string | null;
  pendingAnimation: number | null;

  constructor(treeRenderer: TreeRenderer, traceData: TraceData) {
    this.renderer = treeRenderer;
    this.data = traceData;
    this.currentSection = null;
    this.pendingAnimation = null;
  }

  init(): void {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const sectionId = (entry.target as HTMLElement).dataset.section;
            if (sectionId && sectionId !== this.currentSection) {
              this.onSectionEnter(sectionId);
            }
          }
        });
      },
      { threshold: 0.3 },
    );

    document
      .querySelectorAll('section[data-section]')
      .forEach((el) => observer.observe(el));
  }

  onSectionEnter(sectionId: string): void {
    if (this.pendingAnimation) {
      cancelAnimationFrame(this.pendingAnimation);
      this.pendingAnimation = null;
    }
    this.currentSection = sectionId;
    this.transitionTo(sectionId);
  }

  /**
   * Find a simulation phase by step number and phase name.
   */
  private _findPhase(step: number, phase: string) {
    return this.data.simulations.find(
      (s) => s.step === step && s.phase === phase,
    );
  }

  transitionTo(sectionId: string): void {
    const nodeDetail = document.getElementById('node-detail');

    switch (sectionId) {
      case '1':
        // Hide tree, show narrative only
        this.renderer.svg.style.opacity = '0';
        if (nodeDetail) nodeDetail.textContent = '';
        break;

      case '2': {
        // Show tree from sim 5 backprop (step 5, fully scored)
        this.renderer.svg.style.opacity = '1';
        const phase = this._findPhase(5, 'backprop');
        if (phase) {
          this.renderer.render(phase.tree);
        }
        break;
      }

      case '3': {
        // Show tree at sim 6 expand - highlight newly expanded node
        const phase = this._findPhase(6, 'expand');
        if (phase) {
          this.renderer.render(phase.tree);
          if (phase.new_node_id) {
            setTimeout(() => this.renderer.pulseNode(phase.new_node_id!), 300);
          }
        }
        break;
      }

      case '4': {
        // Show tree at sim 6 rollout
        const phase = this._findPhase(6, 'rollout');
        if (phase) {
          this.renderer.render(phase.tree);
        }
        break;
      }

      case '4.5': {
        // Same tree, but show score on terminal node
        const phase = this._findPhase(6, 'backprop');
        if (phase) {
          this.renderer.render(phase.tree);
          if (phase.backprop_path && phase.backprop_path.length > 0) {
            const terminalId = phase.backprop_path[0];
            this.renderer.updateNode(terminalId, { stroke: '#e94560' });
          }
        }
        break;
      }

      case '5': {
        // Backprop will be controlled by stepper
        const phase = this._findPhase(6, 'backprop');
        if (phase) {
          this.renderer.render(phase.tree);
        }
        break;
      }

      case '6': {
        // Full tree (last simulation)
        const finalTree =
          this.data.simulations[this.data.simulations.length - 1].tree;
        this.renderer.svg.style.opacity = '1';
        this.renderer.render(finalTree);
        // Trigger sampling controls to update with the full tree
        const activeBtn = document.querySelector(
          '.strategy-btn[data-strategy].active',
        ) as HTMLElement | null;
        activeBtn?.click();
        break;
      }

      case '7': {
        // Clear tree for sandbox
        while (this.renderer.svg.firstChild) {
          this.renderer.svg.removeChild(this.renderer.svg.firstChild);
        }
        break;
      }
    }
  }
}
