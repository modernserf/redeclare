// # Schema
const { combineReducers } = require("redux")
import { createActions } from "./actions"
import { createReducerCreator } from "./reducers"

// **createSchema** creates a root reducer and an object map of selectors -- functions that return segments of the app state.

export function test_createSchema_plain_reducers (t) {
    const actions = {
        foo: [],
        bar: ["value"],
    }

    const { reducer, selectors } = createSchema(actions, {
        baz: (state = 0, action) => (action.type === "foo") ? state + 1 : state,
        quux: (state = "", action) => (action.type === "bar") ? state + action.value : state,
    })

    t.deepEqual(reducer(undefined, { type: "init" }),
        { baz: 0, quux: "" },
        "reducer init state")

    t.comment("reducers handle actions")
    t.deepEqual(reducer(undefined, { type: "foo" }), { baz: 1, quux: "" })
    t.deepEqual(reducer(undefined, { type: "bar", value: "str" }), { baz: 0, quux: "str" })

    t.comment("selectors traverse state")
    const state = { baz: 10, quux: "str" }
    t.equal(selectors.baz(state), 10)
    t.equal(selectors.quux(state), "str")

    t.end()
}

export function test_createSchema_map_reducers (t) {
    const actions = {
        foo: [],
        bar: ["value"],
    }

    const { reducer: rootReducer, selectors } = createSchema(actions, {
        baz: reducer({ foo: (state) => state + 1 }, 0),
        quux: reducer({ bar: (state, { value }) => state + value }, ""),
    })

    t.comment("map reducers handle actions")
    t.deepEqual(rootReducer(undefined, { type: "foo" }), { baz: 1, quux: "" })
    t.deepEqual(rootReducer(undefined, { type: "bar", value: "str" }), { baz: 0, quux: "str" })

    t.comment("map selectors traverse state")
    const state = { baz: 10, quux: "str" }
    t.equal(selectors.baz(state), 10)
    t.equal(selectors.quux(state), "str")

    t.throws(() => {
        createSchema(actions, {
            baz: reducer({ unknownAction: (state) => state }, 0),
        })
    }, undefined, "throws for unknown action")

    t.end()
}

export function test_createSchema_selectors (t) {
    const actions = {
        foo: [],
        bar: ["value"],
    }

    const { selectors } = createSchema(actions, {
        baz: reducer({ foo: (state) => state + 1 }, 0),
        quux: reducer({ bar: (state, { value }) => state + value }, ""),
        bazPlusTen: selector(["baz"], ({ baz }) => baz + 10),
        bazAndQuux: selector(["baz", "quux"], ({ baz, quux }) => `${baz}-${quux}`),
    })

    t.comment("selectors with dependencies")
    const state = { baz: 10, quux: "str" }
    t.equal(selectors.bazPlusTen(state), 20)
    t.equal(selectors.bazAndQuux(state), "10-str")

    t.throws(() => {
        createSchema(actions, {
            baz: reducer({ foo: (state) => state + 1 }, 0),
            quux: reducer({ bar: (state, { value }) => state + value }, ""),
            invalidSelector: selector(["unknownState"], () => 0),
        })
    }, undefined, "throws for unknown selector dependency")

    t.end()
}

export function createSchema (actionDefs, defs) {
    const actions = createActions(actionDefs)
    const reducers = {}
    const selectors = {}
    const createReducer = createReducerCreator(actions)
    for (const key in defs) {
        const def = defs[key]
        switch (def.type) {
        case "reducer":
            reducers[key] = createReducer(def.reducer, def.initState)
            selectors[key] = (state) => state[key]
            break
        case "selector":
            for (let i = 0; i < def.dependencies.length; i++) {
                const key = def.dependencies[i]
                if (!defs[key]) { throw new Error(`Unknown selector dependency: ${key}`) }
            }
            selectors[key] = createSelector(selectors, def.dependencies, def.selector)
            break
        default:
            reducers[key] = def
            selectors[key] = (state) => state[key]
        }
    }
    return { actions, reducer: combineReducers(reducers), selectors }
}

export function reducer (reducer, initState) {
    return { type: "reducer", reducer, initState }
}

export function selector (dependencies, selector) {
    return { type: "selector", dependencies, selector }
}

function createSelector (selectors, dependencies, selector) {
    return (state) => {
        const params = {}
        for (let i = 0; i < dependencies.length; i++) {
            const key = dependencies[i]
            params[key] = selectors[key](state)
        }
        return selector(params)
    }
}
