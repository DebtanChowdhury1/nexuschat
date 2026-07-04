jest.mock('../lib/env', () => ({
  env: { TAVILY_API_KEY: 'test-tavily-key' },
}));

import { buildSearchQuery, shouldSearchWeb } from '../lib/webSearch';

describe('shouldSearchWeb', () => {
  it('triggers on time-relative phrases', () => {
    expect(shouldSearchWeb("what's the weather today")).toBe(true);
    expect(shouldSearchWeb('give me the latest news on this')).toBe(true);
    expect(shouldSearchWeb('current stock price of Apple')).toBe(true);
    expect(shouldSearchWeb('who won the game right now')).toBe(true);
  });

  it('does not trigger on general knowledge questions', () => {
    expect(shouldSearchWeb('what is photosynthesis')).toBe(false);
    expect(shouldSearchWeb('write a poem about the ocean')).toBe(false);
    expect(shouldSearchWeb('explain how binary search works')).toBe(false);
  });
});

describe('shouldSearchWeb follow-up inheritance', () => {
  it('inherits the need for search from a live-data-shaped prior turn', () => {
    expect(shouldSearchWeb('tomorrow?', ['what is the weather today'])).toBe(true);
    expect(shouldSearchWeb('and next week', ['what is the weather today'])).toBe(true);
    expect(shouldSearchWeb('what about London', ['current weather in Paris'])).toBe(true);
  });

  it('does not inherit from a prior turn that never needed live data', () => {
    expect(shouldSearchWeb('tomorrow?', ['what is photosynthesis'])).toBe(false);
    expect(shouldSearchWeb('tomorrow?', [])).toBe(false);
  });

  it('a long, self-contained follow-up still needs its own trigger phrase', () => {
    expect(
      shouldSearchWeb('can you explain how that process generally works in more detail', [
        'what is the weather today',
      ])
    ).toBe(false);
  });
});

describe('buildSearchQuery', () => {
  it('resolves a short follow-up against its predecessor topic', () => {
    const query = buildSearchQuery('tomorrow?', ['what is the weather today']);
    expect(query).toContain('what is the weather today');
    expect(query).toContain('tomorrow?');
  });

  it('leaves a standalone, self-contained question untouched', () => {
    const query = buildSearchQuery('what is the latest news about SpaceX', ['what is the weather today']);
    expect(query).toBe('what is the latest news about SpaceX');
  });

  it('leaves a fresh first message untouched when there is no prior turn', () => {
    expect(buildSearchQuery('tomorrow?', [])).toBe('tomorrow?');
  });
});

describe('shouldSearchWeb without a configured key', () => {
  it('never triggers when TAVILY_API_KEY is empty', () => {
    jest.resetModules();
    jest.doMock('../lib/env', () => ({ env: { TAVILY_API_KEY: '' } }));
    const { shouldSearchWeb: shouldSearchWebNoKey } = require('../lib/webSearch');
    expect(shouldSearchWebNoKey('what is the latest news today')).toBe(false);
  });
});
