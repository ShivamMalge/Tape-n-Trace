/**
 * Engine purity rules — architecture.md §2.1, §4, §14.
 *
 * The engine is pure TypeScript: no React, no Next, no DOM, no timers, and no
 * nondeterminism. These are the mechanical half of that promise; CI fails on a
 * violation rather than trusting code review to catch it.
 *
 * Exported as a bare rules block (no `files` key) so the root config can scope
 * it with a root-relative glob. Flat-config `files` globs resolve against the
 * directory of the config that declares them, and re-exporting a scoped block
 * upward would silently match nothing.
 */

/** Modules the engine may never import. */
export const FORBIDDEN_IMPORTS = [
  { name: 'react', message: 'The engine is pure TypeScript. Rendering belongs in packages/ui.' },
  { name: 'react-dom', message: 'The engine is pure TypeScript. Rendering belongs in packages/ui.' },
  { name: 'next', message: 'The engine must be consumable without Next.js. See architecture.md §2.1.' },
  {
    name: 'framer-motion',
    message: 'Animation is a UI concern. The engine emits a trace; the UI animates it.',
  },
]

/** Globals that would tie the engine to a browser, a clock, or a random source. */
export const FORBIDDEN_GLOBALS = [
  { name: 'window', message: 'The engine must run headless (Node, a worker, an embedded runtime).' },
  { name: 'document', message: 'The engine must run headless (Node, a worker, an embedded runtime).' },
  { name: 'navigator', message: 'The engine must run headless (Node, a worker, an embedded runtime).' },
  { name: 'localStorage', message: 'The engine holds no persistent state.' },
  { name: 'sessionStorage', message: 'The engine holds no persistent state.' },
  { name: 'setTimeout', message: 'No timers in the engine — pacing is the transport bar’s job.' },
  { name: 'setInterval', message: 'No timers in the engine — pacing is the transport bar’s job.' },
  { name: 'requestAnimationFrame', message: 'No timers in the engine.' },
]

/**
 * Determinism is a correctness property (§2.5) and nondeterministic state
 * naming is a prohibition (§14). Grading and trace diffing both compare traces
 * across runs, so a clock or an RNG anywhere in the engine is a defect.
 */
export const FORBIDDEN_PROPERTIES = [
  {
    object: 'Math',
    property: 'random',
    message: 'Determinism is a correctness property (§2.5). Same input, byte-identical output.',
  },
  {
    object: 'Date',
    property: 'now',
    message: 'Determinism is a correctness property (§2.5). A trace may not depend on the clock.',
  },
]

/** The rules themselves, ready to be scoped by whichever config consumes them. */
export const enginePurityRules = {
  'no-restricted-imports': [
    'error',
    { paths: FORBIDDEN_IMPORTS, patterns: ['next/*', '@next/*', 'react/*', 'react-dom/*'] },
  ],
  'no-restricted-globals': ['error', ...FORBIDDEN_GLOBALS],
  'no-restricted-properties': ['error', ...FORBIDDEN_PROPERTIES],
}

/** Standalone form, for running ESLint from inside packages/engine. */
export default [{ files: ['**/*.ts'], rules: enginePurityRules }]
