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

    t.equal(actions.bar.length, 1, "action creator has correct length for <=3 args")
    t.equal(actions.quux.length, 0, "action creator for > 3 args is variadic")

    t.deepEqual(
        actions.bar("too", "many", "arguments"),
        { type: "bar", a: "too" },
        "action creator ignores extra args")

    t.deepEqual(
        actions.baz("missing"),
        { type: "baz", a: "missing", b: undefined, c: undefined },
        "action creator passes undefined for missing args")

    t.end()
}

export function test_createActions_with_custom_creator (t) {
    const actions = createActions({
        foo: ({ value, another }) => ({ type: "foo", value, another, meta: "meta" }),
    })

    t.deepEqual(
        actions.foo({ value: "val", another: 2 }),
        { type: "foo", value: "val", another: 2, meta: "meta" })

    t.equal(actions.foo.type, "foo")

    t.end()
}

export function createActions (schema) {
    const actions = {}
    for (const type in schema) {
        const ac = schema[type]
        actions[type] = Array.isArray(ac) ? createAction(type, ac) : ac
        // i.e. actions.foo.type = "foo"
        actions[type].type = type
    }

    return actions
}

function createAction (type, args) {
    const [arg0, arg1, arg2] = args
    switch (args.length) {
    case 0:
        return () => ({ type })
    case 1:
        return (val0) => ({ type, [arg0]: val0 })
    case 2:
        return (val0, val1) => ({ type, [arg0]: val0, [arg1]: val1 })
    case 3:
        return (val0, val1, val2) => ({ type, [arg0]: val0, [arg1]: val1, [arg2]: val2 })
    default:
        return function (...vals) {
            const action = { type }
            for (let i = 0; i < args.length; i++) { action[args[i]] = vals[i] }
            return action
        }
    }
}
