import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { Linter } from 'eslint';
import tseslint from 'typescript-eslint';
import explicitTypes, { explicitTypeSyntax } from '../explicit-types.mjs';

/**
 * Lints one isolated TypeScript declaration without project-service or application side effects.
 *
 * @param {string} source - Positive or negative declaration fixture.
 * @returns {import('eslint').Linter.LintMessage[]} Rule diagnostics.
 */
function diagnostics(source) {
  return new Linter().verify(
    source,
    [
      {
        files: ['**/*.ts'],
        languageOptions: { parser: tseslint.parser },
        plugins: { portfolio: explicitTypes },
        rules: {
          'no-restricted-syntax': ['error', ...explicitTypeSyntax],
          'portfolio/explicit-declarations': 'error',
          'portfolio/explicit-inject': 'error',
        },
      },
    ],
    { filename: 'fixture.ts' },
  );
}

describe('explicit declaration contracts', () => {
  for (const source of [
    'const count: number = 0;',
    'const statuses = ["draft", "published"] as const;',
    'const state = { pending: false } satisfies { pending: boolean };',
    'const next = (value: number): number => value + 1;',
    'const next: (value: number) => number = value => value + 1;',
    'values.map(value => value.id);',
    'values.map(function (value) { return value.id; });',
    'const [first] = values;',
    'const { name } = item;',
    'for (const item of items) {}',
    'for (const key in item) {}',
    'class State { readonly count: number = 0; }',
    'class State { constructor(private readonly count: number = 0) {} }',
    'function next(value: number): number { return value + 1; }',
    'function next({ value }: Input): number { return value + 1; }',
    'const next: (value: number) => number = function (value) { return value + 1; };',
    'const state = { next(value: number = 0): number { return value + 1; } } satisfies State;',
    'function next(...values: number[]): number { return values.length; }',
    'import { signalStore as store } from "@ngrx/signals"; const State = store();',
    'import { cva } from "class-variance-authority"; const variants = cva("base", {});',
    'import { pgTable as table } from "drizzle-orm/pg-core"; const rows = table("rows", {});',
    'import { pgSchema } from "drizzle-orm/pg-core"; const schema: PgSchema<"content"> = pgSchema("content"); const rows = schema.table("rows", {});',
    'import * as z from "zod/mini"; const schema = z.string().check(z.minLength(1));',
    'import * as z from "zod"; const schema = z.string().optional().default("value");',
    'import { z } from "zod"; const schema = z.object({ name: z.string() });',
    'import { z } from "zod"; const schema = z.object({ name: z.string() }).refine(value => value.name.length > 0);',
    'import { object as shape } from "zod/mini"; const schema = shape({});',
    'import { inject } from "@angular/core"; const service: Service = inject<Service>(Service);',
    'import { inject as di } from "@angular/core"; const service: Service | null = di<Service>(TOKEN, { optional: true });',
    'import * as ng from "@angular/core"; const service: Service = ng.inject<Service>(Service);',
    'import { inject } from "@angular/core"; const value: string = inject<() => string>(TOKEN)();',
    'import { inject as di } from "@angular/core"; const value: string = di<() => string>(TOKEN)();',
    'import * as ng from "@angular/core"; const value: string = ng.inject<() => string>(TOKEN)();',
    'function inject(value: string): string { return value; } const value: string = inject("safe");',
    'import { inject } from "@angular/core"; function f(inject: () => Service): Service { return inject(); }',
    'import * as ng from "@angular/core"; function f(ng: { inject(): Service }): Service { return ng.inject(); }',
  ]) {
    it(`accepts ${source}`, () => assert.deepEqual(diagnostics(source), []));
  }

  for (const [source, messageId] of [
    ['const count = 0;', 'variable'],
    ['let pending = false;', 'variable'],
    ['const client = new Client();', 'variable'],
    ['const value = load();', 'variable'],
    ['const value = load() as Value;', 'variable'],
    ['const value = load() satisfies unknown;', 'variable'],
    ['class State { readonly count = 0; }', 'restrictedSyntax'],
    ['function next(value = 1): number { return value; }', 'restrictedSyntax'],
    ['const next = (value = 1): number => value;', 'restrictedSyntax'],
    ['class State { next(value = 1): number { return value; } }', 'restrictedSyntax'],
    ['class State { constructor(private readonly count = 0) {} }', 'restrictedSyntax'],
    ['function next({ value }): number { return value; }', 'restrictedSyntax'],
    ['const next = function (value = 1): number { return value; };', 'restrictedSyntax'],
    ['function next(...values): number { return values.length; }', 'restrictedSyntax'],
    [
      'const state = { next(value = 0): number { return value; } } satisfies State;',
      'restrictedSyntax',
    ],
    [
      'import { inject } from "@angular/core"; const service: Service = inject(Service);',
      'generic',
    ],
    [
      'import { inject as di } from "@angular/core"; const service: Service = di(Service);',
      'generic',
    ],
    [
      'import * as ng from "@angular/core"; const service: Service = ng.inject(Service);',
      'generic',
    ],
    ['import { inject } from "@angular/core"; const value: string = inject(TOKEN)();', 'generic'],
    ['import { parse } from "zod/mini"; const value = parse(schema, input);', 'variable'],
    ['import * as z from "zod/mini"; const value = z.parse(schema, input);', 'variable'],
    ['import * as z from "zod/mini"; const value = z.string().parse(input);', 'variable'],
    ['import * as z from "zod/mini"; const value = z.string().toString();', 'variable'],
    [
      'import { pgTable } from "drizzle-orm/pg-core"; const value = pgTable("row", {}).toString();',
      'variable',
    ],
    ['import { cva } from "class-variance-authority"; const value = cva("base")({});', 'variable'],
    ['const signalStore: () => number = (): number => 1; const value = signalStore();', 'variable'],
    [
      'import { signalStore } from "@ngrx/signals"; function f(signalStore: () => number): void { const value = signalStore(); }',
      'variable',
    ],
    ['import { cva } from "another-package"; const value = cva();', 'variable'],
    ['const schema: Schema = createSchema(); const rows = schema.table("rows", {});', 'variable'],
    [
      'import { pgSchema } from "drizzle-orm/pg-core"; const schema: Schema = pgSchema("content"); function f(schema: Other): void { const rows = schema.table("rows", {}); }',
      'variable',
    ],
  ]) {
    it(`rejects ${source}`, () => {
      const messages = diagnostics(source);
      assert.equal(messages.length, 1, JSON.stringify(messages));
      assert.equal(messages[0].messageId, messageId);
    });
  }
});
