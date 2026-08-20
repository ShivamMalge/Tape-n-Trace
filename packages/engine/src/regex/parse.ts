/**
 * Parsing and printing regular expressions — Hopcroft 2e §3.1, and §3.1.3 for
 * the precedence rule below.
 *
 * Precedence, tightest first: **star, then concatenation, then union**. So
 * `01* + 1` is `(0(1*)) + 1` and nothing else, which is the reading students are
 * examined on and the one they most often get wrong.
 *
 * Hopcroft writes union as `+`. `|` is accepted too, because every other tool a
 * student has met writes it that way, and refusing it teaches nothing. There is
 * deliberately **no Kleene plus**: `+` is already union here, and one symbol
 * cannot mean both without the parser guessing.
 *
 * Parsing is not a traced algorithm. A trace exists to walk through a procedure
 * a student is examined on, and nobody is examined on recursive descent — what
 * they are examined on is the Thompson construction that consumes this tree.
 */

import { err, ok, type Result, type ValidationError } from '../result.js'
import type { RegexNode, Sym } from '../types.js'

export const EPSILON_LITERAL = 'ε'
export const EMPTY_LITERAL = '∅'

const OPERATORS = new Set(['(', ')', '*', '+', '|'])

/**
 * Parse a regular expression.
 *
 * `alphabet`, when given, is checked against: a symbol outside it is almost
 * always a typo, and catching it here is far kinder than a machine that silently
 * accepts nothing.
 */
export function parseRegex(source: string, alphabet?: readonly Sym[]): Result<RegexNode> {
  const parser = new Parser(source, alphabet)
  const node = parser.parseUnion()

  if (parser.errors.length > 0) return err(parser.errors)
  if (!parser.atEnd) {
    return err([
      problem(
        'REGEX_TRAILING_INPUT',
        `Unexpected "${parser.peek()}" at position ${parser.index}. A closing bracket has no opening one to match.`,
        parser.index,
      ),
    ])
  }
  if (node === null) {
    return err([problem('REGEX_EMPTY', 'The expression is empty. Write ∅ for the empty language, or ε for the empty string.', 0)])
  }

  return ok(node)
}

class Parser {
  index = 0
  readonly errors: ValidationError[] = []

  constructor(
    private readonly source: string,
    private readonly alphabet?: readonly Sym[] | undefined,
  ) {}

  get atEnd(): boolean {
    return this.index >= this.source.length
  }

  peek(): string {
    return this.source[this.index] ?? ''
  }

  /** union := concat (('+' | '|') concat)* */
  parseUnion(): RegexNode | null {
    let left = this.parseConcat()

    while (!this.atEnd && (this.peek() === '+' || this.peek() === '|')) {
      const at = this.index
      this.index += 1
      const right = this.parseConcat()

      if (left === null || right === null) {
        this.fail('REGEX_DANGLING_UNION', `The union at position ${at} is missing one of its two sides.`, at)
        return left ?? right
      }
      left = { op: 'union', left, right }
    }

    return left
  }

  /** concat := star+ */
  parseConcat(): RegexNode | null {
    let left: RegexNode | null = null

    for (;;) {
      const next = this.parseStar()
      if (next === null) break
      left = left === null ? next : { op: 'concat', left, right: next }
    }

    return left
  }

  /** star := atom '*'* */
  parseStar(): RegexNode | null {
    let node = this.parseAtom()
    if (node === null) return null

    while (!this.atEnd && this.peek() === '*') {
      this.index += 1
      node = { op: 'star', inner: node }
    }

    return node
  }

  /** atom := '(' union ')' | ε | ∅ | escape | symbol */
  parseAtom(): RegexNode | null {
    if (this.atEnd) return null
    const char = this.peek()

    if (char === '(') {
      const opened = this.index
      this.index += 1
      const inner = this.parseUnion()

      if (this.atEnd || this.peek() !== ')') {
        this.fail('REGEX_UNCLOSED_BRACKET', `The bracket opened at position ${opened} is never closed.`, opened)
        return inner
      }
      this.index += 1

      if (inner === null) {
        this.fail('REGEX_EMPTY_GROUP', `The brackets at position ${opened} have nothing between them.`, opened)
        return { op: 'epsilon' }
      }
      return inner
    }

    // A closing bracket or an operator here ends this atom; the caller decides
    // whether that is legal.
    if (OPERATORS.has(char)) return null

    if (char === EPSILON_LITERAL) {
      this.index += 1
      return { op: 'epsilon' }
    }
    if (char === EMPTY_LITERAL) {
      this.index += 1
      return { op: 'empty' }
    }

    // A backslash escapes an operator so it can be used as a symbol.
    if (char === '\\') {
      const at = this.index
      const escaped = this.source[this.index + 1]
      if (escaped === undefined) {
        this.fail('REGEX_TRAILING_ESCAPE', `The backslash at position ${at} escapes nothing.`, at)
        this.index += 1
        return null
      }
      this.index += 2
      return this.symbol(escaped, at)
    }

    if (char === ' ') {
      // Whitespace is almost never meant as a symbol, and silently accepting it
      // produces an automaton over an alphabet the student did not intend.
      this.fail('REGEX_WHITESPACE', `There is a space at position ${this.index}. Spaces are not symbols; remove it.`, this.index)
      this.index += 1
      return null
    }

    this.index += 1
    return this.symbol(char, this.index - 1)
  }

  private symbol(sym: Sym, at: number): RegexNode {
    if (this.alphabet !== undefined && !this.alphabet.includes(sym)) {
      this.fail(
        'REGEX_SYMBOL_NOT_IN_ALPHABET',
        `"${sym}" at position ${at} is not in the alphabet {${this.alphabet.join(', ')}}.`,
        at,
      )
    }
    return { op: 'symbol', sym }
  }

  private fail(code: string, message: string, position: number): void {
    this.errors.push(problem(code, message, position))
  }
}

function problem(code: string, message: string, position: number): ValidationError {
  return { code, message, subject: { kind: 'machine' }, position }
}

// ---------------------------------------------------------------------------
// Printing
// ---------------------------------------------------------------------------

/** Binding strength, so the printer only brackets where it must. */
const PRECEDENCE: Record<RegexNode['op'], number> = {
  empty: 3,
  epsilon: 3,
  symbol: 3,
  star: 2,
  concat: 1,
  union: 0,
}

/**
 * Print an expression, bracketing only where precedence would otherwise change
 * the meaning. `union(0, concat(1,1))` prints as `0+11`, not `(0)+((1)(1))` —
 * an answer buried in brackets is an answer a student cannot check.
 */
export function regexToString(node: RegexNode): string {
  switch (node.op) {
    case 'empty':
      return EMPTY_LITERAL
    case 'epsilon':
      return EPSILON_LITERAL
    case 'symbol':
      return node.sym
    case 'star':
      return `${bracket(node.inner, PRECEDENCE.star)}*`
    case 'concat':
      return `${bracket(node.left, PRECEDENCE.concat)}${bracket(node.right, PRECEDENCE.concat)}`
    case 'union':
      return `${bracket(node.left, PRECEDENCE.union)}+${bracket(node.right, PRECEDENCE.union)}`
  }
}

function bracket(node: RegexNode, needed: number): string {
  const text = regexToString(node)
  return PRECEDENCE[node.op] < needed ? `(${text})` : text
}

/** How many nodes the tree holds — state elimination blows this up fast. */
export function regexSize(node: RegexNode): number {
  switch (node.op) {
    case 'union':
    case 'concat':
      return 1 + regexSize(node.left) + regexSize(node.right)
    case 'star':
      return 1 + regexSize(node.inner)
    default:
      return 1
  }
}
