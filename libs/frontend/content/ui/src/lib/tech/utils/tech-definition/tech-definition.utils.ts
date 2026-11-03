import { TECHS } from '@internal/content-web-ui/lib/tech/constants/techs.constants';
import type { TechDefinition } from '@internal/content-web-ui/lib/tech/models/tech-definition/tech-definition.interface';

/**
 * Function techDefinition
 *
 * @description
 * Resolves a catalogue entry, preserving an unknown key as its display label without an icon.
 *
 * @returns {TechDefinition} Catalogue definition, or a label-only fallback for an unknown key.
 * @param {string} key - Technology catalogue key; unknown keys are retained as their display label.
 */
export function techDefinition(key: string): TechDefinition {
  return TECHS[key] ?? { label: key };
}
