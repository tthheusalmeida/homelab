import { IpcChannels } from '../../shared/channels';
import { IpcError, IpcErrorCode } from '../../shared/errors';
import { IpcRegistrar } from '../ipc-registrar';
import { FakeIpcMain } from '../testing/fake-ipc-main';

import { AiHandler, type AiCatalog, type AiSelectionPort, type AiUsageSource } from './ai.handler';
import { HealthHandler } from './health.handler';

function register(...handlers: Parameters<IpcRegistrar['register']>[0]) {
  const ipc = new FakeIpcMain();
  new IpcRegistrar(ipc).register(handlers);

  return ipc;
}

const report = (service: string, status: 'ok' | 'error' = 'ok') => ({
  service,
  description: `desc ${service}`,
  checks: [{ service: 'api', description: 'API', status }],
});

describe('HealthHandler', () => {
  it('when health:system is called, should answer the system report', async () => {
    const system = { check: jest.fn().mockResolvedValue(report('system')) };
    const ai = { check: jest.fn() };
    const ipc = register(new HealthHandler(system, ai));

    await expect(ipc.invoke(IpcChannels.health.system)).resolves.toEqual({
      ok: true,
      data: report('system'),
    });
    expect(ai.check).not.toHaveBeenCalled();
  });

  it('when health:ai is called, should answer the ai report', async () => {
    const system = { check: jest.fn() };
    const ai = { check: jest.fn().mockResolvedValue(report('ai')) };
    const ipc = register(new HealthHandler(system, ai));

    await expect(ipc.invoke(IpcChannels.health.ai)).resolves.toEqual({
      ok: true,
      data: report('ai'),
    });
    expect(system.check).not.toHaveBeenCalled();
  });

  it('when one provider is down, should answer the report with that check as error and ok true', async () => {
    const down = {
      service: 'ai',
      description: 'IA',
      checks: [
        { service: 'ollama', description: 'Local', status: 'error' },
        { service: 'gemini', description: 'Nuvem', status: 'ok' },
      ],
    };
    const ipc = register(
      new HealthHandler({ check: jest.fn() }, { check: jest.fn().mockResolvedValue(down) }),
    );

    await expect(ipc.invoke(IpcChannels.health.ai)).resolves.toEqual({ ok: true, data: down });
  });

  it('when the check throws, should answer a failed envelope instead of rejecting', async () => {
    const ipc = register(
      new HealthHandler(
        { check: jest.fn().mockRejectedValue(new Error('falhou')) },
        { check: jest.fn() },
      ),
    );

    await expect(ipc.invoke(IpcChannels.health.system)).resolves.toEqual({
      ok: false,
      error: { code: 'INTERNAL', message: 'falhou' },
    });
  });
});

describe('AiHandler', () => {
  // Propriedades `jest.Mock` (não métodos) para poder conferir as chamadas sem `unbound-method`.
  const catalog = (): Record<keyof AiCatalog, jest.Mock> => ({
    providersList: jest.fn().mockReturnValue([{ id: 'gemini', label: 'Gemini' }]),
    models: jest.fn().mockResolvedValue([{ id: 'm1' }]),
    thinking: jest.fn().mockResolvedValue([{ id: 'low', label: 'Baixo' }]),
  });
  const selection = (): Record<keyof AiSelectionPort, jest.Mock> => ({
    state: jest.fn(),
    setSession: jest.fn(),
  });

  const usage = (): Record<keyof AiUsageSource, jest.Mock> => ({
    getUsage: jest.fn().mockReturnValue({ summary: { totalRequests: 0 } }),
  });

  it('when ai:providers is called, should answer the provider list', async () => {
    const ipc = register(new AiHandler(catalog(), usage(), selection()));

    await expect(ipc.invoke(IpcChannels.ai.providers)).resolves.toEqual({
      ok: true,
      data: [{ id: 'gemini', label: 'Gemini' }],
    });
  });

  it('when ai:models is called, should ask the catalog for the given provider', async () => {
    const source = catalog();
    const ipc = register(new AiHandler(source, usage(), selection()));

    await expect(ipc.invoke(IpcChannels.ai.models, { providerId: 'ollama' })).resolves.toEqual({
      ok: true,
      data: [{ id: 'm1' }],
    });
    expect(source.models).toHaveBeenCalledWith('ollama');
  });

  it('when ai:thinking is called, should pass provider and model to the catalog', async () => {
    const source = catalog();
    const ipc = register(new AiHandler(source, usage(), selection()));

    await expect(
      ipc.invoke(IpcChannels.ai.thinking, { providerId: 'ollama', modelId: 'qwen3:8b' }),
    ).resolves.toEqual({ ok: true, data: [{ id: 'low', label: 'Baixo' }] });
    expect(source.thinking).toHaveBeenCalledWith('ollama', 'qwen3:8b');
  });

  it('when ai:usage is called with a provider, should filter by it', async () => {
    const source = usage();
    const ipc = register(new AiHandler(catalog(), source, selection()));

    await ipc.invoke(IpcChannels.ai.usage, { provider: 'gemini' });

    expect(source.getUsage).toHaveBeenCalledWith('gemini');
  });

  it('when ai:usage is called without a provider, should ask for all providers', async () => {
    const source = usage();
    const ipc = register(new AiHandler(catalog(), source, selection()));

    await ipc.invoke(IpcChannels.ai.usage, {});

    expect(source.getUsage).toHaveBeenCalledWith(undefined);
  });

  it('when Gemini has no key, should answer NOT_CONFIGURED for models', async () => {
    const source = catalog();
    source.models.mockRejectedValue(
      new IpcError(IpcErrorCode.NOT_CONFIGURED, 'Chave da API do Gemini não configurada.'),
    );
    const ipc = register(new AiHandler(source, usage(), selection()));

    await expect(ipc.invoke(IpcChannels.ai.models, { providerId: 'gemini' })).resolves.toEqual({
      ok: false,
      error: { code: 'NOT_CONFIGURED', message: 'Chave da API do Gemini não configurada.' },
    });
  });

  it('when ai:selection is called, should answer the state of the AI in use', async () => {
    const state = {
      configured: null,
      session: null,
      effective: { providerId: 'gemini', modelId: 'm', source: 'auto' },
    };
    const port = selection();
    port.state.mockReturnValue(state);
    const ipc = register(new AiHandler(catalog(), usage(), port));

    await expect(ipc.invoke(IpcChannels.ai.selection)).resolves.toEqual({ ok: true, data: state });
  });

  it('when ai:session is called, should switch the AI for this session and answer the new state', async () => {
    const port = selection();
    port.setSession.mockReturnValue({ session: { providerId: 'anthropic', modelId: null } });
    const ipc = register(new AiHandler(catalog(), usage(), port));
    const preference = { providerId: 'anthropic' as const, modelId: null };

    await expect(ipc.invoke(IpcChannels.ai.session, { preference })).resolves.toMatchObject({
      ok: true,
    });
    expect(port.setSession).toHaveBeenCalledWith(preference);
  });

  it('when ai:session clears the switch, should pass null to the service', async () => {
    const port = selection();
    port.setSession.mockReturnValue({});
    const ipc = register(new AiHandler(catalog(), usage(), port));

    await ipc.invoke(IpcChannels.ai.session, { preference: null });

    expect(port.setSession).toHaveBeenCalledWith(null);
  });

  it('when the provider is not supported, should answer INTERNAL keeping the message', async () => {
    const source = catalog();
    source.thinking.mockRejectedValue(new Error('Provider de IA não suportado: x'));
    const ipc = register(new AiHandler(source, usage(), selection()));

    await expect(
      ipc.invoke(IpcChannels.ai.thinking, { providerId: 'x' as 'ollama', modelId: 'm' }),
    ).resolves.toEqual({
      ok: false,
      error: { code: 'INTERNAL', message: 'Provider de IA não suportado: x' },
    });
  });
});
