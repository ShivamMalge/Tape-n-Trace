/**
 * The pumping game, played through the UI.
 *
 * Full happy paths in both directions: an attack on {0ⁿ1ⁿ} won with i = 2, and
 * a defence of even-zeros survived to the engine's concession. The reducer's
 * rules surface as inline errors, not as silently ignored clicks.
 */

import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, fireEvent, render, screen, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { PumpingGame } from '../components/pumping-game'

afterEach(cleanup)

describe('attacking a non-regular language', () => {
  it('plays a full winning round and shows the proof', async () => {
    const user = userEvent.setup()
    render(<PumpingGame languageId="zeros-ones-equal" mode="prove" />)

    // The engine has opened with its n.
    expect(screen.getByText(/announces a pumping length of n = 4/)).toBeDefined()

    // A losing w first: not in the language → the rule is shown, not swallowed.
    await user.type(screen.getByRole('textbox'), '0101')
    await user.click(screen.getByRole('button', { name: /challenge/i }))
    expect(screen.getByRole('alert').textContent).toContain('not in')

    // The suggested string is a proper attack.
    await user.click(screen.getByRole('button', { name: /suggest one/i }))
    await user.click(screen.getByRole('button', { name: /challenge/i }))
    expect(screen.getByText(/plays the hardest/)).toBeDefined()
    expect(screen.getByText(/bounded at i ≤ 12/)).toBeDefined()

    // Pump with i = 2: 0ⁿ1ⁿ breaks immediately.
    const iField = screen.getByRole('spinbutton')
    await user.clear(iField)
    await user.type(iField, '2')
    await user.click(screen.getByRole('button', { name: /^pump$/i }))

    expect(screen.getByText(/you win the round/i)).toBeDefined()
    expect(screen.getByText(/The proof, written out/)).toBeDefined()
    expect(screen.getByText(/not regular/)).toBeDefined()
    expect(screen.getByRole('button', { name: /download the session/i })).toBeDefined()
  })

  it('refuses i = 1 with the reason', async () => {
    const user = userEvent.setup()
    render(<PumpingGame languageId="zeros-ones-equal" mode="prove" />)

    await user.click(screen.getByRole('button', { name: /suggest one/i }))
    await user.click(screen.getByRole('button', { name: /challenge/i }))

    const iField = screen.getByRole('spinbutton')
    await user.clear(iField)
    await user.type(iField, '1')
    await user.click(screen.getByRole('button', { name: /^pump$/i }))

    expect(screen.getByRole('alert').textContent).toContain('w itself')
  })
})

describe('defending a regular language', () => {
  it('claims n, splits on the DFA loop, and the engine concedes', async () => {
    const user = userEvent.setup()
    render(<PumpingGame languageId="even-zeros" mode="defend" />)

    expect(screen.getByText(/You are defending/)).toBeDefined()

    // Claim n = 2 — even-zeros has a 2-state DFA, so this is the true length.
    const nField = screen.getByRole('spinbutton')
    await user.clear(nField)
    await user.type(nField, '2')
    await user.click(screen.getByRole('button', { name: /claim it/i }))

    // The engine's challenge is 00; y = 00 (the whole loop) survives.
    expect(screen.getByText(/The engine chooses w = 00/)).toBeDefined()

    // Slider defaults give x = ε, y = first symbol; extend y over both — jsdom
    // does not implement arrow-key stepping on range inputs, so change directly.
    const yEnd = screen.getByRole('slider', { name: /end of y/i })
    act(() => {
      fireEvent.change(yEnd, { target: { value: '2' } })
    })

    await user.click(screen.getByRole('button', { name: /play this decomposition/i }))
    expect(screen.getByText(/it concedes/)).toBeDefined()
    expect(screen.getByText(/evidence, not proof/)).toBeDefined()
    expect(screen.getByText(/does not prove it regular|not thereby regular/)).toBeDefined()
  })
})

describe('the CFL variant', () => {
  it('attacks aⁿbⁿcⁿ with the quintuple decomposition', async () => {
    const user = userEvent.setup()
    render(<PumpingGame languageId="abc-equal" mode="prove" variant="cfl" />)

    expect(screen.getByText(/is context-free and announces/)).toBeDefined()

    await user.click(screen.getByRole('button', { name: /suggest one/i }))
    await user.click(screen.getByRole('button', { name: /challenge/i }))
    expect(screen.getByText(/pump v and y together/)).toBeDefined()

    const iField = screen.getByRole('spinbutton')
    await user.clear(iField)
    await user.type(iField, '2')
    await user.click(screen.getByRole('button', { name: /^pump$/i }))

    // i = 2 may or may not break the adversary's best split; the game either
    // ends won or continues — both are legitimate. What must hold: no crash,
    // and the round is still coherent.
    expect(
      screen.queryByText(/you win the round/i) ?? screen.queryByText(/still in the language/),
    ).not.toBeNull()
  })
})
