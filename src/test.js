import tape from "tape"
import * as types from "./types"
import * as reducer from "./reducers"
[
    types,
    reducer,
].forEach((dep) => {
    for (const key in dep) {
        if (/^test_/.test(key)) {
            tape(key.replace("test_", "").replace(/_/g, " "), dep[key])
        }
    }
})
