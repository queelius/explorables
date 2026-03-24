import { mountOneThing } from './widgets/one-thing';
import { mountThePipe } from './widgets/the-pipe';
import { mountMoreThanOne } from './widgets/more-than-one';
import { mountProgramsData } from './widgets/programs-data';
import { mountSandbox } from './widgets/sandbox';

function init(): void {
  const s1 = document.getElementById('chop-one-thing');
  if (s1) mountOneThing(s1);
  const s2 = document.getElementById('chop-the-pipe');
  if (s2) mountThePipe(s2);
  const s3 = document.getElementById('chop-more-than-one');
  if (s3) mountMoreThanOne(s3);
  const s4 = document.getElementById('chop-programs-data');
  if (s4) mountProgramsData(s4);
  const s5 = document.getElementById('chop-sandbox');
  if (s5) mountSandbox(s5);
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
