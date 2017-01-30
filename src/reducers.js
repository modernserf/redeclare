// # Reducers
import { createActions } from "./actions"

// **createReducer** is a function for making reducers from an object of action-handling functions, similar to [create-reducer](https://github.com/nrn/create-reducer). Additionally, `createReducer` uses the action schema to check whether an action exists.
export function test_createReducer (t) {
    const actions = createActions({
        inc: [],
        add: ["value"],
        set: ["value"],
    })

    const reducer = createReducer(actions, {
        inc: (state) => state + 1,
        add: (state, { value }) => state + value,
        set: (_, { value }) => value,
    }, 0)

    t.deepEqual(reducer(undefined, { type: "init" }), 0, "returns reducer initState")
    t.deepEqual(reducer(0, actions.inc()), 1)
    t.deepEqual(reducer(10, actions.add(3)), 13)
    t.deepEqual(reducer(10, actions.set(3)), 3)
    t.deepEqual(reducer(10, { type: "unknownAction" }), 10)
    t.end()
}

// An unknown action in the reducer-per-action map will throw an error.
export function test_createReducer_unknown_action (t) {
    t.throws(() => {
        const actions = createActions({
            foo: [],
            bar: ["value"],
        })

        createReducer(actions, {
            unknownAction: (state) => state,
        })
    })

    t.end()
}

export function createReducer (actions, baseReducers, initState) {
    for (const type in baseReducers) {
        if (!actions[type]) { throw new Error(`Unknown action type: ${type}`) }
    }

    return function (state = initState, action) {
        if (baseReducers[action.type]) { return baseReducers[action.type](state, action) }
        return state
    }
}

// `createReducerCreator` is a curried version of createReducer that takes the actions schema as its first argument and returns a createReducer function already bound to those actions.
export const createReducerCreator = (actions) =>
    (baseReducers, initState) =>
        createReducer(actions, baseReducers, initState)
