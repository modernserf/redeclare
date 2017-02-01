// # Reducers
import { createActions } from "./actions";
import { scopedActionType } from "./scope";

// **createReducer** is a function for making reducers from an object of action-handling functions, similar to [create-reducer](https://github.com/nrn/create-reducer). Additionally, `createReducer` uses the action schema to check whether an action exists.
export function test_createReducer(t) {
    const actions = createActions({
        inc: [],
        add: ["value"],
        set: ["value"]
    });

    const reducer = createReducer(
        actions,
        {
            inc: state => state + 1,
            add: (state, { value }) => state + value,
            set: (_, { value }) => value
        },
        0
    );

    t.deepEqual(
        reducer(undefined, { type: "init" }),
        0,
        "returns reducer initState"
    );
    t.deepEqual(reducer(0, actions.inc()), 1);
    t.deepEqual(reducer(10, actions.add(3)), 13);
    t.deepEqual(reducer(10, actions.set(3)), 3);
    t.deepEqual(reducer(10, { type: "unknownAction" }), 10);
    t.end();
}

// An unknown action in the reducer-per-action map will throw an error.
export function test_createReducer_unknown_action(t) {
    t.throws(() => {
        const actions = createActions({
            foo: [],
            bar: ["value"]
        });

        createReducer(actions, {
            unknownAction: state => state
        });
    });
    t.end();
}

export function test_createReducer_scope(t) {
    const actions = createActions({
        inc: [],
        foo: {
            add: ["value"],
            bar: {
                set: ["value"]
            }
        },
        set: ["value"],
        baz: {
            set: ["value"]
        }
    });

    const reducer = createReducer(
        actions,
        {
            inc: state => state + 1,
            add: (state, { value }) => state + value,
            set: (_, { value }) => value
        },
        0,
        ["foo", "bar"]
    );

    t.deepEqual(
        reducer(undefined, { type: "init" }),
        0,
        "returns reducer initState"
    );
    t.deepEqual(reducer(0, actions.inc()), 1);
    t.deepEqual(reducer(10, actions.foo.add(3)), 13);
    t.deepEqual(reducer(10, actions.foo.bar.set(3)), 3);
    t.deepEqual(reducer(10, actions.set(3)), 3);
    t.deepEqual(
        reducer(10, actions.baz.set(3)),
        10,
        "sibling actions do not affect reducer"
    );
    t.deepEqual(reducer(10, { type: "unknownAction" }), 10);

    const topReducer = createReducer(
        actions,
        {
            inc: state => state + 1,
            set: (_, { value }) => value
        },
        0
    );

    t.deepEqual(topReducer(0, actions.inc()), 1);
    t.deepEqual(topReducer(10, actions.set(3)), 3);
    t.deepEqual(
        topReducer(10, actions.foo.bar.set(3)),
        10,
        "child actions do not affect reducer"
    );

    t.throws(() => {
        createReducer(
            actions,
            {
                inc: state => state + 1,
                add: (state, { value }) => state + value,
                set: (_, { value }) => value
            },
            0,
            ["baz"]
        );
    });
    t.end();
}

export function createReducer(actions, baseReducers, initState, scope = []) {
    for (const type in baseReducers) {
        if (!inScope(actions, type, scope)) {
            throw new Error(`Unknown action type: ${type}`);
        }
    }

    const reducer = (state = initState, action, scopePath = scope) => {
        if (action.type === scopedActionType && scopePath[0] === action.scope) {
            return reducer(state, action.action, scopePath.slice(1));
        } else if (baseReducers[action.type]) {
            return baseReducers[action.type](state, action);
        } else {
            return state;
        }
    };

    return reducer;
}

function inScope(actions, type, scope) {
    if (!actions) {
        return false;
    }
    if (actions[type]) {
        return true;
    }
    if (!scope.length) {
        return false;
    }
    return inScope(actions[scope[0]], type, scope.slice(1));
}
