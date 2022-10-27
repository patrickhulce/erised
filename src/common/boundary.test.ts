import {determineBoundaries} from './boundary';

describe(determineBoundaries, () => {
  it('splits manual boundaries', () => {
    const boundaries = determineBoundaries(['foo/', 'bar'], ['foo/a.js', 'foo/b.js', 'bar/c.js']);
    expect(boundaries).toEqual([
      {boundary: 'bar', changedFiles: ['bar/c.js']},
      {boundary: 'foo', changedFiles: ['foo/a.js', 'foo/b.js']},
    ]);
  });

  it('splits * boundaries', () => {
    const boundaries = determineBoundaries(
      ['packages/*'],
      ['packages/foo/a.js', 'packages/foo/b.js', 'packages/bar/c.js'],
    );

    expect(boundaries).toEqual([
      {boundary: 'packages/bar', changedFiles: ['packages/bar/c.js']},
      {boundary: 'packages/foo', changedFiles: ['packages/foo/a.js', 'packages/foo/b.js']},
    ]);
  });

  it('uses a fallback', () => {
    const boundaries = determineBoundaries(['unmatched/'], ['foo/a.js', 'foo/b.js', 'bar/c.js']);
    expect(boundaries).toEqual([
      {boundary: '*', changedFiles: ['foo/a.js', 'foo/b.js', 'bar/c.js']},
    ]);
  });
});
