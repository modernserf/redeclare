// Connector
const { bindActionCreators } = require("redux");
const get = require("lodash/get");
const keyBy = require("lodash/keyBy");
const mapValues = require("lodash/mapValues");
import { createSchema, reducer, selector } from "./schema";
import { scopedAction } from "./scope";
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

export function __test_createConnector_scope(t) {
    const counter = scope => reducer(
        {
            inc: state => state + 1,
            add: (state, { value }) => state + value
        },
        0,
        scope
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
            foo: {
                counter: counter(["foo"])
            },
            bar: {
                counter: counter(["bar"]),
                countPlusTen: selector(
                    [["bar", "counter"], "parentValue"],
                    ({ counter, parentValue }) => counter + parentValue
                )
            },
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

    const barConnect = mock_connector(schema, initState);
    const {
        state: barState,
        actions: barActions
    } = barConnect(["fooPlusBarPlusTen", "counter"], ["inc"]);

    t.equal(barState.fooPlusBarPlusTen, 18);
    t.equal(barState.counter, 3);
    t.deepEqual(barActions.inc(), scopedAction("bar", { type: "inc" }));

    t.end();
}

export function createConnector(schema, connect) {
    return (selectorIDs, actionIDs, mergeProps, options) => {
        const c = connector(schema, selectorIDs, actionIDs);
        return connect(
            c.mapStateToProps,
            c.mapDispatchToProps,
            mergeProps,
            options
        );
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
    return state => select(state, selectors, selectorIDs);
}

function mapActions(actions, actionIDs) {
    return dispatch => {
        const picked = pickAndRename(actions, actionIDs);
        return bindActionCreators(picked, dispatch);
    };
}

function pickAndRename(object, keys) {
    const keyMap = Array.isArray(keys) ? keyBy(keys, k => k) : keys;

    return mapValues(keyMap, actionType => {
        const found = get(object, actionType);
        if (!found) {
            throw new Error(`Unknown action type: ${actionType}`);
        }
        return found;
    });
}

function mock_connector(schema, initState) {
    return (selectorIDs, actionIDs) => {
        const c = connector(schema, selectorIDs, actionIDs);
        const state = c.mapStateToProps(initState);
        const actions = c.mapDispatchToProps(x => x);
        return { state, actions };
    };
}
