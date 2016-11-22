import { types, buildVariant } from "./types"
const keyBy = require("lodash/keyBy")
const groupBy = require("lodash/groupBy")

const SCOPED_ACTION = "redeclare/scopedAction"
const inScope = (scope) => ({
    mapType: () => SCOPED_ACTION,
    mapAction: (action) => ({
        type: SCOPED_ACTION,
        payload: { scope, action },
    }),
})

// # Actions
const Actions = types.Shape([
    ["test", types.Function],
    ["c", types.Object],
    ["schema", types.Array],
])

const Scope = types.Record([
    ["scope", types.String],
    ["doc", types.String, "optional"],
    ["actions", Actions],
])

const ActionField = types.OneOfType([
    types.Variant.Field,
    Scope,
])

export function createActions (defs, rootModifier) {
    const creators = defs.map((def) => {
        const defType = ActionField.matchType(def)
        if (defType === types.Variant.Field) {
            return buildVariant(def, rootModifier)
        } else {
            const { scope, actions } = Scope.toObject(def)
            const scopedActions = createActions(actions.schema, inScope(scope))
            return { scope, actions: scopedActions }
        }
    })

    const creatorMap = keyBy(creators, ({ field }) => field.type)
    const byType = groupBy(creators, ({ type }) => type)
    const scopeMap = keyBy(creators, ({ scope }) => scope)

    const test = (val) => {
        if (!val || !val.type) { return false }

        // check if scoped
        if (val.type === SCOPED_ACTION) {
            const { scope, action: scopedAction } = val.payload
            if (!scopeMap[scope]) { return false }

            return scopeMap[scope].actions.test(scopedAction)
        }

        if (!byType[val.type]) { return false }

        return byType[val.type].some((creator) => {
            const { payloadType } = creatorMap[val.type].field

            // has payload when none expected
            if ((val.payload && !payloadType) ||
                // payload doesnt match
                (payloadType && !payloadType.test(val.payload))) {
                return false
            }

            return true
        })
    }

    return {
        test,
        c: creatorMap,
        schema: defs,
    }
}
