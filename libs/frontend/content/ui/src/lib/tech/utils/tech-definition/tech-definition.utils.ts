import { TECHS } from '@internal/content-web-ui/lib/tech/constants/techs.constants';
import type { TechDefinition } from '@internal/content-web-ui/lib/tech/models/tech-definition/tech-definition.interface';
import { techKey } from '@internal/content-web-ui/lib/tech/utils/tech-key/tech-key.utils';

/**
 * Function techDefinition
 *
 * @description
 * Resolves a catalogue entry through `techKey` (an alias shows its canonical entry), preserving an
 * unknown key as its display label.
 *
 * @returns {TechDefinition} Catalogue definition, or a label-only fallback for an unknown key.
 * @param {string} key - Technology catalogue key or alias; unknown keys are retained as their display label.
 */
export function techDefinition(key: string): TechDefinition {
  return TECHS[techKey(key)] ?? { label: key };
}
