import { describe, expect, it } from 'vitest';

import { AI_PROVIDER_IDS } from '#shared/contracts/ai';
import { EXTERNAL_PROVIDER_IDS } from '#shared/contracts/providers';

import {
  AI_PROVIDER_LIST,
  AI_PROVIDER_PROFILES,
  AI_PROVIDERS_WITH_CONSOLE,
  profileOf,
  sendsOffDevice,
} from './ai-providers';

describe('AI provider profiles', () => {
  it('when listing the profiles, should have exactly one per provider id, in order', () => {
    expect(AI_PROVIDER_LIST.map((profile) => profile.id)).toEqual([...AI_PROVIDER_IDS]);
  });

  it.each(AI_PROVIDER_IDS)(
    'when the provider is %s, should have a profile keyed by its own id',
    (id) => {
      expect(AI_PROVIDER_PROFILES[id].id).toBe(id);
      expect(AI_PROVIDER_PROFILES[id].name).not.toBe('');
      expect(AI_PROVIDER_PROFILES[id].company).not.toBe('');
      expect(AI_PROVIDER_PROFILES[id].hint).not.toBe('');
    },
  );

  // Guarda de "plug and play": um provider externo novo só fica completo com tudo isto.
  it.each(EXTERNAL_PROVIDER_IDS)(
    'when the provider %s is external, should have a key guide, a console, a logo and a destination',
    (id) => {
      const profile = AI_PROVIDER_PROFILES[id];

      expect(profile.keyGuide?.steps.length).toBeGreaterThan(0);
      expect(profile.console?.usageUrl).toMatch(/^https:\/\//);
      expect(profile.console?.billingUrl).toMatch(/^https:\/\//);
      expect(profile.logo?.src).toBeTruthy();
      expect(profile.sentTo).toBeTruthy();
    },
  );

  it('when the provider is local (Ollama), should not send text off the device', () => {
    expect(AI_PROVIDER_PROFILES.ollama.sentTo).toBeUndefined();
    expect(sendsOffDevice('ollama')).toBe(false);
  });

  it('when the provider is in the cloud, should send text off the device', () => {
    expect(sendsOffDevice('gemini')).toBe(true);
    expect(sendsOffDevice('anthropic')).toBe(true);
  });

  it('when the id is unknown or missing, should have no profile and not send off device', () => {
    expect(profileOf('outra')).toBeUndefined();
    expect(profileOf(undefined)).toBeUndefined();
    expect(sendsOffDevice('outra')).toBe(false);
  });

  it('when listing the providers with a console, should keep only the cloud ones', () => {
    expect(AI_PROVIDERS_WITH_CONSOLE.map((profile) => profile.id)).toEqual([
      ...EXTERNAL_PROVIDER_IDS,
    ]);
  });
});
