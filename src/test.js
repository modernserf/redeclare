import tape from "tape"
import * as types from "./types"

[
    types,
].forEach((dep) => {
    for (const key in dep) {
        if (/^test_/.test(key)) {
            tape(key.replace("test_", "").replace("_", " "), dep[key])
        }
    }
})
