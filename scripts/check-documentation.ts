import { createHash } from 'node:crypto';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join, resolve } from 'node:path';
import ts from 'typescript';

export interface DocumentationCandidate {
  sourceRevision: string;
  applicationFingerprint: string;
  artifactDigest: string;
  snapshotId: string;
  fixtureHashes: Record<string, string>;
  conditionsDigest: string;
  priorServedBaselineDigest: string | null;
}

export interface DocumentationOptions {
  root: string;
  candidate: DocumentationCandidate;
  reportPath: string;
  now: string;
}

const topics = ['selection', 'reading', 'gaps', 'source', 'absence', 'errors', 'saved', 'install', 'updates'];
const accuracyChecks = ['purpose', 'parameters', 'returns', 'errors', 'sideEffects', 'commands'];
const candidateFields = ['sourceRevision', 'applicationFingerprint', 'artifactDigest', 'snapshotId', 'conditionsDigest', 'priorServedBaselineDigest'] as const;

/**
 * Narrows parsed JSON to a plain key/value record for evidence validation.
 * @param value Parsed JSON value.
 * @returns Whether the value is a non-null object rather than an array.
 */
function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * Checks candidate identifier shapes without treating them as trusted provenance.
 * @param value Candidate metadata supplied by the caller or reviewer.
 * @returns Whether every required revision, digest, snapshot and fixture field is valid.
 */
export function isCandidate(value: unknown): value is DocumentationCandidate {
  if (!isRecord(value) || typeof value.sourceRevision !== 'string' || !/^[a-f0-9]{40}$/.test(value.sourceRevision)) return false;
  for (const field of candidateFields) {
    if (field === 'sourceRevision') continue;
    if (field === 'snapshotId') {
      if (typeof value[field] !== 'string' || !value[field].trim()) return false;
    } else if (field === 'priorServedBaselineDigest' && value[field] === null) {
      continue;
    } else if (typeof value[field] !== 'string' || !/^[a-f0-9]{64}$/.test(value[field])) return false;
  }
  if (!isRecord(value.fixtureHashes) || Object.keys(value.fixtureHashes).length === 0) return false;
  for (const hash of Object.values(value.fixtureHashes)) {
    if (typeof hash !== 'string' || !/^[a-f0-9]{64}$/.test(hash)) return false;
  }
  return true;
}

/**
 * Compares an already shape-checked report with the expected exact candidate.
 * @param actual Candidate identified by the review report.
 * @param expected Frozen candidate supplied separately by the caller.
 * @returns Whether all identifiers and the complete fixture digest map match.
 */
export function sameCandidate(actual: DocumentationCandidate, expected: DocumentationCandidate): boolean {
  for (const field of candidateFields) if (actual[field] !== expected[field]) return false;
  const keys = Object.keys(expected.fixtureHashes).sort();
  if (keys.length !== Object.keys(actual.fixtureHashes).length) return false;
  for (const key of keys) if (actual.fixtureHashes[key] !== expected.fixtureHashes[key]) return false;
  return true;
}

/**
 * Checks a real UTC review instant and its inclusive seven-day applicability window.
 * @param value Recorded review timestamp, with optional three-digit milliseconds.
 * @param now Independently supplied current UTC clock.
 * @returns Whether the timestamp round-trips without calendar normalization and is current.
 */
export function isCurrentReview(value: unknown, now: string): boolean {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/.test(value)) return false;
  const reviewed = Date.parse(value);
  if (!Number.isFinite(reviewed)) return false;
  const canonical = value.includes('.') ? value : value.replace('Z', '.000Z');
  const age = Date.parse(now) - reviewed;
  return new Date(reviewed).toISOString() === canonical && Number.isFinite(age) && age >= 0 && age <= 7 * 86400000;
}

/**
 * Hashes exact code/document bytes so review cannot apply to later edited content.
 * @param content UTF-8 file contents.
 * @returns Lowercase SHA-256 hexadecimal digest.
 */
function digest(content: string): string {
  return createHash('sha256').update(content).digest('hex');
}

/**
 * Collects TypeScript source files recursively within a required code directory.
 * @param root Checkout root.
 * @param directory Checkout-relative directory to inspect.
 * @param files Mutable collection of checkout-relative source paths.
 * @remarks Adds discovered paths to files; reads directory entries without writing files.
 * @throws Error when an existing directory cannot be read.
 */
function collectDirectory(root: string, directory: string, files: string[]): void {
  if (!existsSync(join(root, directory))) return;
  for (const entry of readdirSync(join(root, directory), { withFileTypes: true })) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) collectDirectory(root, path, files);
    else if (entry.isFile() && /\.(?:[cm]?ts|tsx)$/.test(entry.name)) files.push(path);
  }
}

/**
 * Enumerates application, worker, tooling, configuration and test TypeScript files.
 * @param root Checkout root.
 * @returns Sorted unique paths in the required documentation coverage scope.
 * @throws Error when checkout directories cannot be read.
 */
function sourcePaths(root: string): string[] {
  const files: string[] = [];
  for (const directory of ['src', 'worker', 'scripts', 'tests']) collectDirectory(root, directory, files);
  for (const entry of readdirSync(root, { withFileTypes: true })) {
    if (entry.isFile() && /\.(?:[cm]?ts|tsx)$/.test(entry.name)) files.push(entry.name);
  }
  return [...new Set(files)].sort();
}

/**
 * Selects executable function/method forms, including accessors and callbacks.
 * @param node Compiler AST node.
 * @returns Whether the node declares or implements a documented callable.
 */
function isCallable(node: ts.Node): node is ts.FunctionLikeDeclaration {
  return ts.isFunctionDeclaration(node) || ts.isFunctionExpression(node) || ts.isArrowFunction(node)
    || ts.isMethodDeclaration(node) || ts.isConstructorDeclaration(node)
    || ts.isGetAccessorDeclaration(node) || ts.isSetAccessorDeclaration(node);
}

/**
 * Finds the binding that owns an assignment/property target when syntax identifies it.
 * @param node Assignment target or initializer expression.
 * @returns Root identifier/this name, or undefined for an indirect expression.
 */
function targetName(node: ts.Node): string | undefined {
  if (ts.isIdentifier(node)) return node.text;
  if (node.kind === ts.SyntaxKind.ThisKeyword) return 'this';
  if (ts.isPropertyAccessExpression(node) || ts.isElementAccessExpression(node)
    || ts.isParenthesizedExpression(node) || ts.isAsExpression(node) || ts.isNonNullExpression(node)) return targetName(node.expression);
  return undefined;
}

/**
 * Records all local names in an identifier or destructuring declaration.
 * @param binding Declared binding name.
 * @param names Mutable set of names in the current scope.
 * @remarks Adds declared names to the local set.
 */
function recordBindings(binding: ts.BindingName, names: Set<string>): void {
  if (ts.isIdentifier(binding)) names.add(binding.text);
  else for (const element of binding.elements) if (ts.isBindingElement(element)) recordBindings(element.name, names);
}

/**
 * Inspects one callable's own body without attributing nested callbacks to it.
 * @param node Function or method AST node.
 * @returns Syntactic value-return, explicit-throw and mutation requirements.
 */
function bodyRequirements(node: ts.FunctionLikeDeclaration): { returns: boolean; throws: boolean; effects: boolean } {
  const requirements = { returns: ts.isArrowFunction(node) && !ts.isBlock(node.body), throws: false, effects: false };
  const locals = new Set<string>();
  const parameters = new Set<string>();
  for (const parameter of node.parameters) recordBindings(parameter.name, parameters);
  const type = node.type?.getText();
  if (type && type !== 'void' && type !== 'never' && type !== 'Promise<void>') requirements.returns = true;
  /**
   * Collects local declarations while preserving direct aliases of borrowed state.
   * @param child Body AST node.
   * @remarks Records local declaration names; indirect aliasing remains a human review concern.
   */
  function collect(child: ts.Node): void {
    if (isCallable(child)) return;
    if (ts.isVariableDeclaration(child)) {
      const origin = child.initializer ? targetName(child.initializer) : undefined;
      if (!origin || locals.has(origin)) recordBindings(child.name, locals);
    }
    ts.forEachChild(child, collect);
  }
  /**
   * Distinguishes local construction/rebinding from parameter or captured mutation.
   * @param target Assignment, deletion or increment target.
   * @returns Whether the target syntactically refers to nonlocal/borrowed state.
   */
  function external(target: ts.Node): boolean {
    const name = targetName(target);
    if (ts.isIdentifier(target)) return !locals.has(target.text) && !parameters.has(target.text);
    return !name || !locals.has(name);
  }
  /**
   * Records syntax in the current body, excluding separately reviewed callables.
   * @param child Body AST node.
   * @remarks Updates the local requirement flags during traversal.
   */
  function visit(child: ts.Node): void {
    if (isCallable(child)) return;
    if (ts.isReturnStatement(child) && child.expression) requirements.returns = true;
    if (ts.isThrowStatement(child)) requirements.throws = true;
    if (ts.isBinaryExpression(child) && child.operatorToken.kind >= ts.SyntaxKind.FirstAssignment && child.operatorToken.kind <= ts.SyntaxKind.LastAssignment
      && external(child.left)) requirements.effects = true;
    if (ts.isDeleteExpression(child) && external(child.expression)) requirements.effects = true;
    if ((ts.isPrefixUnaryExpression(child) || ts.isPostfixUnaryExpression(child))
      && (child.operator === ts.SyntaxKind.PlusPlusToken || child.operator === ts.SyntaxKind.MinusMinusToken)
      && external(child.operand)) requirements.effects = true;
    ts.forEachChild(child, visit);
  }
  if (node.body) { collect(node.body); visit(node.body); }
  return requirements;
}

/**
 * Checks mechanically observable JSDoc coverage using the TypeScript compiler AST.
 * @param path Checkout-relative source filename for actionable diagnostics.
 * @param content Exact source text.
 * @returns Missing purpose, parameter, return, throw or mutation documentation findings.
 */
function inspectSource(path: string, content: string): string[] {
  const file = ts.createSourceFile(path, content, ts.ScriptTarget.Latest, true);
  const issues: string[] = [];
  /**
   * Reviews each callable and then visits nested methods/functions/callbacks.
   * @param node Source AST node.
   * @remarks Appends missing-coverage findings to the local issue list.
   */
  function visit(node: ts.Node): void {
    if (isCallable(node)) {
      const location = `${path}:${file.getLineAndCharacterOfPosition(node.getStart()).line + 1}`;
      const docs: ts.JSDoc[] = [];
      for (const entry of ts.getJSDocCommentsAndTags(node)) if (ts.isJSDoc(entry)) docs.push(entry);
      const tags: ts.JSDocTag[] = [];
      let purpose = '';
      for (const doc of docs) {
        purpose += ts.getTextOfJSDocComment(doc.comment) ?? '';
        if (doc.tags) tags.push(...doc.tags);
      }
      if (!purpose.trim()) issues.push(`${location}: missing function purpose JSDoc`);
      const parameterNames: string[] = [];
      const coveredTags = new Set<string>();
      for (const tag of tags) {
        if (ts.isJSDocParameterTag(tag) && ts.getTextOfJSDocComment(tag.comment)?.trim()) coveredTags.add(tag.name.getText().split('.')[0]);
      }
      for (const parameter of node.parameters) {
        if (ts.isIdentifier(parameter.name)) parameterNames.push(parameter.name.text);
        else if (coveredTags.size < node.parameters.length) issues.push(`${location}: missing destructured parameter JSDoc`);
      }
      for (const name of parameterNames) if (!coveredTags.has(name)) issues.push(`${location}: missing @param ${name}`);
      const requirements = bodyRequirements(node);
      const present = new Set<string>();
      for (const tag of tags) if (ts.getTextOfJSDocComment(tag.comment)?.trim()) present.add(tag.tagName.text);
      if (requirements.returns && !present.has('returns') && !present.has('return')) issues.push(`${location}: missing @returns for value-returning function`);
      if (requirements.throws && !present.has('throws') && !present.has('exception')) issues.push(`${location}: missing @throws for explicit throw`);
      if (requirements.effects && !present.has('remarks')) issues.push(`${location}: missing @remarks for mutation side effects`);
    }
    ts.forEachChild(node, visit);
  }
  visit(file);
  return issues;
}

/**
 * Performs a preliminary mechanical code review without claiming delivery acceptance.
 * @param root Checkout root.
 * @returns All missing callable-documentation findings in required source scopes.
 * @throws Error when a source file or directory cannot be read.
 */
export function checkCodeDocumentation(root: string): string[] {
  const issues: string[] = [];
  for (const path of sourcePaths(root)) issues.push(...inspectSource(path, readFileSync(join(root, path), 'utf8')));
  return issues;
}

/**
 * Verifies static coverage/deliverables and an exact candidate-bound human review.
 * @param options Checkout, independently supplied candidate, review path and UTC clock.
 * @returns Findings; an empty list means mechanical coverage and supplied review match,
 * not that a static program established semantic accuracy or reviewer authenticity.
 * @throws Error when the code scope cannot be read.
 */
export function checkDocumentation(options: DocumentationOptions): string[] {
  const issues = checkCodeDocumentation(options.root);
  const contents: Record<string, string> = {};
  const paths = [...sourcePaths(options.root), 'README.md', 'docs/development.md', 'docs/user-guide.md'];
  for (const path of paths) {
    try {
      contents[path] = readFileSync(join(options.root, path), 'utf8');
      if (!contents[path].trim()) issues.push(`${path}: required deliverable is empty`);
    } catch { issues.push(`${path}: required deliverable is missing`); }
  }
  const readme = contents['README.md'] ?? '';
  const links = [...readme.matchAll(/\]\(([^)]+)\)/g)];
  for (const target of ['docs/development.md', 'docs/user-guide.md']) {
    let linked = false;
    for (const link of links) if (resolve(options.root, link[1].split('#')[0]) === resolve(options.root, target)) linked = true;
    if (!linked) issues.push(`README.md: missing direct link to ${target}`);
  }
  const guide = contents['docs/user-guide.md'] ?? '';
  for (const language of ['Bahasa Melayu', 'English']) {
    const section = new RegExp(`^## ${language}\\s*\\n([\\s\\S]*?)(?=^## |$)`, 'm').exec(guide);
    if (!section?.[1].trim()) issues.push(`docs/user-guide.md: missing nonempty ${language} section`);
  }
  let report: unknown;
  try { report = JSON.parse(readFileSync(options.reportPath, 'utf8')); }
  catch { issues.push('accuracy review: missing or malformed report'); return issues; }
  if (!isRecord(report)) { issues.push('accuracy review: report must be an object'); return issues; }
  if (!isCandidate(options.candidate) || !isCandidate(report.candidate) || !sameCandidate(report.candidate, options.candidate)) issues.push('accuracy review: exact candidate/revision does not match');
  if (typeof report.reviewer !== 'string' || !report.reviewer.trim()) issues.push('accuracy review: reviewer is required');
  if (!isCurrentReview(report.reviewedAt, options.now)) issues.push('accuracy review: UTC timestamp is invalid, future or older than seven days');
  for (const check of accuracyChecks) if (!isRecord(report.accuracy) || report.accuracy[check] !== true) issues.push(`accuracy review: ${check} accuracy was not approved`);
  for (const language of ['bm', 'en']) {
    const covered = isRecord(report.guideCoverage) ? report.guideCoverage[language] : undefined;
    for (const topic of topics) if (!Array.isArray(covered) || !covered.includes(topic)) issues.push(`accuracy review: ${language} ${topic} guidance was not reviewed`);
  }
  for (const path of paths) {
    if (!isRecord(report.files) || report.files[path] !== digest(contents[path] ?? '')) issues.push(`accuracy review: ${path} bytes lack an exact matching reviewed digest`);
  }
  return issues;
}

/**
 * Runs the fail-closed gate with explicit candidate and human-review JSON paths.
 * @param args Arguments containing optional --root and required --candidate/--report.
 * @remarks Reads checkout/evidence files, writes findings to the console and sets exitCode.
 * @throws Error internally for missing arguments or invalid input; caught and reported.
 */
function runCli(args: string[]): void {
  try {
    const values: Record<string, string> = {};
    for (let index = 0; index < args.length; index += 2) {
      if (!['--root', '--candidate', '--report'].includes(args[index]) || !args[index + 1]) throw new Error('Use --root <checkout> --candidate <candidate.json> --report <review.json>');
      values[args[index]] = args[index + 1];
    }
    if (!values['--candidate'] || !values['--report']) throw new Error('Required candidate and accuracy review report are missing (--candidate, --report)');
    const candidate: unknown = JSON.parse(readFileSync(resolve(values['--candidate']), 'utf8'));
    if (!isCandidate(candidate)) throw new Error('Expected candidate metadata is invalid');
    const issues = checkDocumentation({ root: resolve(values['--root'] ?? '.'), candidate, reportPath: resolve(values['--report']), now: new Date().toISOString() });
    if (issues.length) { console.error(issues.join('\n')); process.exitCode = 1; }
    else console.log('Mechanical documentation coverage and supplied exact accuracy-review evidence match; reviewer authenticity/accuracy requires human review.');
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}

if (import.meta.main) runCli(process.argv.slice(2));
