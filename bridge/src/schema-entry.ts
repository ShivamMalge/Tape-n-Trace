/**
 * The schema generator's entry point: `Trace` is generic, and a JSON-schema
 * root cannot be, so this alias instantiates it at the default step shape.
 * Consumed only by build.mjs; nothing imports it.
 */

import type { Trace } from '@tape-n-trace/engine'

export type TraceSchema = Trace
