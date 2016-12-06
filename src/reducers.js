// # Reducers
import assign from "lodash/assign"
import { types } from "./types"
import { createActions } from "./actions"

// **createReducer** is a function for making reducers from an object of action-handling functions, similar to [create-reducer](https://github.com/nrn/create-reducer). Additionally, `createReducer` uses the action schema to check whether an action exists, and transparently handle namespaced actions.
export function test_createReducer (t) {
    const actions = createActions([
        ["foo"],
        ["bar", types.String],
        ["baz",
            ["a", types.Number],
            ["b", types.Number]],
    ])

    const initState = { count: 0, message: "hello" }

    // `createReducer` takes an object map of reducers that handle each action, with the signature `(state, action.payload, action) => state`.
    const reducer = createReducer(actions, {
        foo: (state) => assign({}, state, { count: state.count + 1 }),
        bar: (state, message) => assign({}, state, { message }),
        baz: (state, { a, b }, { meta }) =>
            assign({}, state, { count: a + b, message: meta || state.message }),
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

// `createReducerCreator` is a curried version of createReducer that takes the actions schema as its first argument and returns a createReducer function already bound to those actions.
export function test_createReducerCrreator (t) {
    const actions = createActions([
        ["foo"],
        ["bar", types.String],
    ])

    const initState = { count: 0, message: "hello" }

    const createReducer = createReducerCreator(actions)
    const reducer = createReducer({
        foo: (state) => assign({}, state, { count: state.count + 1 }),
        bar: (state, message) => assign({}, state, { message }),
    }, initState)

    t.deepEquals({ count: 1, message: "hello" },
        reducer(initState, { type: "foo" }))
    t.deepEquals({ count: 0, message: "world" },
        reducer(initState, { type: "bar", payload: "world" }))
    t.end()
}

// An unknown action in the reducer-per-action map will throw an error.
export function test_createReducer_unknown_action (t) {
    const actions = createActions([
        ["foo"],
    ])

    t.throws(() => {
        createReducer(actions, {
            foo: (state) => state,
            quux: (state) => state,
        }, { })
    })
    t.end()
}

// Unexpected types will also throw an error.
export function test_createReducer_incorrect_format (t) {
    const actions = createActions([
        ["foo"],
        ["bar", types.String],
    ])

    t.throws(() => {
        createReducer(actions, {
            foo: (state) => state,
            bar: "a string",
        }, {})
    })
    t.end()
}

// `createReducerCreator` also handles scoped actions.
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

    // The second argument is a scope path for traversing the actions object.
    const createReducer = createReducerCreator(actions, ["b", "c"])

    // This reducer handles all of the actions in its scope. It will handle `add` and `b/c/add` as the same action, but will ignore `a/add`.
    const reducer = createReducer({
        add: (state) => state + 1,
        addMany: (state, value) => state + value,
    }, 0)

    // handles root action `add`
    t.equal(1, reducer(0, actions.creators.add()))
    // handles parent action `b/addMany`
    t.equal(10, reducer(0, actions.creators.b.addMany(10)))
    // handles own action `b/c/add`
    t.equal(1, reducer(0, actions.creators.b.c.add()))
    // does not handle sibling action `a/add`
    t.equal(0, reducer(0, actions.creators.a.add()))

    t.end()
}

export function test_createReducer_combined_scopes (t) {
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

    const createReducer = createReducerCreator(actions, ["b"])

    const reducer = createReducer({
        add: (state) => state + 1,
        addMany: (state, value) => state + value,
    }, 0, ["c"])

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

export function createReducer (actions, baseReducers, initState, scopePath) {
    return createReducerCreator(actions)(baseReducers, initState, scopePath)
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
