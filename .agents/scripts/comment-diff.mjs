#!/usr/bin/env node
// Compare executable syntax and special comments against an explicit pre-edit snapshot.
import fs from 'node:fs';
import path from 'node:path';
import ts from 'typescript';

/**
 * Constant beforePath, afterPath and extra
 *
 * @description
 * Before and after file paths supplied by the caller, with any extra arguments retained for validation.
 */
const [beforePath, afterPath, ...extra] = process.argv.slice(2);
if (!beforePath || !afterPath || extra.length || !/\.(?:[cm]?js|[cm]?ts)$/.test(afterPath)) {
  console.error('Usage: node .agents/scripts/comment-diff.mjs <before> <after.ts|js|mjs>');
  process.exit(2);
}

/**
 * Function fingerprint
 *
 * @description
 * Parses the source and collects executable syntax leaves and selected directives for comparison. Invalid syntax causes an error.
 *
 * @param {string} file - File to parse as UTF-8.
 * @param {import("typescript").ScriptKind} kind - Language kind used by the parser.
 * @returns {{tokens: Array<[number, string]>, directives: string[]}} Ordered syntax leaves and protected comments.
 */
function fingerprint(file, kind) {
  /**
   * Constant text
   *
   * @description
   * UTF-8 source supplied to the parser and comment scanner.
   */
  const text = fs.readFileSync(file, 'utf8');
  /**
   * Constant source
   *
   * @description
   * Parsed syntax tree used to enumerate executable leaves.
   */
  const source = ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true, kind);
  if (source.parseDiagnostics.length) throw new Error(`Cannot parse ${file}`);
  /**
   * Constant tokens
   *
   * @description
   * Ordered syntax kinds and exact source text for each executable leaf.
   */
  const tokens = [];

  /** @type {Map<number, import("typescript").CommentRange>} Parser-located comments, deduplicated by offset. */
  const comments = new Map();
  /**
   * Function visit
   *
   * @description
   * Recursively visits syntax children, excluding documentation nodes and end-of-file trivia.
   *
   * @param {import("typescript").Node} node - Syntax node to inspect.
   * @returns {void}
   */
  function visit(node) {
    if (node.kind === ts.SyntaxKind.JSDocComment) return;
    const children = node.getChildren(source);
    if (children.length) children.forEach(visit);
    else {
      for (const range of [
        ...(ts.getLeadingCommentRanges(text, node.getFullStart()) ?? []),
        ...(ts.getTrailingCommentRanges(text, node.getEnd()) ?? []),
      ])
        comments.set(range.pos, range);
      if (node.kind !== ts.SyntaxKind.EndOfFileToken)
        tokens.push([node.kind, node.getText(source)]);
    }
  }
  visit(source);
  /**
   * Protected directives are read from parser token trivia, including after interpolated templates.
   * A standalone scanner cannot distinguish template tails without parser context.
   * @type {string[]}
   */
  const directives = [];
  for (const range of [...comments.values()].sort((a, b) => a.pos - b.pos)) {
    const comment = text.slice(range.pos, range.end);
    if (
      /(?:\beslint-(?:disable|enable)(?:-next-line|-line)?\b|\bprettier-ignore(?:-start|-end)?\b|\b(?:istanbul|c8)\s+ignore\b|@ts-(?:ignore|expect-error|nocheck|check)\b|@(?:license|preserve)\b|\bcopyright\b)/i.test(
        comment,
      )
    ) {
      directives.push(comment);
      continue;
    }
    for (const match of comment.matchAll(/@(?:deprecated|since|version|author)\b[^\r\n*]*/gi)) {
      directives.push(match[0].trim());
    }
  }
  return { tokens, directives };
}

try {
  const kind = /\.[cm]?ts$/.test(afterPath) ? ts.ScriptKind.TS : ts.ScriptKind.JS;
  if (
    JSON.stringify(fingerprint(beforePath, kind)) !== JSON.stringify(fingerprint(afterPath, kind))
  ) {
    console.error('Executable syntax or protected comment directives changed.');
    process.exit(1);
  }
  console.log(`Executable syntax and protected directives match: ${path.basename(afterPath)}`);
} catch (error) {
  console.error(error.message);
  process.exit(2);
}
