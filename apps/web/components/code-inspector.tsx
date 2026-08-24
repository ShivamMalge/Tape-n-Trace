'use client'

/**
 * One cell of Fig. 9.1, opened up — §9.1.1 and §9.1.2.
 *
 * A cell is the meeting of two numberings, and both are worth seeing: the row is
 * a binary string read as a Turing machine, the column is a binary string read
 * as an input, and the same string can be either. The rules are shown beside the
 * runs of 0s that code them, because "0ⁱ10ʲ10ᵏ10ˡ10ᵐ" only becomes obvious once
 * the five runs are lined up against the five numbers.
 */

import { cellDigit, codedRuleText, codedSymbol, machineAt, type DiagonalTable } from '@tape-n-trace/engine'
import type { CellRef } from './diagonal-grid'

const VERDICT: Record<string, string> = {
  '1': 'accepts it',
  '0': 'does not accept it',
  '?': 'had not finished when the budget ran out',
}

export function CodeInspector({
  table,
  selected,
}: {
  table: DiagonalTable
  selected: CellRef | null
}): React.JSX.Element {
  if (selected === null) {
    return (
      <p className="tnt-muted" style={{ margin: 0 }}>
        Choose a cell to see the machine its row codes (§9.1.2) and the string its column names (§9.1.1).
      </p>
    )
  }

  const row = table.rows.find((r) => r.index === selected.row)
  const column = table.words.find((w) => w.index === selected.col)
  if (row === undefined || column === undefined) return <></>

  const cell = row.cells[table.words.findIndex((w) => w.index === selected.col)]
  const digit = cell === undefined ? '?' : cellDigit(cell)
  const decoded = machineAt(selected.row)

  return (
    <div className="tnt-panels">
      <section className="tnt-card tnt-stack-sm" style={{ alignContent: 'start' }}>
        <h3 style={{ margin: 0 }}>
          Row {selected.row} — the machine M<sub>{selected.row}</sub>
        </h3>
        <p className="tnt-meta" style={{ margin: 0 }}>
          Hopcroft 2e §9.1.2
        </p>
        <code className="tnt-xs" style={{ wordBreak: 'break-all' }}>
          w<sub>{selected.row}</sub> = {row.word === '' ? 'ε' : row.word}
        </code>

        {row.validCode ? (
          <>
            <p className="tnt-sm" style={{ margin: 0 }}>
              A well-formed code for {decoded.rules.length} {decoded.rules.length === 1 ? 'transition' : 'transitions'}, over{' '}
              {decoded.machine.states.length} states. q₁ is the start state and q₂ is the only accepting one, always;
              X₁, X₂ and X₃ are 0, 1 and the blank.
            </p>
            <ul className="tnt-stack-sm" style={{ margin: 0, padding: 0, listStyle: 'none' }}>
              {decoded.rules.map((rule) => (
                <li key={rule.code} className="tnt-sm tnt-stack-sm">
                  <code>{codedRuleText(rule)}</code>
                  <span className="tnt-muted tnt-xs">
                    <code>{rule.code}</code> — that is, δ({decoded.machine.states[rule.i - 1]}, {codedSymbol(rule.j)}) = (
                    {decoded.machine.states[rule.k - 1]}, {codedSymbol(rule.l)}, {rule.m === 1 ? 'L' : 'R'})
                  </span>
                </li>
              ))}
            </ul>
          </>
        ) : (
          <p className="tnt-sm" style={{ margin: 0 }}>
            Not a well-formed code. {row.reason} §9.1.3 reads such a string as the Turing machine with one state and no
            transitions, whose language is empty — which is why the row is all 0s rather than missing.
          </p>
        )}
      </section>

      <section className="tnt-card tnt-stack-sm" style={{ alignContent: 'start' }}>
        <h3 style={{ margin: 0 }}>
          Column {selected.col} — the string w<sub>{selected.col}</sub>
        </h3>
        <p className="tnt-meta" style={{ margin: 0 }}>
          Hopcroft 2e §9.1.1
        </p>
        <code className="tnt-sm" style={{ wordBreak: 'break-all' }}>
          w<sub>{selected.col}</sub> = {column.word === '' ? 'ε' : column.word}
        </code>
        <p className="tnt-sm" style={{ margin: 0 }}>
          Put a 1 in front of it and read the result as a binary integer: 1{column.word} is {selected.col}. That is the
          whole numbering, and it pairs every string with exactly one integer and back again.
        </p>

        <hr style={{ border: 0, borderTop: '1px solid var(--tnt-border)', margin: '2px 0' }} />

        <p style={{ margin: 0 }}>
          <strong>
            M<sub>{selected.row}</sub>
          </strong>{' '}
          on <strong>w<sub>{selected.col}</sub></strong> {VERDICT[digit]}, so the cell is <code>{digit}</code>.
          {digit === '?' ? (
            <>
              {' '}
              The run made {table.stepBudget} moves without halting. Whether it ever would is exactly the question
              Chapter 9 shows has no algorithm, so the table says nothing rather than guessing.
            </>
          ) : null}
        </p>

        {selected.row === selected.col ? (
          <p className="tnt-note" style={{ margin: 0 }}>
            This is a diagonal cell: the machine is being run on its own code. Complementing this answer is what puts
            w<sub>{selected.row}</sub> {digit === '1' ? 'outside' : digit === '0' ? 'inside' : 'somewhere in'} L_d.
          </p>
        ) : null}
      </section>
    </div>
  )
}
