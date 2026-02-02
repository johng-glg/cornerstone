import { useMutation } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { WorkflowEntityType, TransitionValidationResult } from '@/types/workflow';

export class TransitionBlockedError extends Error {
  blockMessage: string;
  ruleName: string | null;

  constructor(blockMessage: string, ruleName?: string | null) {
    super(blockMessage);
    this.name = 'TransitionBlockedError';
    this.blockMessage = blockMessage;
    this.ruleName = ruleName || null;
  }
}

export function useValidateTransition() {
  return useMutation({
    mutationFn: async ({
      entityType,
      entityId,
      fromStatus,
      toStatus,
    }: {
      entityType: WorkflowEntityType;
      entityId: string;
      fromStatus: string;
      toStatus: string;
    }): Promise<TransitionValidationResult> => {
      const { data, error } = await supabase.rpc('validate_status_transition', {
        _entity_type: entityType,
        _entity_id: entityId,
        _from_status: fromStatus,
        _to_status: toStatus,
      });

      if (error) throw error;

      // The RPC returns an array with one result
      const result = Array.isArray(data) ? data[0] : data;
      
      return {
        allowed: result?.allowed ?? true,
        block_message: result?.block_message ?? null,
        rule_name: result?.rule_name ?? null,
      };
    },
  });
}

// Helper hook that throws if transition is blocked
export function useValidateAndThrow() {
  const validateMutation = useValidateTransition();

  return {
    ...validateMutation,
    validateOrThrow: async (params: {
      entityType: WorkflowEntityType;
      entityId: string;
      fromStatus: string;
      toStatus: string;
    }) => {
      const result = await validateMutation.mutateAsync(params);
      if (!result.allowed) {
        throw new TransitionBlockedError(
          result.block_message || 'Transition blocked by workflow rule',
          result.rule_name
        );
      }
      return result;
    },
  };
}
