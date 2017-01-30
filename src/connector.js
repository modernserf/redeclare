// Connector
import { createSchema, reducer, selector } from "./schema"

function mock_connect (mapState, actions) {
    return { mapState, actions }
}

export function test_createConnector (t) {
    const schema = createSchema({
        foo: [],
        bar: ["value"],
    }, {
        baz: reducer({ foo: (state) => state + 1 }, 0),
        quux: reducer({ bar: (state, { value }) => state + value }, ""),
        bazPlusTen: selector(["baz"], ({ baz }) => baz + 10),
        bazAndQuux: selector(["baz", "quux"], ({ baz, quux }) => `${baz}-${quux}`),
    })

    const connect = createConnector(mock_connect, schema)

    const { mapState, actions } = connect(["baz", "bazAndQuux"], ["bar"])

    const state = { baz: 10, quux: "str" }
    const mappedState = mapState(state)
    t.equal(mappedState.baz, 10)
    t.equal(mappedState.bazAndQuux, "10-str")

    t.deepEqual(actions.bar("str"), { type: "bar", value: "str" })

    t.throws(() => {
        connect(["baz", "unknownSelector"], ["bar"])
    })

    t.throws(() => {
        connect(["baz"], ["bar", "unknownAction"])
    })
    t.end()
}

export function test_createConnector_renamed_keys (t) {
    const schema = createSchema({
        foo: [],
        bar: ["value"],
    }, {
        baz: reducer({ foo: (state) => state + 1 }, 0),
        quux: reducer({ bar: (state, { value }) => state + value }, ""),
        bazPlusTen: selector(["baz"], ({ baz }) => baz + 10),
        bazAndQuux: selector(["baz", "quux"], ({ baz, quux }) => `${baz}-${quux}`),
    })

    const connect = createConnector(mock_connect, schema)
    const { mapState, actions } = connect({ bazRenamed: "baz" }, { barRenamed: "bar" })

    const state = { baz: 10, quux: "str" }
    const mappedState = mapState(state)
    t.equal(mappedState.bazRenamed, 10)

    t.deepEqual(actions.barRenamed("str"), { type: "bar", value: "str" })
    t.end()
}

export function createConnector (connect, schema) {
    return (selectorIDs, actionIDs, mergeProps, options) => {
        const mapStateToProps = typeof selectorIDs === "function"
            ? selectorIDs
            : mapState(schema.selectors, selectorIDs, "selector")
        const mapDispatchToProps = typeof actionIDs === "function"
            ? actionIDs
            : pickAndRename(schema.actions, actionIDs, "action type")
        return connect(mapStateToProps, mapDispatchToProps, mergeProps, options)
    }
}

function mapState (selectors, selectorIDs, err) {
    const picked = pickAndRename(selectors, selectorIDs, err)
    return (state) => {
        const res = {}
        for (const key in picked) { res[key] = picked[key](state) }
        return res
    }
}

function pickAndRename (object, keys, err) {
    const picked = {}
    if (Array.isArray(keys)) {
        for (var i = 0; i < keys.length; i++) {
            const key = keys[i]
            if (!object[key]) { throw new Error(`Unknown ${err}: ${key}`) }
            picked[key] = object[key]
        }
    } else {
        for (const renamedKey in keys) {
            const key = keys[renamedKey]
            if (!object[key]) { throw new Error(`Unknown ${err}: ${key}`) }
            picked[renamedKey] = object[key]
        }
    }
    return picked
}
