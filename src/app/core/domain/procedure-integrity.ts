import { Procedure } from '../models/procedure.model';

export interface ProcedureIntegrityIssue {
  readonly procedureSlug?: string;
  readonly message: string;
}

export function validateProcedureCatalog(
  procedures: readonly Procedure[],
): readonly ProcedureIntegrityIssue[] {
  const issues: ProcedureIntegrityIssue[] = [];
  const slugs = new Set<string>();

  for (const procedure of procedures) {
    if (!procedure.slug.trim()) {
      issues.push({ message: 'Procedimento com slug vazio.' });
    } else if (slugs.has(procedure.slug)) {
      issues.push({ procedureSlug: procedure.slug, message: 'Slug duplicado.' });
    }
    slugs.add(procedure.slug);

    const ids = [
      ...procedure.steps.map((step) => step.id),
      ...procedure.safetyWarnings.map((warning) => warning.id),
      ...procedure.finalChecks.map((check) => check.id),
      ...procedure.tools.map((tool) => tool.id),
      ...procedure.materials.map((material) => material.id),
    ];
    if (ids.some((id) => !id.trim())) {
      issues.push({ procedureSlug: procedure.slug, message: 'Identificador obrigatório vazio.' });
    }
    if (new Set(ids).size !== ids.length) {
      issues.push({ procedureSlug: procedure.slug, message: 'Identificador interno duplicado.' });
    }
  }
  return issues;
}
