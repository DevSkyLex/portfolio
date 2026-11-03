import { ASTUtils } from '@typescript-eslint/utils';

/**
 * @typedef {import('@typescript-eslint/utils').TSESTree.Node} Node
 * @typedef {import('eslint').Rule.RuleContext} RuleContext
 */

/**
 * Finds an imported binding without accepting a locally shadowed identifier.
 *
 * @param {RuleContext} context - ESLint source and scope services.
 * @param {Node} node - Identifier at the call site.
 * @returns {{ source: string, name: string } | null} Original import, when the identifier resolves to one.
 */
function importedBinding(context, node) {
  if (node.type !== 'Identifier') return null;
  const definition = ASTUtils.findVariable(context.sourceCode.getScope(node), node)?.defs[0];
  if (definition?.type !== 'ImportBinding') return null;
  const specifier = definition.node;
  const declaration = definition.parent;
  if (declaration?.type !== 'ImportDeclaration') return null;
  const name =
    specifier.type === 'ImportNamespaceSpecifier'
      ? '*'
      : specifier.type === 'ImportSpecifier'
        ? (specifier.imported.name ?? specifier.imported.value)
        : 'default';
  return { source: declaration.source.value, name };
}

/**
 * Resolves a factory call through its fluent builder chain to its imported entry.
 *
 * @param {RuleContext} context - ESLint scope services.
 * @param {Node} node - Initializer or callee.
 * @returns {{ source: string, name: string, members: string[] } | null} Imported call path.
 */
function importedCall(context, node) {
  if (node.type === 'CallExpression') return importedCall(context, node.callee);
  if (node.type === 'MemberExpression' && !node.computed && node.property.type === 'Identifier') {
    let base = importedCall(context, node.object);
    if (!base && node.object.type === 'Identifier') {
      const definition = ASTUtils.findVariable(
        context.sourceCode.getScope(node.object),
        node.object,
      )?.defs[0];
      const initializer = definition?.node.init;
      if (
        definition?.type === 'Variable' &&
        definition.parent?.kind === 'const' &&
        initializer?.type === 'CallExpression' &&
        initializer.callee.type === 'Identifier'
      ) {
        const factory = importedBinding(context, initializer.callee);
        if (factory?.source === 'drizzle-orm/pg-core' && factory.name === 'pgSchema') {
          base = { ...factory, members: [] };
        }
      }
    }
    return base ? { ...base, members: [...base.members, node.property.name] } : null;
  }
  const binding = importedBinding(context, node);
  return binding ? { ...binding, members: [] } : null;
}

/**
 * Retains the exact output of schema and store DSLs instead of erasing their generated members.
 *
 * @param {RuleContext} context - ESLint scope services.
 * @param {Node} node - Variable initializer.
 * @returns {boolean} Whether the expression is an approved, imported declaration factory.
 */
function declarationFactory(context, node) {
  if (node.type !== 'CallExpression') return false;
  if (node.callee.type === 'CallExpression') return false;
  const call = importedCall(context, node);
  if (!call) return false;
  if (call.source === '@ngrx/signals')
    return call.name === 'signalStore' && call.members.length === 0;
  if (call.source === 'class-variance-authority')
    return call.name === 'cva' && call.members.length === 0;
  if (call.source === 'drizzle-orm/pg-core') {
    if (call.name === 'pgSchema') {
      return (
        call.members.length === 1 &&
        ['table', 'enum', 'view', 'materializedView'].includes(call.members[0])
      );
    }
    return (
      ['pgTable', 'pgEnum', 'pgView', 'pgMaterializedView'].includes(call.name) &&
      call.members.length === 0
    );
  }
  if (call.source === 'drizzle-orm') return call.name === 'relations' && call.members.length === 0;
  if (!['zod', 'zod/mini', 'zod/v4', 'zod/v4/mini'].includes(call.source)) return false;
  const namespace = ['*', 'z'].includes(call.name);
  const factory = namespace ? call.members[0] : call.name;
  const modifiers = namespace ? call.members.slice(1) : call.members;
  if (modifiers.some((member) => !['check', 'refine', 'optional', 'default'].includes(member))) {
    return false;
  }
  return [
    'array',
    'bigint',
    'boolean',
    'date',
    'discriminatedUnion',
    'email',
    'enum',
    'extend',
    'file',
    'int',
    'intersection',
    'lazy',
    'literal',
    'looseObject',
    'map',
    'nullable',
    'nullish',
    'number',
    'object',
    'optional',
    'partial',
    'pick',
    'record',
    'set',
    'strictObject',
    'string',
    'tuple',
    'union',
    'unknown',
    'url',
    'uuid',
    '_default',
  ].includes(factory);
}

/**
 * Checks an explicit expression contract without treating an arbitrary assertion as validation.
 *
 * @param {Node | null} node - Variable initializer.
 * @returns {boolean} Whether a literal or checked shape explicitly constrains the expression.
 */
function explicitExpression(node) {
  if (!node) return false;
  if (node.type === 'TSSatisfiesExpression') {
    return !['TSAnyKeyword', 'TSUnknownKeyword'].includes(node.typeAnnotation.type);
  }
  return (
    node.type === 'TSAsExpression' &&
    node.typeAnnotation.type === 'TSTypeReference' &&
    node.typeAnnotation.typeName.type === 'Identifier' &&
    node.typeAnnotation.typeName.name === 'const'
  );
}

/** Function boundaries that own their parameter contracts rather than receiving callback types. */
const FUNCTION_BOUNDARIES =
  ':matches(FunctionDeclaration, MethodDefinition > FunctionExpression, Property[method=true] > FunctionExpression, VariableDeclarator[id.typeAnnotation=undefined] > :matches(FunctionExpression, ArrowFunctionExpression))';

/** Parameter binding forms whose annotations are represented directly on the AST node. */
const PARAMETER_BINDINGS = ':matches(Identifier, ObjectPattern, ArrayPattern, RestElement)';

/**
 * Native ESLint selectors cover declaration syntax; the plugin only handles repository-specific
 * factory exceptions and imported Angular injection calls.
 *
 * @type {ReadonlyArray<{ selector: string, message: string }>}
 */
export const explicitTypeSyntax = [
  {
    selector: 'PropertyDefinition:not([typeAnnotation])',
    message: 'Declare an explicit type for this class member.',
  },
  ...[
    `${FUNCTION_BOUNDARIES} > ${PARAMETER_BINDINGS}.params:not([typeAnnotation])`,
    `${FUNCTION_BOUNDARIES} > AssignmentPattern.params > ${PARAMETER_BINDINGS}.left:not([typeAnnotation])`,
    'TSParameterProperty.params > :matches(Identifier, ObjectPattern, ArrayPattern).parameter:not([typeAnnotation])',
    'TSParameterProperty.params > AssignmentPattern.parameter > :matches(Identifier, ObjectPattern, ArrayPattern).left:not([typeAnnotation])',
  ].map((selector) => ({
    selector,
    message: 'Declare this parameter type at the function boundary.',
  })),
];

/**
 * Requires authored declaration contracts while retaining contextual callback and DSL precision.
 * This rule deliberately has no automatic fix: choosing a domain type requires review.
 *
 * @type {import('eslint').Rule.RuleModule}
 */
export const explicitDeclarations = {
  meta: {
    type: 'suggestion',
    schema: [],
    messages: {
      variable:
        'Declare the type of {{name}}, or constrain its literal/shape with as const or satisfies.',
    },
  },
  create(context) {
    return {
      VariableDeclarator(node) {
        if (node.id.type !== 'Identifier' || node.id.typeAnnotation) return;
        if (['ForOfStatement', 'ForInStatement'].includes(node.parent.parent?.type)) return;
        const value = node.init;
        if (value && ['ArrowFunctionExpression', 'FunctionExpression'].includes(value.type)) return;
        if (explicitExpression(value) || (value && declarationFactory(context, value))) return;
        context.report({ node: node.id, messageId: 'variable', data: { name: node.id.name } });
      },
    };
  },
};

/**
 * Requires an explicit Angular injection type, including aliased and namespace imports.
 *
 * @type {import('eslint').Rule.RuleModule}
 */
export const explicitInject = {
  meta: {
    type: 'suggestion',
    schema: [],
    messages: { generic: 'Specify the injected type explicitly with inject<T>(token).' },
  },
  create(context) {
    return {
      CallExpression(node) {
        if (!['Identifier', 'MemberExpression'].includes(node.callee.type)) return;
        const call = importedCall(context, node.callee);
        if (call?.source !== '@angular/core') return;
        const inject = call.name === 'inject' && call.members.length === 0;
        const namespaceInject = call.name === '*' && call.members.join('.') === 'inject';
        if ((inject || namespaceInject) && !node.typeArguments?.params.length) {
          context.report({ node, messageId: 'generic' });
        }
      },
    };
  },
};

/** @type {import('eslint').ESLint.Plugin} */
export default {
  rules: { 'explicit-declarations': explicitDeclarations, 'explicit-inject': explicitInject },
};
