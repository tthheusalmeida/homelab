import {
  CONTEXT_STEPS,
  REPLY_HEADROOM_TOKENS,
  chooseContextWindow,
  parseModelContextLimit,
} from './context-window';

const turns = (chars: number) => [{ role: 'user' as const, content: 'a'.repeat(chars) }];

describe('chooseContextWindow', () => {
  it('when the conversation is short, should use the smallest step', () => {
    expect(chooseContextWindow(turns(100), 0)).toBe(CONTEXT_STEPS[0]);
  });

  it('when the conversation plus the reply headroom does not fit a step, should move up to the next one', () => {
    const justOver = (CONTEXT_STEPS[0] - REPLY_HEADROOM_TOKENS + 1) * 4;

    expect(chooseContextWindow(turns(justOver), 0)).toBe(CONTEXT_STEPS[1]);
  });

  it('when the conversation fills a step exactly, should keep that step', () => {
    const exact = (CONTEXT_STEPS[1] - REPLY_HEADROOM_TOKENS) * 4;

    expect(chooseContextWindow(turns(exact), 0)).toBe(CONTEXT_STEPS[1]);
  });

  it('when the model limit is smaller than the chosen step, should never ask for more than the model supports', () => {
    expect(chooseContextWindow(turns((CONTEXT_STEPS[2] - 1000) * 4), 8192)).toBe(8192);
  });

  it('when the model limit is unknown (0), should use the step as is', () => {
    expect(chooseContextWindow(turns(100), 0)).toBe(4096);
  });

  it('when the conversation is bigger than the largest step, should use the largest step', () => {
    expect(chooseContextWindow(turns(10_000_000), 0)).toBe(CONTEXT_STEPS.at(-1));
  });

  it('when there are several turns, should count all of them', () => {
    const many = Array.from({ length: 10 }, () => ({
      role: 'user' as const,
      content: 'a'.repeat(4000),
    }));

    // 10 x 1000 tokens + 1024 de resposta = 11024 -> 16384
    expect(chooseContextWindow(many, 0)).toBe(16384);
  });
});

describe('parseModelContextLimit', () => {
  it('when /api/show has a context_length under the architecture key, should answer it', () => {
    expect(
      parseModelContextLimit({
        model_info: { 'general.architecture': 'llama', 'llama.context_length': 131072 },
      }),
    ).toBe(131072);
  });

  it('when the architecture changes, should still find the key by its suffix', () => {
    expect(parseModelContextLimit({ model_info: { 'qwen3.context_length': 40960 } })).toBe(40960);
  });

  it.each([
    ['without model_info', {}],
    ['with a non-object model_info', { model_info: 'x' }],
    ['with null', null],
    ['with a non-numeric value', { model_info: { 'llama.context_length': 'grande' } }],
    ['with a zero value', { model_info: { 'llama.context_length': 0 } }],
  ])('when the response comes %s, should answer 0 (unknown)', (_name, data) => {
    expect(parseModelContextLimit(data)).toBe(0);
  });
});
