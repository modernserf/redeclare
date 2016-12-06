import tape from "tape"
import * as types from "./types"
import * as reducer from "./reducers"
import * as actions from "./actions"
import * as selectors from "./selectors"
[
    types,
    reducer,
    actions,
    selectors,
].forEach((dep) => {
    for (const key in dep) {
        if (/^test_/.test(key)) {
            tape(key.replace("test_", "").replace(/_/g, " "), dep[key])
        }
    }
})
