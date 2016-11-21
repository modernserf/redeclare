import assign from "lodash/assign"
import { types } from "./types"
import { createActions } from "./actions"

export const createReducerCreator = (actions, parentScope = []) =>
    (baseReducers, initState, childScope = []) => {
        // const scope = parentScope.concat(childScope)

        const reducerMap = {}
        for (const key in baseReducers) {
            const action = actions.c[key]
            // const action = actionInScope(actions, scope, key)
            if (!action || !action.type) {
                throw new Error(`unknown action "${key}"`)
            }
            const fn = baseReducers[key]
            if (typeof fn !== "function") {
                throw new Error(`reducer "${key}" is not a function`)
            }
            reducerMap[action.type] = fn
        }

        const reducer = (state = initState, action) => {
            const { type, payload } = action
            return reducerMap[type]
                ? reducerMap[type](state, payload, action)
                : state
        }

        // if (scope.length) {
            // return createScopedReducer(reducer, scope)
        // } else {
        return reducer
        // }
    }

export function test_createReducer (t) {
    const createReducer = createReducerCreator(createActions([
        ["foo"],
        ["bar", types.String],
        ["baz",
            ["a", types.Number],
            ["b", types.Number]],
    ]))

    const initState = { count: 0, message: "hello" }

    const merge = (a, b) => assign({}, a, b)

    const reducer = createReducer({
        foo: (state) => merge(state, { count: state.count + 1 }),
        bar: (state, message) => merge(state, { message }),
        baz: (state, { a, b }, { meta }) =>
            merge(state, { count: a + b, message: meta || state.message }),
    }, initState)

    t.equal(initState, reducer(undefined, { type: "@@INIT" }))
    t.equal(initState, reducer(initState, { type: "@@INIT" }))
    t.deepEquals({ count: 1, message: "hello" },
        reducer(initState, { type: "foo" }))
    t.deepEquals({ count: 0, message: "world" },
        reducer(initState, { type: "bar", payload: "world" }))
    t.deepEquals({ count: 3, message: "hello" },
        reducer(initState, { type: "baz", payload: { a: 1, b: 2 } }))
    t.deepEquals({ count: 3, message: "world" },
        reducer(initState,
            { type: "baz", payload: { a: 1, b: 2 }, meta: "world" }))
    t.end()
}

export function test_createReducer_unknown_action (t) {
    const createReducer = createReducerCreator(createActions([
        ["foo"],
    ]))

    t.throws(() => {
        createReducer({
            foo: (state) => state,
            quux: (state) => state,
        })
    })
    t.end()
}

export function test_createReducer_incorrect_format (t) {
    const createReducer = createReducerCreator(createActions([
        ["foo"],
        ["bar", types.String],
    ]))

    t.throws(() => {
        createReducer({
            foo: (state) => state,
            bar: "a string",
        })
    })
    t.end()
}
