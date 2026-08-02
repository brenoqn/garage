import { Procedure, ProcedureRiskLevel } from '../../../core/models/procedure.model';
import {
  NX200_1997_APPLICABILITY,
  NX200_OWNER_MANUAL_SOURCE_ID,
} from '../claims/nx200-claims.data';

export const resource = (id: string, name: string) => ({ id, name });
export const warning = (id: string, text: string) => ({ id, text });
export const finalCheck = (id: string, label: string) => ({ id, label, required: true });

export function transcribedEditorialMetadata(
  riskLevel: ProcedureRiskLevel,
  riskNote: string,
): Pick<
  Procedure,
  'riskLevel' | 'riskNote' | 'primarySourceIds' | 'applicability' | 'editorialRevision'
> {
  return {
    riskLevel,
    riskNote,
    primarySourceIds: [NX200_OWNER_MANUAL_SOURCE_ID, 'nx200-service-manual-pending'],
    applicability: NX200_1997_APPLICABILITY,
    editorialRevision: {
      version: 2,
      revisedAt: '2026-08-02',
      summary:
        'Procedimento básico alinhado ao manual do proprietário aplicável; revisão técnica da transcrição pendente.',
      status: 'transcribed',
    },
  };
}
