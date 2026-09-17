import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { liveTools } from '../lib/catalog'

/**
 * The README states how many tools the site has, and the home page computes
 * the same number from the catalog. The two drifted apart once (27 against 26);
 * this keeps the prose honest when a tool is added or retired.
 */

const WORDS = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine']
const TENS: Record<string, number> = { twenty: 20, thirty: 30, forty: 40 }

function numberFrom(words: string): number {
  const [tens, units] = words.toLowerCase().split('-') as [string, string | undefined]
  return (TENS[tens] ?? 0) + (units === undefined ? 0 : WORDS.indexOf(units))
}

describe('README', () => {
  it('states the number of tools the catalog lists', () => {
    const readme = readFileSync(resolve(process.cwd(), '../../README.md'), 'utf8')
    const match = /as \*\*([a-z]+(?:-[a-z]+)?)\s+instruments\*\*/i.exec(readme)
    expect(match, 'the tool count sentence in README.md').not.toBeNull()
    expect(numberFrom((match as RegExpExecArray)[1] as string)).toBe(liveTools().length)
  })
})
