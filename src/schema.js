// # Schema
const get = require("lodash/get")
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

    t.end()
}

export function test_createSchema_scopes (t) {
    const counter = reducer({
        inc: (state) => state + 1,
        add: (state, { value }) => state + value,
    }, 0)

    const { actions, selectors, reducer: rootReducer } = createSchema({
        foo: {
            inc: [],
            add: ["value"],
        },
        bar: {
            inc: [],
            add: ["value"],
        },
    }, {
        parentValue: () => 10,
        foo: scope({ counter }),
        bar: scope({
            counter,
            countPlusTen: selector(
                ["counter", "parentValue"],
                ({ counter, parentValue }) => counter + parentValue),
        }),
        fooPlusBarPlusTen: selector(
            { foo: "foo", bar: ["bar", "countPlusTen"] },
            ({ foo, bar }) => foo.counter + bar),
    })

    t.deepEqual(rootReducer(undefined, { type: "init" }),
                { parentValue: 10, foo: { counter: 0 }, bar: { counter: 0 } },
                "reducer init state")

    const state = { parentValue: 10, foo: { counter: 5 }, bar: { counter: 3 } }
    t.deepEqual(rootReducer(state, actions.foo.inc()),
                { parentValue: 10, foo: { counter: 6 }, bar: { counter: 3 } })
    t.deepEqual(rootReducer(state, actions.bar.add(2)),
                { parentValue: 10, foo: { counter: 5 }, bar: { counter: 5 } })

    t.equal(selectors.foo.counter(state), 5)
    t.equal(selectors.bar.counter(state), 3)
    t.deepEqual(selectors.bar(state), { counter: 3 })
    t.equal(selectors.bar.countPlusTen(state), 13)
    t.equal(selectors.fooPlusBarPlusTen(state), 18)

    t.end()
}

export function createSchema (actionDefs, defs) {
    const actions = createActions(actionDefs)
    return _createSchema(actions, defs, {}, [])
}

function _createSchema (actions, defs, selectors, scope) {
    const reducers = {}
    const createReducer = createReducerCreator(actions, scope)
    for (const key in defs) {
        const nextScope = scope.concat([key])
        const def = defs[key]
        switch (def.type) {
        case "reducer":
            reducers[key] = createReducer(def.reducer, def.initState)
            selectors[key] = (state) => get(state, nextScope)
            break
        case "selector":
            selectors[key] = createSelector(selectors, def.dependencies, def.selector, scope)
            break
        case "scope":
            const childSchema = _createSchema(actions, def.selectors, selectors, nextScope)
            reducers[key] = childSchema.reducer
            selectors[key] = (state) => get(state, nextScope)
            for (const selectorKey in childSchema.selectors) {
                selectors[key][selectorKey] = childSchema.selectors[selectorKey]
            }
            break
        default:
            reducers[key] = def
            selectors[key] = (state) => get(state, nextScope)
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

export function scope (selectors) {
    return { type: "scope", selectors }
}

function createSelector (selectors, dependencies, selector, scope) {
    return (state) => {
        const params = {}
        const pairs = toPairs(dependencies)
        for (let i = 0; i < pairs.length; i++) {
            const [key, value] = pairs[i]
            const dep = findIn(selectors, scope, value)
            if (!dep) { throw new Error(`Unknown selector dependency: ${key}`) }
            params[key] = dep(state)
        }
        return selector(params)
    }
}

// find key in object on path, starting at max depth and working back up
function findIn (obj, path, key) {
    const keyArr = Array.isArray(key) ? key : [key]
    const atPath = get(obj, path.concat(keyArr))
    if (atPath) { return atPath }
    if (!path.length) { return null }
    return findIn(obj, path.slice(0, -1), key)
}

function toPairs (obj) {
    if (Array.isArray(obj)) { return obj.map((key) => [key, key]) }
    const arr = []
    for (const key in obj) { arr.push([key, obj[key]]) }
    return arr
}
