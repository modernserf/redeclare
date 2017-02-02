import tape from "tape";
import * as reducer from "./reducers";
import * as actions from "./actions";
import * as schema from "./schema";
import * as connector from "./connector";

[reducer, actions, schema, connector].forEach(dep => {
    for (const key in dep) {
        if (/^test_/.test(key)) {
            tape(key.replace("test_", "").replace(/_/g, " "), dep[key]);
        }
    }
});
