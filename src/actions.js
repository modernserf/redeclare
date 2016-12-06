// # Actions

import { types, buildVariant, namespace, composeModifiers } from "./types"

// **createActions** takes an action schema and generates a type that matches actions in that schema, much as `types.Variant` does. Likewise, it creates an object map of action creators to generate those actions.
export function test_createActions (t) {
    const actions = createActions([
        ["foo", "no payload"],
        ["bar", "a string payload", types.String],
        ["baz", "a shape payload",
            ["x", types.Number],
            ["y", types.Number, "optional"]],
    ])

    // ### action creators

    // action creators create objects matching the schema
    t.deepEquals(actions.c.foo(), { type: "foo" })
    t.deepEquals(actions.c.bar("a string"), { type: "bar", payload: "a string" })
    t.deepEquals(actions.c.baz({ x: 10, y: 20 }),
        { type: "baz", payload: { x: 10, y: 20 } })

    // action creators have a `type` field with the type of the actions they create.
    t.equals(actions.c.foo.type, "foo")
    // action creators have a `field` field with the complete field from the schema definiton.
    t.equals(actions.c.foo.field.doc, "no payload")

    // ### action validity

    // Matches expected actions
    t.true(actions.test({ type: "foo" }))
    t.true(actions.test({ type: "bar", payload: "a string" }))
    t.true(actions.test({ type: "baz", payload: { x: 10, y: 20 } }))

    // Matches shape payloads if there's an extra field
    t.true(actions.test({ type: "baz", payload: { x: 10, y: 20, z: 30 } }))
    // Matches shape payloads if an optional field is missing
    t.true(actions.test({ type: "baz", payload: { x: 10 } }))

    // Doesn't match if there's no type
    t.false(actions.test({ value: "not an action " }))

    // Doesn't match if its not a known type
    t.false(actions.test({ type: "quux" }))

    // Doesn't match if there shouldn't be a payload and there is one
    t.false(actions.test({ type: "foo", payload: 3 }))

    // Doesn't match if the payload is the wrong type
    t.false(actions.test({ type: "bar", payload: 123 }))

    // Doesn't match if an optional field is the wrong type
    t.false(actions.test({ type: "baz", payload: { x: 10, y: "a string" } }))

    t.end()
}

// In addition, `createActions` also allows schemas to be nested, namespacing the actions based on their placement in the tree.
export function test_createActions_namespacing (t) {
    const actions = createActions([
        ["foo", "a global action"],
        ["a", "a scope", createActions([
            ["foo", "namespaced foo action"],
            ["bar", "namespaced bar action", types.Number],
        ])],
        ["b", "a different scope", createActions([
            ["bar", "not to be confused with a/bar", types.String],
            ["c", "a nested scope", createActions([
                ["foo", "deeply namespaced foo action"],
            ])],
        ])],
    ])

    // ## scoped action creators
    t.deepEquals(actions.c.foo(), { type: "foo" })
    t.deepEquals(actions.c.a.foo(), { type: "a/foo" })
    t.deepEquals(actions.c.a.bar(123), { type: "a/bar", payload: 123 })
    t.deepEquals(actions.c.b.bar("a string"), { type: "b/bar", payload: "a string" })
    t.deepEquals(actions.c.b.c.foo(), { type: "b/c/foo" })

    // ## scoped validators
    t.true(actions.test({ type: "foo" }))
    t.true(actions.test({ type: "a/foo" }))
    t.true(actions.test({ type: "a/bar", payload: 123 }))
    t.true(actions.test({ type: "b/bar", payload: "a string" }))
    t.true(actions.test({ type: "b/c/foo" }))
    t.end()
}

function createScopedActions (def, rootModifier, scopeModifier) {
    const { scope, actions } = Scope.toObject(def)
    const scopedActions = createActions(actions.schema,
        composeModifiers(rootModifier, scopeModifier(scope)),
        scopeModifier)
    scopedActions.scope = scope

    return scopedActions
}

export function createActions (defs, rootModifier, scopeModifier = defaultScopeModifier) {
    const creators = defs.map((def) => {
        const defType = ActionField.matchType(def)
        if (defType === types.Variant.Field) {
            return buildVariant(def, rootModifier)
        } else {
            return createScopedActions(def, rootModifier, scopeModifier)
        }
    })

    const creatorMap = creators.reduce((coll, creatorOrScope) => {
        const { field, scope, creators } = creatorOrScope
        // nest scoped creators
        if (scope) {
            coll[scope] = creators
        } else {
            coll[field.type] = creatorOrScope
        }
        return coll
    }, {})

    const test = (val) => creators.some(({ test }) => test(val))

    return {
        test,
        creators: creatorMap,
        c: creatorMap,
        schema: defs,
    }
}

const Actions = types.Shape([
    ["test", types.Function],
    ["creators", types.Object],
    ["schema", types.Array],
])

const Scope = types.Record([
    ["scope", types.String],
    ["doc", types.String, "optional"],
    ["actions", Actions],
])

const ActionField = types.OneOfType([
    Scope,
    types.Variant.Field,
])

function defaultScopeModifier (scope) {
    return namespace((type) => `${scope}/${type}`)
}
