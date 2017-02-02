// # Schema
const get = require("lodash/get");
const mapValues = require("lodash/mapValues");
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

export function test_createSchema_nested_selectors(t) {
    const { actions, selectors, reducer: rootReducer } = createSchema(
        {
            inc: [],
            add: ["value"]
        },
        {
            parentValue: () => 10,
            foo: {
                counter: reducer(
                    {
                        inc: state => state + 1,
                        add: (state, { value }) => state + value
                    },
                    0
                ),
                countPlusTen: selector(
                    { counter: ["foo", "counter"], parentValue: "parentValue" },
                    ({ counter, parentValue }) => counter + parentValue
                )
            }
        }
    );
    t.deepEqual(rootReducer(undefined, { type: "init" }), {
        parentValue: 10,
        foo: { counter: 0 }
    });

    const state = { parentValue: 10, foo: { counter: 5 } };

    t.deepEqual(rootReducer(state, actions.inc()), {
        parentValue: 10,
        foo: { counter: 6 }
    });

    t.deepEqual(selectors.foo(state), { counter: 5, countPlusTen: 15 });
    t.equal(selectors.foo.countPlusTen(state), 15, "select foo count");

    t.end();
}

export function test_createSchema_scopes(t) {
    const counter = scope => reducer(
        {
            inc: state => state + 1,
            add: (state, { value }) => state + value
        },
        0,
        scope
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
            foo: {
                counter: counter(["foo"])
            },
            bar: {
                counter: counter(["bar"]),
                countPlusTen: selector(
                    { counter: ["bar", "counter"], parentValue: "parentValue" },
                    ({ counter, parentValue }) => counter + parentValue
                )
            },
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
    t.deepEqual(selectors.bar(state), { counter: 3, countPlusTen: 13 });
    t.equal(selectors.bar.countPlusTen(state), 13);
    t.equal(selectors.fooPlusBarPlusTen(state), 18);

    t.end();
}

export function createSchema(actionDefs, defs) {
    const actions = createActions(actionDefs);
    const rootSelectors = {};
    const schema = _createSchema(actions, defs, rootSelectors);
    Object.assign(rootSelectors, schema.selectors);
    return Object.assign(schema, { actions });
}

function _createSchema(actions, defs, rootSelectors, scopePath = []) {
    const createMapReducer = ({ reducer, initState, scope }) =>
        createReducer(actions, reducer, initState, scope);

    const mapSchemaDef = (def, key) => {
        const defaultSelector = state => get(state, scopePath.concat([key]));
        switch (def.type) {
            case "reducer":
                return [createMapReducer(def), defaultSelector];
            case "selector":
                return [
                    null,
                    createSelector(
                        rootSelectors,
                        def.dependencies,
                        def.selector
                    )
                ];
        }
        // plain reducer function
        if (typeof def === "function") {
            return [def, defaultSelector];
        }

        const schema = _createSchema(
            actions,
            def,
            rootSelectors,
            scopePath.concat([key])
        );
        return [schema.reducer, schema.selectors];
    };

    const rootSelector = state => mapValues(selectors, fn => fn(state));

    const reducers = {};
    const selectors = {};

    for (const key in defs) {
        const [reducer, selector] = mapSchemaDef(defs[key], key);
        if (reducer) {
            reducers[key] = reducer;
        }
        if (selector) {
            selectors[key] = selector;
        }
    }

    return {
        reducer: combineReducers(reducers),
        selectors: Object.assign(rootSelector, selectors)
    };
}

function createSelector(selectors, dependencies, mapParams) {
    return state => mapParams(select(state, selectors, dependencies));
}

export function reducer(reducer, initState, scope) {
    return { type: "reducer", reducer, initState, scope };
}

export function selector(dependencies, selector) {
    return { type: "selector", dependencies, selector };
}
