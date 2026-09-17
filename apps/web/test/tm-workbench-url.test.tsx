/**
 * `/simulate/tm?machine=…&input=…` — the link opens one machine with a run
 * loaded. The input belongs to that machine: picking another preset must not
 * run the new machine on a string that was chosen for a different one.
 */

import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

vi.mock('next/navigation', () => ({
  useSearchParams: () => new URLSearchParams('machine=zeros-ones&input=0011'),
}))

const { TmWorkbench } = await import('../components/tm-workbench')

afterEach(cleanup)

describe('the TM gallery opened from a link', () => {
  it('runs the linked machine on the linked input, and only that machine', async () => {
    const user = userEvent.setup()
    render(<TmWorkbench />)
    expect(screen.getByText('Accepted')).toBeDefined()
    expect((screen.getByRole('textbox', { name: 'Input' }) as HTMLInputElement).value).toBe('0011')

    await user.click(screen.getByRole('button', { name: /A machine that does not halt/ }))
    expect((screen.getByRole('textbox', { name: 'Input' }) as HTMLInputElement).value).toBe('')
    expect(screen.queryByRole('status', { name: 'Move cap' })).toBeNull()
    expect(screen.queryByRole('region', { name: 'Tape' })).toBeNull()
  })
})
