import { lucideShare2 } from '@ng-icons/lucide';
import {
  simpleAngular,
  simpleCodeigniter,
  simpleDart,
  simpleDjango,
  simpleFlutter,
  simpleGit,
  simpleGithub,
  simpleNgrx,
  simplePhp,
  simpleReact,
  simpleSupabase,
  simpleSymfony,
  simpleTypescript,
  simpleVuedotjs,
  simpleWordpress,
} from '@ng-icons/simple-icons';
import type { TechDefinition } from '@internal/content-web-ui/lib/tech/models/tech-definition/tech-definition.interface';
import { techLogo } from '@internal/content-web-ui/lib/tech/utils/tech-logo/tech-logo.utils';

/**
 * Constant TECHS
 *
 * @description
 * Maps supported technology keys to their display labels and registered logo SVGs.
 * CI/CD uses a Lucide symbol because it has no single brand mark.
 *
 * @type {Readonly<Record<string, TechDefinition>>}
 */
export const TECHS: Readonly<Record<string, TechDefinition>> = {
  angular: { label: 'Angular', icon: techLogo(simpleAngular) },
  react: { label: 'React', icon: techLogo(simpleReact) },
  typescript: { label: 'TypeScript', icon: techLogo(simpleTypescript) },
  ngrx: { label: 'NgRx', icon: techLogo(simpleNgrx) },
  vue: { label: 'Vue.js', icon: techLogo(simpleVuedotjs) },
  django: { label: 'Django', icon: techLogo(simpleDjango) },
  symfony: { label: 'Symfony', icon: techLogo(simpleSymfony) },
  php: { label: 'PHP', icon: techLogo(simplePhp) },
  codeigniter: { label: 'CodeIgniter 4', icon: techLogo(simpleCodeigniter) },
  wordpress: { label: 'WordPress', icon: techLogo(simpleWordpress) },
  flutter: { label: 'Flutter', icon: techLogo(simpleFlutter) },
  dart: { label: 'Dart', icon: techLogo(simpleDart) },
  supabase: { label: 'Supabase', icon: techLogo(simpleSupabase) },
  git: { label: 'Git', icon: techLogo(simpleGit) },
  github: { label: 'GitHub', icon: techLogo(simpleGithub) },
  'ci-cd': { label: 'CI/CD', icon: lucideShare2 },
};
