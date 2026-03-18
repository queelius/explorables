import { describe, it, expect } from 'vitest';
import { lessons, COMPLETION_TEXT } from '../src/lessons';

describe('lesson definitions', () => {
  it('has 5 lessons', () => {
    expect(lessons).toHaveLength(5);
  });

  it('every lesson has intro, tasks, and philosophy', () => {
    for (const lesson of lessons) {
      expect(lesson.intro).toBeDefined();
      expect(lesson.intro.length).toBeGreaterThan(0);
      expect(lesson.tasks.length).toBeGreaterThan(0);
      expect(lesson.philosophy).toBeTruthy();
    }
  });

  it('every task has a prompt and validate function', () => {
    for (const lesson of lessons) {
      for (const task of lesson.tasks) {
        expect(task.prompt).toBeTruthy();
        expect(typeof task.validate).toBe('function');
      }
    }
  });

  it('completion text is non-empty', () => {
    expect(COMPLETION_TEXT.length).toBeGreaterThan(0);
  });
});

describe('lesson 1 validations', () => {
  const tasks = lessons[0].tasks;

  it('task 1: pwd output contains /home/user', () => {
    expect(tasks[0].validate('/home/user', '/home/user', false)).toBe(true);
    expect(tasks[0].validate('/root', '/root', false)).toBe(false);
  });

  it('task 2: ls output contains notes.txt', () => {
    expect(tasks[1].validate('notes.txt  projects', '/home/user', false)).toBe(true);
    expect(tasks[1].validate('bin  etc', '/home/user', false)).toBe(false);
  });

  it('task 3: cat output contains Welcome', () => {
    expect(tasks[2].validate('Welcome to the terminal!', '/home/user', false)).toBe(true);
    expect(tasks[2].validate('some other text', '/home/user', false)).toBe(false);
  });

  it('task 4: cwd is /home/user/projects', () => {
    expect(tasks[3].validate('', '/home/user/projects', false)).toBe(true);
    expect(tasks[3].validate('', '/home/user', false)).toBe(false);
  });

  it('task 5: ls shows README.md', () => {
    expect(tasks[4].validate('README.md  src  server.log', '/home/user/projects', false)).toBe(true);
    expect(tasks[4].validate('notes.txt', '/home/user', false)).toBe(false);
  });

  it('task 6: back to /home/user', () => {
    expect(tasks[5].validate('', '/home/user', false)).toBe(true);
    expect(tasks[5].validate('', '/home/user/projects', false)).toBe(false);
  });
});

describe('lesson 2 validations', () => {
  const tasks = lessons[1].tasks;

  it('task 1: mkdir journal uses fsExists (freeplay flag)', () => {
    // This task uses freeplay=true from engine fsExists check
    expect(tasks[0].validate('', '/home/user', true)).toBe(true);
    expect(tasks[0].validate('', '/home/user', false)).toBe(false);
  });

  it('task 2: cd journal checks cwd', () => {
    expect(tasks[1].validate('', '/home/user/journal', false)).toBe(true);
    expect(tasks[1].validate('', '/home/user', false)).toBe(false);
  });

  it('task 4: cat day1.txt contains Day 1', () => {
    expect(tasks[3].validate('Day 1: learned the terminal', '/home/user/journal', false)).toBe(true);
    expect(tasks[3].validate('something else', '/home/user/journal', false)).toBe(false);
  });
});

describe('lesson 5 validations', () => {
  const tasks = lessons[4].tasks;

  it('task 1: grep WARN output contains WARN', () => {
    expect(tasks[0].validate('2026-03-01 08:17:41 WARN  Slow query', '/', false)).toBe(true);
    expect(tasks[0].validate('2026-03-01 08:12:04 INFO  Server started', '/', false)).toBe(false);
  });

  it('task 2: wc -l output has a number', () => {
    expect(tasks[1].validate('3', '/', false)).toBe(true);
    expect(tasks[1].validate('', '/', false)).toBe(false);
  });

  it('task 4: freeplay always validates', () => {
    expect(tasks[3].validate('', '/', false)).toBe(true);
  });
});
