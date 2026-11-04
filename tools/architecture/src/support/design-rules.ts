import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, posix, relative, sep } from 'node:path';

/*
 * Design-system rules (D35, D37) checked on the source of every frontend component: colour utilities only
 * name Orbite tokens, no raw colour sits in a class, and text is centred only where it is justified.
 * Tailwind classes are literal strings, so reading the source covers every component and every variant.
 */

/**
 * Interface DesignViolation
 * @interface DesignViolation
 *
 * @description
 * One class or colour that breaks a design-system rule.
 */
export interface DesignViolation {
  // #region Properties
  /**
   * Property rule
   * @readonly
   *
   * @description
   * Stable identifier of the rule.
   *
   * @type {'palette-colour' | 'raw-colour' | 'ink-state' | 'centred-text'}
   */
  readonly rule: 'palette-colour' | 'raw-colour' | 'ink-state' | 'centred-text';

  /**
   * Property file
   * @readonly
   *
   * @description
   * Workspace-relative path of the offending file.
   *
   * @type {string}
   */
  readonly file: string;

  /**
   * Property token
   * @readonly
   *
   * @description
   * The offending class or colour.
   *
   * @type {string}
   */
  readonly token: string;
  // #endregion
}

/**
 * Constant COLOUR_UTILITIES
 *
 * @description
 * Tailwind utility prefixes that take a colour; the value after the prefix must be a token.
 */
const COLOUR_UTILITIES: RegExp =
  /^(?:bg|text|border(?:-[trblxyse])?|ring|ring-offset|inset-ring|outline|fill|stroke|decoration|accent|caret|divide|placeholder|from|via|to|shadow|inset-shadow)-(.+)$/;

/**
 * Constant TAILWIND_PALETTE
 *
 * @description
 * Tailwind's built-in colour names, neutral greys included: none of them belongs to the Orbite palette.
 */
const TAILWIND_PALETTE: RegExp =
  /^(?:black|white|slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose)(?:-\d{2,3})?$/;

/**
 * Constant KEYWORD_COLOURS
 *
 * @description
 * CSS keywords allowed as colours: they reuse a colour already resolved from a token.
 */
const KEYWORD_COLOURS: Set<string> = new Set(['current', 'transparent', 'inherit']);

/**
 * Constant INK_STATE
 *
 * @description
 * A faint ink background (`bg-fg/5`): hover, pressed and selected states take `surface-hover` and
 * `surface-selected` instead (D41), so that every state shares one tint.
 */
const INK_STATE: RegExp = /^!?bg-fg\/(?:[0-9]|1[0-2])(?:\.\d+)?!?$/;

/**
 * Constant RAW_COLOUR
 *
 * @description
 * A literal colour inside a Tailwind arbitrary value (`bg-[#fff]`, `text-[rgb(0_0_0)]`).
 */
const RAW_COLOUR: RegExp = /\[[^\]]*(?:#[0-9a-fA-F]{3,8}\b|rgba?\(|hsla?\(|oklch\(|oklab\()/;

/**
 * Function classTokens
 *
 * @description
 * Splits a source text into class-like tokens and strips their variants, important marks and opacity.
 *
 * @param {string} text - Source of a template, component or style file.
 *
 * @returns {{ raw: string; utility: string }[]} Each token as written and its bare utility.
 */
export function classTokens(text: string): { raw: string; utility: string }[] {
  return text
    .split(/[\s"'`]+/)
    .filter((raw: string): boolean => raw.length > 0 && raw.length < 200)
    .map((raw: string): { raw: string; utility: string } => {
      // Variants end at the last colon outside brackets (`hover:`, `@max-[640px]:`, `[&>a]:`).
      let depth: number = 0;
      let cut: number = -1;
      for (let i: number = 0; i < raw.length; i++) {
        if (raw[i] === '[') depth++;
        else if (raw[i] === ']') depth--;
        else if (raw[i] === ':' && depth === 0) cut = i;
      }
      const utility: string = raw
        .slice(cut + 1)
        .replace(/^!|!$/g, '')
        .replace(/\/[\d.]+$/, '');
      return { raw, utility };
    });
}

/**
 * Function themeColourTokens
 *
 * @description
 * Reads the colour tokens Tailwind exposes from the design tokens (`--color-<name>` in `@theme`).
 *
 * @param {string} themeCss - Content of `libs/frontend/design-tokens/src/theme.css`.
 *
 * @returns {ReadonlySet<string>} Token names usable after a colour utility prefix.
 */
export function themeColourTokens(themeCss: string): ReadonlySet<string> {
  return new Set(
    [...themeCss.matchAll(/--color-([a-z0-9-]+)\s*:/g)].map(
      (match: RegExpExecArray): string => match[1] ?? '',
    ),
  );
}

/**
 * Function colourViolations
 *
 * @description
 * Flags colour utilities that name a Tailwind palette colour instead of a token, raw colours in
 * arbitrary values and faint ink states that belong to `surface-hover` / `surface-selected` (D41).
 *
 * @param {string} file - Workspace-relative path, reported in the violations.
 * @param {string} text - Source of the file.
 * @param {ReadonlySet<string>} tokens - Colour tokens of the design system.
 *
 * @returns {DesignViolation[]} Violations found in the file.
 */
export function colourViolations(
  file: string,
  text: string,
  tokens: ReadonlySet<string>,
): DesignViolation[] {
  const violations: DesignViolation[] = [];
  for (const { raw, utility } of classTokens(text)) {
    const value: string | undefined = COLOUR_UTILITIES.exec(utility)?.[1];
    if (
      value &&
      !tokens.has(value) &&
      !KEYWORD_COLOURS.has(value) &&
      TAILWIND_PALETTE.test(value)
    ) {
      violations.push({ rule: 'palette-colour', file, token: raw });
    }
    if (/^[a-z-]+-\[/.test(utility) && RAW_COLOUR.test(utility)) {
      violations.push({ rule: 'raw-colour', file, token: raw });
    }
    if (INK_STATE.test(raw.slice(raw.lastIndexOf(':') + 1))) {
      violations.push({ rule: 'ink-state', file, token: raw });
    }
  }
  return violations;
}

/**
 * Function centredTextViolations
 *
 * @description
 * Flags `text-center` outside the files where centring is part of the component (D37).
 *
 * @param {string} file - Workspace-relative path.
 * @param {string} text - Source of the file.
 * @param {readonly string[]} allowed - Files allowed to centre text.
 *
 * @returns {DesignViolation[]} Violations found in the file.
 */
export function centredTextViolations(
  file: string,
  text: string,
  allowed: readonly string[],
): DesignViolation[] {
  if (allowed.includes(file)) return [];
  return classTokens(text)
    .filter(({ utility }: { raw: string; utility: string }): boolean => utility === 'text-center')
    .map(
      ({
        raw,
      }: {
        raw: string;
        utility: string;
      }): { rule: 'centred-text'; file: string; token: string } => ({
        rule: 'centred-text' as const,
        file,
        token: raw,
      }),
    );
}

/**
 * Function frontendSources
 *
 * @description
 * Lists the component, template and style sources of the web app and the frontend libraries, specs
 * excluded.
 *
 * @param {string} root - Repository root.
 *
 * @returns {{ file: string; text: string }[]} Workspace-relative path and content of each source.
 */
export function frontendSources(root: string): { file: string; text: string }[] {
  const out: { file: string; text: string }[] = [];
  const walk = (dir: string): void => {
    for (const name of readdirSync(dir)) {
      const path: string = join(dir, name);
      if (name === 'node_modules' || name === 'testing') continue;
      if (statSync(path).isDirectory()) walk(path);
      else if (/\.(ts|html|css)$/.test(name) && !name.endsWith('.spec.ts')) {
        out.push({
          file: relative(root, path).split(sep).join(posix.sep),
          text: readFileSync(path, 'utf8'),
        });
      }
    }
  };
  walk(join(root, 'libs', 'frontend'));
  walk(join(root, 'apps', 'web', 'src'));
  return out;
}
