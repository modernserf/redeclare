import tape from "tape"
import * as types from "./types"

[
    types,
].forEach((dep) => { if (dep.tests) { dep.tests(tape) } })
