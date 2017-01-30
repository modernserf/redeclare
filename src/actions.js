const isPlainObject = require("lodash/isPlainObject")
import { buildScope, scopedAction } from "./scope"
// # Actions

// **createActions** takes an action schema and returns an object map of action creators to generate those actions.
export function test_createActions (t) {
    const actions = createActions({
        foo: [], // no arguments
        bar: ["a"], // 1 argument
        baz: ["a", "b", "c"], // multiple arguments
        quux: ["a", "b", "c", "d", "e"], // too many arguments
    })

    t.deepEqual(actions.foo(), { type: "foo" })
    t.deepEqual(actions.bar(1), { type: "bar", a: 1 })
    t.deepEqual(actions.baz(1, 2, 3), { type: "baz", a: 1, b: 2, c: 3 })

    t.equal(actions.foo.type, "foo", "action creator function has type field")

    t.deepEqual(actions.bar("too", "many", "arguments"),
                { type: "bar", a: "too" },
                "action creator ignores extra args")

    t.deepEqual(actions.baz("missing"),
                { type: "baz", a: "missing", b: undefined, c: undefined },
                "action creator passes undefined for missing args")
    t.end()
}

export function test_createActions_with_custom_creator (t) {
    const actions = createActions({
        foo: ({ value, another }) => ({ type: "foo", value, another, meta: "meta" }),
    })

    t.deepEqual(actions.foo({ value: "val", another: 2 }),
                { type: "foo", value: "val", another: 2, meta: "meta" })

    t.equal(actions.foo.type, "foo")
    t.end()
}

export function test_createActions_with_scopes (t) {
    const actions = createActions({
        foo: [],
        bar: {
            baz: ["a", "b"],
            quux: ["a"],
            xyzzy: {
                plugh: ["a"],
            },
        },
    })

    t.deepEqual(actions.foo(), { type: "foo" })
    t.deepEqual(actions.bar.baz(1, 2), scopedAction("bar", { type: "baz", a: 1, b: 2 }))
    t.deepEqual(actions.bar.quux(1), scopedAction("bar", { type: "quux", a: 1 }))
    t.deepEqual(actions.bar.xyzzy.plugh(1),
                scopedAction("bar", scopedAction("xyzzy", { type: "plugh", a: 1 })))
    t.end()
}

export function createActions (schema, scope = []) {
    const actions = {}
    for (const type in schema) {
        const ac = schema[type]
        actions[type] = createAction(type, ac, scope)
        actions[type].type = type
    }

    return actions
}

function createAction (type, args, scope) {
    if (typeof args === "function") { return args }
    if (isPlainObject(args)) { return createActions(args, scope.concat([type])) }

    const f = buildScope(scope)

    const [arg0, arg1] = args
    switch (args.length) {
    case 0:
        return () => f({ type })
    case 1:
        return (val0) => f({ type, [arg0]: val0 })
    case 2:
        return (val0, val1) => f({ type, [arg0]: val0, [arg1]: val1 })
    default:
        return function (...vals) {
            const action = { type }
            for (let i = 0; i < args.length; i++) { action[args[i]] = vals[i] }
            return f(action)
        }
    }
}
