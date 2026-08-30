/**
 * Build the bridge into vyakarana/static/ — phases-vyakarana.md V1.
 *
 *   widget.js            the anywidget ESM bundle: viewer + renderers + React
 *   widget.css           bridge base styles + shared tokens, scoped
 *   engine-manifest.json every export the bundled engine carries, for the
 *                        V3 parity test — generated, so it cannot drift
 */

import { build } from 'esbuild'
import { createRequire } from 'node:module'
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import { scopeCss } from './scope-css.mjs'

const here = path.dirname(fileURLToPath(import.meta.url))
const repo = path.dirname(here)
const outDir = path.join(repo, 'vyakarana', 'static')

await mkdir(outDir, { recursive: true })

// 1. The widget bundle. React is bundled in: a notebook host provides nothing.
const widget = await build({
  entryPoints: [path.join(here, 'src', 'index.tsx')],
  bundle: true,
  format: 'esm',
  jsx: 'automatic',
  minify: true,
  define: { 'process.env.NODE_ENV': '"production"' },
  outfile: path.join(outDir, 'widget.js'),
  metafile: true,
  logLevel: 'silent',
})

// Guard the import boundary at build time as well as lint time: the bundle
// may contain packages/ui, packages/engine, react and the bridge itself.
const offenders = Object.keys(widget.metafile.inputs).filter((input) => input.includes('apps/web') || input.includes('apps\\web'))
if (offenders.length > 0) {
  throw new Error(`The bridge bundled files from apps/web, which V1 forbids:\n${offenders.join('\n')}`)
}

// 2. The engine manifest.
const tmp = path.join(here, '.engine-manifest-probe.cjs')
await build({
  entryPoints: [path.join(repo, 'packages', 'engine', 'src', 'index.ts')],
  bundle: true,
  format: 'cjs',
  platform: 'node',
  outfile: tmp,
  logLevel: 'silent',
})
const engine = createRequire(import.meta.url)(tmp)
await rm(tmp)
const manifest = {
  engineVersion: engine.ENGINE_VERSION,
  generated: 'by bridge/build.mjs — do not edit',
  exports: Object.keys(engine).sort(),
}
await writeFile(path.join(outDir, 'engine-manifest.json'), JSON.stringify(manifest, null, 2) + '\n')

// 3. The stylesheet: bridge base first so the shared tokens win, then scope.
const base = await readFile(path.join(here, 'src', 'styles.css'), 'utf8')
const tokens = await readFile(path.join(repo, 'packages', 'ui', 'src', 'tokens.css'), 'utf8')
const css = scopeCss(`${base}\n\n${tokens}`)
await writeFile(path.join(outDir, 'widget.css'), css)

const kb = (n) => `${(n / 1024).toFixed(1)} KB`
const { size: jsSize } = await import('node:fs').then((fs) => fs.promises.stat(path.join(outDir, 'widget.js')))
process.stdout.write(
  `vyakarana/static/: widget.js ${kb(jsSize)} · widget.css ${kb(css.length)} · ` +
    `engine-manifest.json (${manifest.exports.length} exports, engine ${manifest.engineVersion})\n`,
)
