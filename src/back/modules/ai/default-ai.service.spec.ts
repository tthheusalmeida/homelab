import { BadRequestException } from '@nestjs/common';

import type { AiPreference, AiProviderId } from '../../../shared/contracts/ai';
import type { BackConfig } from '../../config/back-config';

import type { AIService } from './ai.service';
import { DefaultAiMessages, DefaultAiService } from './default-ai.service';

const CHEAPEST: Partial<Record<AiProviderId, string>> = {
  gemini: 'gemini-barato',
  anthropic: 'claude-barato',
};

describe('DefaultAiService', () => {
  const build = (
    configured: AiPreference | null = null,
    keys: Partial<Record<AiProviderId, string | null>> = { gemini: 'k', anthropic: 'k' },
  ) => {
    const ai = { cheapestModel: (provider: AiProviderId) => CHEAPEST[provider] };
    const config = {
      defaultAi: jest.fn(() => configured),
      apiKeyFor: (provider: AiProviderId) => keys[provider] ?? null,
    };

    return new DefaultAiService(ai as unknown as AIService, config as unknown as BackConfig);
  };

  describe('without a saved default or a session switch', () => {
    it('when the first external service has a key, should use its cheapest model', () => {
      expect(build().resolve()).toEqual({ providerId: 'gemini', modelId: 'gemini-barato' });
    });

    it('when only a later service has a key, should use that one', () => {
      expect(build(null, { gemini: null, anthropic: 'k' }).resolve()).toEqual({
        providerId: 'anthropic',
        modelId: 'claude-barato',
      });
    });

    it('when no service has a key, should fall back to the first one so the error explains the missing key', () => {
      expect(build(null, {}).resolve().providerId).toBe('gemini');
    });

    it('when the state is read, should say the source is automatic', () => {
      expect(build().state()).toEqual({
        configured: null,
        session: null,
        effective: { providerId: 'gemini', modelId: 'gemini-barato', source: 'auto' },
      });
    });
  });

  describe('with a saved default', () => {
    it('when the default has a model, should use it', () => {
      const service = build({ providerId: 'anthropic', modelId: 'claude-x' });

      expect(service.resolve()).toEqual({ providerId: 'anthropic', modelId: 'claude-x' });
      expect(service.state().effective.source).toBe('default');
    });

    it('when the default has no model, should use the cheapest of its provider', () => {
      expect(build({ providerId: 'anthropic', modelId: null }).resolve()).toEqual({
        providerId: 'anthropic',
        modelId: 'claude-barato',
      });
    });

    it('when the default is read every time, should follow a change made in Settings', () => {
      let configured: AiPreference | null = null;
      const service = new DefaultAiService(
        { cheapestModel: (provider: AiProviderId) => CHEAPEST[provider] } as unknown as AIService,
        { defaultAi: () => configured, apiKeyFor: () => 'k' } as unknown as BackConfig,
      );

      expect(service.resolve().providerId).toBe('gemini');

      configured = { providerId: 'anthropic', modelId: null };

      expect(service.resolve().providerId).toBe('anthropic');
    });
  });

  describe('with a switch for this session', () => {
    it('when a session switch is set, should win over the saved default and say so', () => {
      const service = build({ providerId: 'gemini', modelId: 'gemini-x' });

      const state = service.setSession({ providerId: 'anthropic', modelId: 'claude-y' });

      expect(state.session).toEqual({ providerId: 'anthropic', modelId: 'claude-y' });
      expect(state.configured).toEqual({ providerId: 'gemini', modelId: 'gemini-x' });
      expect(state.effective).toEqual({
        providerId: 'anthropic',
        modelId: 'claude-y',
        source: 'session',
      });
    });

    it('when the session switch is cleared, should go back to the saved default', () => {
      const service = build({ providerId: 'gemini', modelId: 'gemini-x' });
      service.setSession({ providerId: 'anthropic', modelId: null });

      const state = service.setSession(null);

      expect(state.session).toBeNull();
      expect(state.effective).toEqual({
        providerId: 'gemini',
        modelId: 'gemini-x',
        source: 'default',
      });
    });

    it('when the session has no model, should use the cheapest of the session provider', () => {
      const service = build({ providerId: 'gemini', modelId: 'gemini-x' });

      expect(service.setSession({ providerId: 'anthropic', modelId: null }).effective.modelId).toBe(
        'claude-barato',
      );
    });

    it('when a new instance starts, should have no switch (it lives only while the app is open)', () => {
      build().setSession({ providerId: 'anthropic', modelId: null });

      expect(build().state().session).toBeNull();
    });
  });

  describe('with an explicit choice', () => {
    it('when only a model is given, should keep the provider in use and use that model', () => {
      const service = build({ providerId: 'anthropic', modelId: null });

      expect(service.resolve({ modelId: ' claude-z ' })).toEqual({
        providerId: 'anthropic',
        modelId: 'claude-z',
      });
    });

    it('when a provider is given, should win over the default and use its cheapest model', () => {
      const service = build({ providerId: 'anthropic', modelId: 'claude-x' });

      expect(service.resolve({ providerId: 'gemini' })).toEqual({
        providerId: 'gemini',
        modelId: 'gemini-barato',
      });
    });

    it('when a blank model is given, should ignore it', () => {
      expect(build().resolve({ modelId: '   ' }).modelId).toBe('gemini-barato');
    });
  });

  describe('when the provider has no automatic model', () => {
    it('when the default is Ollama without a model, should ask to choose one', () => {
      const service = build({ providerId: 'ollama', modelId: null });

      expect(() => service.resolve()).toThrow(BadRequestException);
      expect(() => service.resolve()).toThrow(DefaultAiMessages.noModel);
    });

    it('when the default is Ollama with a model, should use it', () => {
      expect(build({ providerId: 'ollama', modelId: 'llama3' }).resolve()).toEqual({
        providerId: 'ollama',
        modelId: 'llama3',
      });
    });
  });
});
