// # Schema
const get = require("lodash/get");
const { combineReducers } = require("redux");
import { createActions } from "./actions";
import { createReducer } from "./reducers";
import { select } from "./selector";

// **createSchema** creates a root reducer and an object map of selectors -- functions that return segments of the app state.

export function test_createSchema_plain_reducers(t) {
    const actions = {
        foo: [],
        bar: ["value"]
    };

    const { reducer, selectors } = createSchema(actions, {
        baz: (state = 0, action) => action.type === "foo" ? state + 1 : state,
        quux: (state = "", action) =>
            action.type === "bar" ? state + action.value : state
    });

    t.deepEqual(
        reducer(undefined, { type: "init" }),
        { baz: 0, quux: "" },
        "reducer init state"
    );

    t.comment("reducers handle actions");
    t.deepEqual(reducer(undefined, { type: "foo" }), { baz: 1, quux: "" });
    t.deepEqual(reducer(undefined, { type: "bar", value: "str" }), {
        baz: 0,
        quux: "str"
    });

    t.comment("selectors traverse state");
    const state = { baz: 10, quux: "str" };
    t.equal(selectors.baz(state), 10);
    t.equal(selectors.quux(state), "str");
    t.end();
}

export function test_createSchema_map_reducers(t) {
    const actions = {
        foo: [],
        bar: ["value"]
    };

    const { reducer: rootReducer, selectors } = createSchema(actions, {
        baz: reducer({ foo: state => state + 1 }, 0),
        quux: reducer({ bar: (state, { value }) => state + value }, "")
    });

    t.comment("map reducers handle actions");
    t.deepEqual(rootReducer(undefined, { type: "foo" }), { baz: 1, quux: "" });
    t.deepEqual(rootReducer(undefined, { type: "bar", value: "str" }), {
        baz: 0,
        quux: "str"
    });

    t.comment("map selectors traverse state");
    const state = { baz: 10, quux: "str" };
    t.equal(selectors.baz(state), 10);
    t.equal(selectors.quux(state), "str");

    t.throws(
        () => {
            createSchema(actions, {
                baz: reducer({ unknownAction: state => state }, 0)
            });
        },
        undefined,
        "throws for unknown action"
    );
    t.end();
}

export function test_createSchema_selectors(t) {
    const actions = {
        foo: [],
        bar: ["value"]
    };

    const { selectors } = createSchema(actions, {
        baz: reducer({ foo: state => state + 1 }, 0),
        quux: reducer({ bar: (state, { value }) => state + value }, ""),
        bazPlusTen: selector(["baz"], ({ baz }) => baz + 10),
        bazAndQuux: selector(
            ["baz", "quux"],
            ({ baz, quux }) => `${baz}-${quux}`
        )
    });

    t.comment("selectors with dependencies");
    const state = { baz: 10, quux: "str" };
    t.equal(selectors.bazPlusTen(state), 20);
    t.equal(selectors.bazAndQuux(state), "10-str");

    t.end();
}

export function test_createSchema_scopes(t) {
    const counter = reducer(
        {
            inc: state => state + 1,
            add: (state, { value }) => state + value
        },
        0
    );

    const { actions, selectors, reducer: rootReducer } = createSchema(
        {
            foo: {
                inc: [],
                add: ["value"]
            },
            bar: {
                inc: [],
                add: ["value"]
            }
        },
        {
            parentValue: () => 10,
            foo: scope({ counter }),
            bar: scope({
                counter,
                countPlusTen: selector(
                    ["counter", "parentValue"],
                    ({ counter, parentValue }) => counter + parentValue
                )
            }),
            fooPlusBarPlusTen: selector(
                { foo: "foo", bar: ["bar", "countPlusTen"] },
                ({ foo, bar }) => foo.counter + bar
            )
        }
    );

    t.deepEqual(
        rootReducer(undefined, { type: "init" }),
        { parentValue: 10, foo: { counter: 0 }, bar: { counter: 0 } },
        "reducer init state"
    );

    const state = { parentValue: 10, foo: { counter: 5 }, bar: { counter: 3 } };
    t.deepEqual(rootReducer(state, actions.foo.inc()), {
        parentValue: 10,
        foo: { counter: 6 },
        bar: { counter: 3 }
    });
    t.deepEqual(rootReducer(state, actions.bar.add(2)), {
        parentValue: 10,
        foo: { counter: 5 },
        bar: { counter: 5 }
    });

    t.equal(selectors.foo.counter(state), 5);
    t.equal(selectors.bar.counter(state), 3);
    t.deepEqual(selectors.bar(state), { counter: 3 });
    t.equal(selectors.bar.countPlusTen(state), 13);
    t.equal(selectors.fooPlusBarPlusTen(state), 18);

    t.end();
}

export function createSchema(actionDefs, defs) {
    return _createSchema(createActions(actionDefs), defs, {}, []);
}

function _createSchema(actions, defs, selectors, scope) {
    const reducers = {};

    const createMapReducer = ({ reducer, initState }) =>
        createReducer(actions, reducer, initState, scope);

    const mapSchemaDef = (def, key) => {
        const nextScope = scope.concat([key]);
        const defaultSelector = state => get(state, nextScope);

        switch (def.type) {
            case "reducer":
                return [createMapReducer(def), defaultSelector];
            case "selector":
                return [
                    null,
                    createSelector(
                        selectors,
                        def.dependencies,
                        def.selector,
                        scope
                    )
                ];
            case "scope": {
                const childSchema = _createSchema(
                    actions,
                    def.selectors,
                    selectors,
                    nextScope
                );
                const selector = Object.assign(
                    defaultSelector,
                    childSchema.selectors
                );
                return [childSchema.reducer, selector];
            }
            default:
                return [def, defaultSelector];
        }
    };

    for (const key in defs) {
        const [reducer, selector] = mapSchemaDef(defs[key], key);
        if (reducer) {
            reducers[key] = reducer;
        }
        if (selector) {
            selectors[key] = selector;
        }
    }

    return { actions, reducer: combineReducers(reducers), selectors };
}

function createSelector(selectors, dependencies, mapParams, scope) {
    return state => mapParams(select(state, selectors, dependencies, scope));
}

export function reducer(reducer, initState) {
    return { type: "reducer", reducer, initState };
}

export function selector(dependencies, selector) {
    return { type: "selector", dependencies, selector };
}

export function scope(selectors) {
    return { type: "scope", selectors };
}
