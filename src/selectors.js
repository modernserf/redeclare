// # Selectors
import { types } from "./types"

// **createSelectors** creates an object map of selectors -- functions that return segments of the app state.

// for reducers, it just selects the state for that reducer.
export function test_createSelectors_plain_reducers (t) {
    function fooReducer (state = 0, action) {
        return state
    }

    function barReducer (state = "bar", action) {
        return state
    }

    const selectors = createSelectors([
        ["foo", fooReducer, types.Number],
        ["bar", barReducer, types.String],
    ])

    const state = { foo: 0, bar: "bar" }

    t.equals(selectors.c.foo(state), state.foo)
    t.equals(selectors.c.bar(state), state.bar)
    t.end()
}

//
export function test_createSelectors_plain_selectors (t) {
    function fooReducer (state = 0, action) {
        return state
    }

    function barReducer (state = "bar", action) {
        return state
    }

    const foobar = select(({ foo, bar }) => `${bar}: ${foo}`)

    const selectors = createSelectors([
        ["foo", fooReducer, types.Number],
        ["bar", barReducer, types.String],
        ["foobar", foobar, types.String],
    ])

    const state = { foo: 0, bar: "bar" }
    t.equals(selectors.c.foobar(state), "bar: 0")
    t.end()
}

export function createSelectors (defs) {
    const fields = defs.map(buildFields)

    const selectors = fields.reduce((coll, field) => {
        const selector = createSelector(field)
        selector.field = field
        coll[field.name] = selector
        return coll
    }, {})
    return {
        c: selectors,
        selectors,
    }
}

function buildFields (def) {
    const field = SelectorDef.toObject(def)
    const matchedSelector = matchSelectorType(field)
    field.selectorType = matchedSelector.type
    field.selectorBody = matchedSelector.payload
    return field
}

function matchSelectorType ({ body }) {
    switch (SelectorBody.matchType(body)) {
    case PlainReducer:
        return SelectorField.c.plainReducer({ reducer: body })
    case SelectorField:
        return body
    }
    throw new Error(`${body} is not a valid selector body`)
}

function createSelector (field) {
    switch (field.selectorType) {
    case "plainSelector":
        return field.selectorBody.selector
    case "plainReducer":
        return (state) => state[field.name]
    }
    throw new Error(`${field.name} is not a selector`)
}

const SelectorField = types.Variant([
    ["plainReducer",
        ["reducer", types.Function]],
    ["plainSelector",
        ["selector", types.Function]],
])

export const select = (selector) => SelectorField.c.plainSelector({ selector })

const PlainReducer = types.Function

const SelectorBody = types.OneOfType([
    PlainReducer,
    SelectorField,
])

const SelectorDef = types.Record([
    ["name", types.String],
    ["doc", types.String, "optional"],
    ["body", SelectorBody],
    ["returnType", types.Type, "optional"],
], types.Shape)
