// Connector
const { bindActionCreators } = require("redux");
const { connect } = require("react-redux");
const keyBy = require("lodash/keyBy");
const mapValues = require("lodash/mapValues");
import { createSchema, reducer, selector, scope } from "./schema";
import { getScope, scopedAction, findIn } from "./scope";
import { select } from "./selector";

export function test_createConnector(t) {
    const schema = createSchema(
        {
            foo: [],
            bar: ["value"]
        },
        {
            baz: reducer({ foo: state => state + 1 }, 0),
            quux: reducer({ bar: (state, { value }) => state + value }, ""),
            bazPlusTen: selector(["baz"], ({ baz }) => baz + 10),
            bazAndQuux: selector(
                ["baz", "quux"],
                ({ baz, quux }) => `${baz}-${quux}`
            )
        }
    );

    const initState = { baz: 10, quux: "str" };
    const connect = mock_connector(schema, initState);

    const { state, actions } = connect(["baz", "bazAndQuux"], ["bar"]);

    t.equal(state.baz, 10);
    t.equal(state.bazAndQuux, "10-str");

    t.deepEqual(actions.bar("str"), { type: "bar", value: "str" });

    t.throws(() => {
        connect(["baz", "unknownSelector"], ["bar"]);
    });

    t.throws(() => {
        connect(["baz"], ["bar", "unknownAction"]);
    });
    t.end();
}

export function test_createConnector_renamed_keys(t) {
    const schema = createSchema(
        {
            foo: [],
            bar: ["value"]
        },
        {
            baz: reducer({ foo: state => state + 1 }, 0),
            quux: reducer({ bar: (state, { value }) => state + value }, ""),
            bazPlusTen: selector(["baz"], ({ baz }) => baz + 10),
            bazAndQuux: selector(
                ["baz", "quux"],
                ({ baz, quux }) => `${baz}-${quux}`
            )
        }
    );

    const initState = { baz: 10, quux: "str" };
    const connect = mock_connector(schema, initState);
    const { state, actions } = connect({ bazRenamed: "baz" }, {
        barRenamed: "bar"
    });

    t.equal(state.bazRenamed, 10);

    t.deepEqual(actions.barRenamed("str"), { type: "bar", value: "str" });
    t.end();
}

export function test_createConnector_scope(t) {
    const counter = reducer(
        {
            inc: state => state + 1,
            add: (state, { value }) => state + value
        },
        0
    );

    const schema = createSchema(
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

    const initState = {
        parentValue: 10,
        foo: { counter: 5 },
        bar: { counter: 3 }
    };
    const rootConnect = mock_connector(schema, initState);

    const {
        state: rootState
    } = rootConnect({ val: "parentValue", count: ["bar", "countPlusTen"] }, {});

    t.equal(rootState.val, 10);
    t.equal(rootState.count, 13);

    const barConnect = mock_connector(schema, initState, ["bar"]);
    const {
        state: barState,
        actions: barActions
    } = barConnect(["fooPlusBarPlusTen", "counter"], ["inc"]);

    t.equal(barState.fooPlusBarPlusTen, 18);
    t.equal(barState.counter, 3);
    t.deepEqual(barActions.inc(), scopedAction("bar", { type: "inc" }));

    t.end();
}

export function createConnector(schema) {
    return (selectorIDs, actionIDs, mergeProps, options) => {
        const c = connector(schema, selectorIDs, actionIDs);
        const conn = connect(
            c.mapStateToProps,
            c.mapDispatchToProps,
            mergeProps,
            options
        );
        return Component => getScope(conn(Component));
    };
}

function connector(schema, selectorIDs, actionIDs) {
    const mapStateToProps = typeof selectorIDs === "function"
        ? selectorIDs
        : mapState(schema.selectors, selectorIDs);
    const mapDispatchToProps = typeof actionIDs === "function"
        ? actionIDs
        : mapActions(schema.actions, actionIDs);
    return { mapStateToProps, mapDispatchToProps };
}

function mapState(selectors, selectorIDs) {
    return (state, { scope }) => select(state, selectors, selectorIDs, scope);
}

function mapActions(actions, actionIDs) {
    return (dispatch, { scope } = {}) => {
        const picked = pickAndRename(actions, actionIDs, scope);
        return bindActionCreators(picked, dispatch);
    };
}

function pickAndRename(object, keys, scope) {
    const keyMap = Array.isArray(keys) ? keyBy(keys, k => k) : keys;
    return mapValues(keyMap, actionType => {
        const found = findIn(object, scope, actionType);
        if (!found) {
            throw new Error(`Unknown action type: ${actionType}`);
        }
        return found;
    });
}

function mock_connector(schema, initState, scope = []) {
    return (selectorIDs, actionIDs) => {
        const c = connector(schema, selectorIDs, actionIDs);
        const state = c.mapStateToProps(initState, { scope });
        const actions = c.mapDispatchToProps(x => x, { scope });
        return { state, actions };
    };
}
