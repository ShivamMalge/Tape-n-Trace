/**
 * `ENGINE_VERSION` is stamped into every trace, and a replayed or graded trace
 * is only as trustworthy as that stamp. The constant lives in source rather than
 * being imported from package.json (the engine must stay bundler-agnostic), so
 * this test is what stops the two from drifting.
 */

import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { ENGINE_VERSION } from '../src/index.js'

describe('ENGINE_VERSION', () => {
  it('matches the package version', () => {
    const path = fileURLToPath(new URL('../package.json', import.meta.url))
    const pkg = JSON.parse(readFileSync(path, 'utf8')) as { version: string }
    expect(ENGINE_VERSION).toBe(pkg.version)
  })
})
