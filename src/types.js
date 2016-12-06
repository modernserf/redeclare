// # Types

// types are objects with a `test` method.
import { getRecord } from "./types-record"
const keyBy = require("lodash/keyBy")
const assign = require("lodash/assign")

// **createType** is a shorthand for building types.
export function test_createType (t) {
    const T = createType((val) => val === 3)
    t.true(T.test(3))
    t.false(T.test(4))
    t.false(T.test())
    t.end()
}

export function createType (test) {
    return { test }
}

// ## Base types

// the basic JavaScript primitives and objects have types:
// **Object**, **Number**, **String**, **Boolean**, **Array** and **Function**.
export const types = {}
types.Object = createType((val) =>
    !!val && !Array.isArray(val) && typeof val === "object")
types.Number = createType((val) => typeof val === "number")
types.String = createType((val) => typeof val === "string")
types.Boolean = createType((val) => val === true || val === false)
types.Array = createType(Array.isArray)
types.Function = createType((val) => typeof val === "function")

// **Any** matches any value besides null and undefined.
types.Any = createType((val) => val !== undefined && val !== null)

export function test_base_types (t) {
    const vals = [
        null, undefined, false, "foo", 0, { a: 1, b: "b" }, [1, 2, 3],
    ]

    t.deepEquals(vals.map(types.Object.test),
        [false, false, false, false, false, true, false])
    t.deepEquals(vals.map(types.Number.test),
        [false, false, false, false, true, false, false])
    t.deepEquals(vals.map(types.String.test),
        [false, false, false, true, false, false, false])
    t.deepEquals(vals.map(types.Boolean.test),
        [false, false, true, false, false, false, false])
    t.deepEquals(vals.map(types.Array.test),
        [false, false, false, false, false, false, true])
    t.deepEquals(vals.map(types.Any.test),
        [false, false, true, true, true, true, true])

    t.true(types.Function.test(() => {}))
    t.true(types.Function.test(Object))

    t.true(types.Type.test(types.Object))
    t.true(types.Type.test({ test: (value) => true }))
    t.true(types.Type.test(/foo/))
    t.false(types.Type.test({}))
    t.false(types.Type.test(""))
    t.false(types.Type.test(() => {}))

    t.end()
}

// **Type** matches type definitions (i.e. anything with a type method.)
types.Type = createType((val) => val && typeof val.test === "function")

export function test_Type (t) {
    t.true(types.Type.test(types.Object))
    t.true(types.Type.test({ test: (value) => true }))
    t.true(types.Type.test(/foo/))
    t.false(types.Type.test({}))
    t.false(types.Type.test(""))
    t.false(types.Type.test(() => {}))
    t.end()
}

// ## Parameterized types

// **Exactly** matches an exact value.
types.Exactly = (compare) => createType((val) => val === compare)

export function test_Exactly (t) {
    t.true(types.Exactly("foo").test("foo"))
    t.true(types.Exactly(0).test(0))
    t.false(types.Exactly(0).test(""))
    t.end()
}

// **InstanceOf** matches an instance of a class.
types.InstanceOf = (ctor) => createType((val) => val instanceof ctor)

export function test_InstanceOf (t) {
    const _Date = types.InstanceOf(Date)
    t.true(_Date.test(new Date()))
    t.false(_Date.test(Date.now()))
    t.end()
}

// **Optional** matches the type, or null/undefined.
types.Optional = (type) => createType((val) =>
    val === null || val === undefined || type.test(val))

export function test_Optional (t) {
    const _N = types.Optional(types.Number)
    t.true(_N.test(123))
    t.true(_N.test(undefined))
    t.true(_N.test(null))
    t.false(_N.test("string"))
    t.end()
}

// **OneOf** matches one of an array of values.
types.OneOf = (values) => createType((val) => values.indexOf(val) > -1)

export function test_OneOf (t) {
    const Enum = types.OneOf(["foo", "bar", "baz"])

    t.true(Enum.test("foo"))
    t.false(Enum.test("quux"))
    t.false(Enum.test(null))
    t.end()
}

// **OneOfType** matches one of an array of types.
// Has an additional method `matchType` which returns the first of its types
// that matches the specified value.
types.OneOfType = (types) => {
    const matchType = (val, failValue) =>
        types.find((type) => type.test(val)) || failValue
    return {
        matchType,
        test: (val) => !!matchType(val),
    }
}

export function test_OneOfType (t) {
    const vals = [
        null, undefined, false, "", 0, { a: 1, b: "b" },
    ]

    t.deepEquals(vals.map(types.OneOfType([types.Number, types.String]).test),
    [false, false, false, true, true, false])

    const T = types.OneOfType([types.Number, types.String])
    t.equal(T.matchType(123), types.Number)

    t.end()
}

// **ArrayOf** matches an array of any length where each item matches
// the provided type.
types.ArrayOf = (type) =>
    createType((vals) => types.Array.test(vals) && vals.every(type.test))

export function test_ArrayOf (t) {
    t.true(types.ArrayOf(types.Number).test([1, 2, 3]))
    t.false(types.ArrayOf(types.Number).test(["foo", "bar", "baz"]))
    t.false(types.ArrayOf(types.Number).test([1, 2, "foo", 4]))
    t.false(types.ArrayOf(types.Number).test([1, 2, null, 4]))
    t.end()
}

// **ObjectOf** matches an object of any size where each item matches
// the provided type.
types.ObjectOf = (type) => createType((vals) => types.Object.test(vals) &&
    Object.keys(vals).every((key) => type.test(vals[key])))

export function test_ObjectOf (t) {
    t.true(types.ObjectOf(types.Number).test({ foo: 1, bar: 2 }))
    t.false(types.ObjectOf(types.Number).test({ foo: 1, bar: "string" }))
    t.false(types.ObjectOf(types.Number).test({ foo: 1, bar: 2, baz: undefined }))
    t.end()
}

// ## Shape types

// **Tuple** matches an array of fixed length and shape.
types.Tuple = (shape) => createType((vals) =>
    vals.length === shape.length && shape.every((type, i) =>
        type.test(vals[i])))

export function test_Tuple (t) {
    const Point = types.Tuple([types.Number, types.Number])
    t.true(Point.test([10, 20]))
    t.false(Point.test([10, 20, 30]))
    t.false(Point.test(["10", 20]))
    t.false(Point.test([10]))

    t.true(types.Tuple([]).test([]))

    t.end()
}

// **Record** matches a heterogeneous array with named optional fields; for example, the arguments of a function. Records are the building blocks of type definitions; record definitons are themselves made of records.
//
// See tests for example record definitions.
//
// The Record constructor takes a second argument for handling extra arguments. Record types have an additional method `toObject` that converts a matching record to an object.
//
// [Record implementation](types-record.html)
types.Record = getRecord(types)

export function test_Record (t) {
    const Point = types.Record([
        ["x", types.Number],
        ["y", types.Number],
    ])

    t.true(Point.test([10, 20]))
    t.false(Point.test([10, "foo"]))
    t.false(Point.test([10, 20, 30]))

    t.end()
}

export function test_Record_self_reference (t) {
    const Action = types.Record([
        ["type", types.String],
        ["doc", types.String, "optional"],
        ["payloadType", types.Object, "optional"],
    ])

    t.true(Action.test(["fooAction"]))
    t.true(Action.test(["barAction", "with a doc", types.Number]))

    t.deepEquals(Action.toObject(["fooAction"]), { type: "fooAction" })
    t.deepEquals(
        Action.toObject(["barAction", "with a doc", types.Number]),
        { type: "barAction", doc: "with a doc", payloadType: types.Number })

    const RestAction = types.Record([
        ["type", types.String],
        ["doc", types.String, "optional"],
        ["payloadType", types.Type, "optional"],
    ], types.Shape)

    t.true(RestAction.test(["fooAction"]))
    t.true(RestAction.test(["fooAction", "with a doc"]))
    t.true(RestAction.test(
        ["fooAction",
            ["a", types.Number],
            ["b", types.Number]]))

    t.deepEquals(RestAction.toObject(["fooAction"]), { type: "fooAction" })
    const { payloadType: FooShape } = RestAction.toObject(
        ["fooAction", ["a", types.Number], ["b", types.Number]])

    t.true(FooShape.test({ a: 10, b: 20 }))

    t.end()
}

// **Shape** matches objects with a particular structure.
export function test_Shape (t) {
    const Point = types.Shape([
        ["x", "has a doc", types.Number],
        ["y", types.Number],
    ])

    t.true(Point.test({ x: 10, y: 20 }))
    t.false(Point.test({ x: 20 }))
    t.false(Point.test({ x: "foo", y: "bar" }))
    t.true(Point.test({ x: 10, y: 20, z: 100 }))

    const Location = types.Shape([
        ["id", types.String],
        ["point",
            ["x", types.Number],
            ["y", types.Number]],
    ])

    t.true(Location.test({ id: "foo", point: { x: 10, y: 20 } }))

    const Address = types.Shape([
        ["street", types.String],
        ["unit", types.String, "optional"],
        ["city", types.String],
        ["state", types.String],
        ["zip", types.String],
    ])

    t.true(Address.test({
        street: "123 Fake St.",
        unit: "Apartment 1B",
        city: "Brooklyn", state: "NY", zip: "10010",
    }))
    t.true(Address.test({
        street: "123 Fake St.",
        city: "Anytown", state: "MA", zip: "02020",
    }))
    t.false(Address.test({
        street: "123 Fake St.",
        unit: ["not", "a string"],
        city: "Brooklyn", state: "NY", zip: "10010",
    }))

    t.end()
}

types.Shape = (defs) => {
    const fields = defs.map((def) => {
        const { object, error, remainder } = ShapeField.buildObject(def)

        // handle recursive shape definitions
        if (error && remainder.length) {
            object.type = types.Shape(remainder)
        } else if (error || remainder.length) {
            throw new Error(`Invalid shape definition at field "${object.key}"`)
        }
        return object
    })

    const test = (obj) => {
        if (!obj) return false
        return fields.every(({ key, type, optional }) =>
            (optional && !(key in obj)) || type.test(obj[key]))
    }

    return { test }
}

const ShapeField = types.Record([
    ["key", types.String],
    ["doc", types.String, "optional"],
    ["type", types.Type],
    ["optional", types.Exactly("optional"), "optional"],
])

// **Variant** matches multiple related objects, distinguished by a type field. This is the idea that governs Redux actions, but the pattern appears all over the place. You may also know them as Algebraic Data Types or Disjoint Unions.
//
// Variant types include a `creators` field (aliased as `c`), an object map of type names to creator functions.
//
// See [Variants Are Not Unions](https://www.youtube.com/watch?v=ZQkIWWTygio) for more on the subject.
types.Variant = (defs, rootModifier) => {
    const creators = defs.map((def) => {
        return buildVariant(def, rootModifier)
    })

    const creatorMap = keyBy(creators, ({ field }) => field.type)

    const test = (val) =>
        creators.some((creator) => creator.test(val))

    return {
        creators: creatorMap,
        c: creatorMap,
        test,
    }
}

const VariantModifier = types.Shape([
    ["mapType", types.Function],
    ["mapAction", types.Function],
])

types.Variant.Field = types.Record([
    ["type", types.String],
    ["doc", types.String, "optional"],
    ["modifier", VariantModifier, "optional"],
    ["payloadType", types.Type, "optional"],
], types.Shape)

// this is shared with createActions
export function buildVariant (def, rootModifier) {
    const field = types.Variant.Field.toObject(def)
    const { mapType, mapAction } = composeModifiers(
        field.modifier, rootModifier)

    const type = mapType(field.type)
    const creator = field.payloadType
        ? (payload) => mapAction({ type, payload })
        : () => mapAction({ type })

    creator.type = type
    creator.field = field

    creator.test = (val) => {
        if (!val || !val.type || type !== val.type) { return false }

        // has payload when none expected
        if ((val.payload && !field.payloadType) ||
            // payload doesnt match
            (field.payloadType && !field.payloadType.test(val.payload))) {
            return false
        }

        return true
    }

    return creator
}

export function test_Variant (t) {
    const Maybe = types.Variant([
        ["just", types.Any],
        ["nothing"],
    ])

    t.deepEquals(Maybe.c.just("value"), {
        type: "just", payload: "value",
    })
    t.deepEquals(Maybe.c.nothing(), { type: "nothing" })

    const variant = types.Variant([
        ["foo"],
        ["bar", types.String],
        ["baz", "has a comment",
            ["a", types.Number],
            ["b", types.Number]],
    ])

    t.deepEquals(variant.c.foo(), { type: "foo" })
    t.deepEquals(variant.c.bar("value"), {
        type: "bar", payload: "value",
    })
    t.deepEquals(variant.c.baz({ a: 10, b: 20 }),
        { type: "baz", payload: { a: 10, b: 20 } })

    t.end()
}

// ### Variant modifiers
// these functions change the default construction of variant objects.

// **namespace** the type of a variant.
export const namespace = (ns) => ({ mapType: ns, mapAction: (x) => x })

// **addFields** to a variant body on construction
export const addFields = (fieldCreators) => ({
    mapType: (x) => x,
    mapAction: (action) => {
        const nextPayload = assign({}, action.payload)
        for (const key in fieldCreators) {
            nextPayload[key] = fieldCreators[key](action)
        }
        return assign({}, action, { payload: nextPayload })
    },
})

// **composeModifiers** allows a variant to have multiple modifiers.
const idModifier = { mapType: (x) => x, mapAction: (x) => x }

export function composeModifiers (a = {}, b = {}) {
    const _a = assign({}, idModifier, a)
    const _b = assign({}, idModifier, b)

    return {
        mapType: (type) => _a.mapType(_b.mapType(type)),
        mapAction: (action) => _a.mapAction(_b.mapAction(action)),
    }
}

export function test_Variant_modifiers (t) {
    const Maybe = types.Variant([
        ["just", types.Any],
        ["nothing"],
    ], namespace((type) => `maybe/${type}`))

    t.deepEquals(Maybe.c.just("value"), {
        type: "maybe/just", payload: "value",
    })
    t.deepEquals(Maybe.c.nothing(), { type: "maybe/nothing" })

    let nextId = 1
    const addID = addFields({ id: () => nextId++ })
    const V = types.Variant([
        ["foo"],
        ["bar", types.String],
        ["baz", "has a comment", addID,
            ["id", types.Number],
            ["a", types.Number],
            ["b", types.Number]],
    ])

    t.deepEquals(V.c.baz({ a: 10, b: 20 }),
        { type: "baz", payload: { id: 1, a: 10, b: 20 } })
    t.deepEquals(V.c.baz({ a: 10, b: 20 }),
        { type: "baz", payload: { id: 2, a: 10, b: 20 } })

    t.end()
}
