import { Procedure, ProcedureRiskLevel } from '../../../core/models/procedure.model';
import { NX200_PENDING_APPLICABILITY } from '../claims/nx200-claims.data';

export const resource = (id: string, name: string) => ({ id, name });
export const warning = (id: string, text: string) => ({ id, text });
export const finalCheck = (id: string, label: string) => ({ id, label, required: true });

export function pendingEditorialMetadata(
  riskLevel: ProcedureRiskLevel,
  riskNote: string,
): Pick<
  Procedure,
  'riskLevel' | 'riskNote' | 'primarySourceIds' | 'applicability' | 'editorialRevision'
> {
  return {
    riskLevel,
    riskNote,
    primarySourceIds: ['nx200-owner-manual-pending', 'nx200-service-manual-pending'],
    applicability: NX200_PENDING_APPLICABILITY,
    editorialRevision: {
      version: 1,
      revisedAt: '2026-08-02',
      summary: 'Primeira versão com rastreabilidade editorial; conteúdo técnico ainda pendente.',
      status: 'demonstrative',
    },
  };
}
