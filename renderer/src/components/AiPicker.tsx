import { useAiModels } from '../pages/ai/chat/hooks/useAiModels';
import { useAiProviders } from '../pages/ai/chat/hooks/useAiProviders';

import { AiInUseStrings } from '#lib/ai-in-use-text';
import { profileOf } from '#lib/ai-providers';
import type { AiPreference, AiProviderId } from '#shared/contracts/ai';

import { OptionSelect } from './OptionSelect';

const AUTO = 'auto';

interface AiPickerProps {
  /** A escolha atual; `null` = automática. */
  value: AiPreference | null;
  onChange: (preference: AiPreference | null) => void;
  /** Oferece "Automática" na lista de serviços (a IA padrão); a troca da sessão não precisa. */
  allowAuto?: boolean;
  disabled?: boolean;
}

/** A escolha está completa? Serviço sem modelo automático (Ollama) exige um modelo. */
export function isAiPreferenceComplete(value: AiPreference | null): boolean {
  return value === null || value.modelId !== null || Boolean(profileOf(value.providerId)?.sentTo);
}

/**
 * Seletor de serviço e modelo da IA, usado na IA padrão (Configurações) e na troca da sessão.
 * Serviços na nuvem oferecem "Mais barato (automático)"; o local (Ollama) pede um modelo.
 */
export function AiPicker({ value, onChange, allowAuto = false, disabled }: AiPickerProps) {
  const providers = useAiProviders();
  const providerId = value?.providerId;
  const models = useAiModels(providerId);
  const hasAutoModel = Boolean(profileOf(providerId)?.sentTo);

  const providerOptions = [
    ...(allowAuto ? [{ id: AUTO, label: AiInUseStrings.picker.auto }] : []),
    ...(providers.data ?? []).map((provider) => ({
      id: provider.id,
      label: profileOf(provider.id)?.name ?? provider.label,
    })),
  ];

  const modelOptions = [
    ...(hasAutoModel ? [{ id: AUTO, label: AiInUseStrings.picker.autoModel }] : []),
    ...(models.data ?? []).map((model) => ({ id: model.id, label: model.label })),
  ];

  return (
    <div className="flex flex-wrap items-center gap-2">
      <OptionSelect
        value={providerId ?? (allowAuto ? AUTO : undefined)}
        options={providerOptions}
        placeholder={AiInUseStrings.picker.provider}
        label={AiInUseStrings.picker.provider}
        triggerWidth="w-40"
        contentWidth="w-48"
        disabled={disabled || providers.isLoading}
        onValueChange={(next) => {
          if (!next || next === AUTO) {
            onChange(null);

            return;
          }

          onChange({ providerId: next as AiProviderId, modelId: null });
        }}
      />

      <OptionSelect
        value={value ? (value.modelId ?? (hasAutoModel ? AUTO : undefined)) : undefined}
        options={modelOptions}
        placeholder={AiInUseStrings.picker.model}
        label={AiInUseStrings.picker.model}
        triggerWidth="w-56"
        contentWidth="w-72"
        disabled={disabled || !value || models.isLoading}
        onValueChange={(next) => {
          if (value) {
            onChange({
              providerId: value.providerId,
              modelId: !next || next === AUTO ? null : next,
            });
          }
        }}
      />
    </div>
  );
}
