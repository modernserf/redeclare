// # Reducers
import assign from "lodash/assign"
import { types } from "./types"
import { createActions } from "./actions"

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

export function test_createReducer_namespace_actions (t) {
    const actions = createActions([
        ["add"],
        ["a", createActions([
            ["add"],
            ["addMany", types.Number],
        ])],
        ["b", createActions([
            ["addMany", types.Number],
            ["c", createActions([
                ["add"],
            ])],
        ])],
    ])

    const createReducer = createReducerCreator(actions, ["b", "c"])

    const reducer = createReducer({
        add: (state) => state + 1,
        addMany: (state, value) => state + value,
    }, 0)

    // gets root action
    t.equal(1, reducer(0, actions.creators.add()))
    // gets parent action
    t.equal(10, reducer(0, actions.creators.b.addMany(10)))
    // gets own action
    t.equal(1, reducer(0, actions.creators.b.c.add()))
    // does not get sibling action
    t.equal(0, reducer(0, actions.creators.a.add()))

    t.end()
}

export function test_createReducer_deep_namespaces (t) {
    const actions = createActions([
        ["add"],
        ["a", createActions([
            ["add"],
            ["addMany", types.Number],
        ])],
        ["b", createActions([
            ["addMany", types.Number],
            ["c", createActions([
                ["add"],
            ])],
        ])],
    ])

    const createReducer = createReducerCreator(actions)

    const reducer = createReducer({
        add: (state) => state + 1,
        a: {
            add: (state) => state + 2,
            addMany: (state, value) => state + value,
        },
    }, 0)

    // gets root action
    t.equal(1, reducer(0, actions.creators.add()))
    // gets distinct child action
    t.equal(2, reducer(0, actions.creators.a.add()))
    // gets other child action
    t.equal(10, reducer(0, actions.creators.a.addMany(10)))
    // does not get unhandled action
    t.equal(0, reducer(0, actions.creators.b.c.add()))

    t.end()
}

// TODO: how to handle namespaces
// - reducer tree matches action tree { foo: { bar: handler } }

export const createReducerCreator = (actions, rootScopePath = []) =>
    (baseReducers, initState, ownScopePath = []) => {
        const scopePath = rootScopePath.concat(ownScopePath)
        const reducerMap = createReducerMap(baseReducers, actions.creators, scopePath)
        const reducer = (state = initState, action) => {
            const { type, payload } = action
            return reducerMap[type]
                ? reducerMap[type](state, payload, action)
                : state
        }

        return reducer
    }

function getActions (type, creators, path) {
    const creatorsAtRoot = creators[type] ? [creators[type]] : []

    if (!path.length) { return creatorsAtRoot }
    const scope = path[0]
    const rest = path.slice(1)
    return creatorsAtRoot.concat(getActions(type, creators[scope], rest))
}

function createReducerMap (baseReducers, creators, scopePath) {
    const reducerMap = {}
    for (const key in baseReducers) {
        const matchedActions = getActions(key, creators, scopePath)

        if (!matchedActions.length) {
            throw new Error(`unknown action "${key}"`)
        }
        const r = baseReducers[key]
        if (types.Function.test(r)) {
            matchedActions.forEach((action) => {
                reducerMap[action.type] = r
            })
        } else if (types.Object.test(r)) {
            assign(reducerMap, createReducerMap(r, creators[key], scopePath))
        } else {
            throw new Error(`reducer "${key}" should be a function or an object map of functions`)
        }
    }
    return reducerMap
}
