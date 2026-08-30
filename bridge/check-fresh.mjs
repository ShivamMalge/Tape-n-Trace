/**
 * Exit non-zero when vyakarana/static/ is missing or older than its sources —
 * phases-vyakarana.md V1's freshness gate, wired into CI at V4.
 */

import { readdirSync, statSync, existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const here = path.dirname(fileURLToPath(import.meta.url))
const repo = path.dirname(here)
const outDir = path.join(repo, 'vyakarana', 'vyakarana', 'static')

const OUTPUTS = ['widget.js', 'engine.js', 'widget.css', 'engine-manifest.json']
const SOURCES = [
  path.join(here, 'src'),
  path.join(here, 'build.mjs'),
  path.join(here, 'scope-css.mjs'),
  path.join(repo, 'packages', 'ui', 'src'),
  path.join(repo, 'packages', 'engine', 'src'),
]

function newestUnder(entry) {
  const stat = statSync(entry)
  if (!stat.isDirectory()) return stat.mtimeMs
  let newest = 0
  for (const name of readdirSync(entry)) newest = Math.max(newest, newestUnder(path.join(entry, name)))
  return newest
}

const missing = OUTPUTS.filter((name) => !existsSync(path.join(outDir, name)))
if (missing.length > 0) {
  process.stderr.write(`vyakarana/static/ is missing ${missing.join(', ')} — run: pnpm -F @tape-n-trace/bridge build\n`)
  process.exit(1)
}

const newestSource = Math.max(...SOURCES.map(newestUnder))
const oldestOutput = Math.min(...OUTPUTS.map((name) => statSync(path.join(outDir, name)).mtimeMs))
if (newestSource > oldestOutput) {
  process.stderr.write('vyakarana/static/ is older than its sources — run: pnpm -F @tape-n-trace/bridge build\n')
  process.exit(1)
}
process.stdout.write('vyakarana/static/ is fresh\n')
