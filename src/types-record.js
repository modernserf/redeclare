// used internally for building type definitions
export const getRecord = (types) => {
    const Optional = types.Exactly("optional")

    const tuples = {
        nameType: types.Tuple([types.String, types.Type]),
        nameCommentType: types.Tuple([
            types.String, types.String, types.Type]),
        nameTypeOptional: types.Tuple([types.String, types.Type, Optional]),
        nameCommentTypeOptional: types.Tuple([
            types.String, types.String, types.Type, Optional]),
    }

    const Field = types.OneOfType([
        tuples.nameType,
        tuples.nameCommentType,
        tuples.nameTypeOptional,
        tuples.nameCommentTypeOptional,
    ])

    // bootstrap record parsing (a field definition is made of fields)
    const parseField = (arr) => {
        const shape = Field.matchType(arr)
        if (!shape) { throw new Error(`Invalid record field ${arr[0]}`) }

        if (shape === tuples.nameType) {
            const [name, type] = arr
            return { name, type, comment: "", optional: false }
        } else if (shape === tuples.nameCommentType) {
            const [name, comment, type] = arr
            return { name, type, comment, optional: false }
        } else if (shape === tuples.nameTypeOptional) {
            const [name, type] = arr
            return { name, type, comment: "", optional: true }
        } else {
            const [name, comment, type] = arr
            return { name, type, comment, optional: true }
        }
    }
    const baseRecord = (fields, vals) => {
        const object = {}
        let valIndex = 0 // second counter for traversing values
        for (let i = 0; i < fields.length; i++) {
            const { name, type, optional } = fields[i]
            const val = vals[valIndex]

            if (type.test(val)) {   // field matches
                object[name] = val
                valIndex++
            } else if (!optional) { // mandatory field, doesn't match
                return { object, remainder: vals.slice(valIndex), error: true }
            }
            // otherwise optional field; continue
        }
        return { object, remainder: vals.slice(valIndex) }
    }

    return (defs, handleRemainder) => {
        const fields = defs.map(parseField)
        const lastField = fields[fields.length - 1]

        const toObject = (val) => {
            const { object, remainder, error } = baseRecord(fields, val)
            if (error) { return undefined }
            if (!remainder.length) { return object }
            if (!handleRemainder) { return undefined }

            const rest = handleRemainder(remainder)
            if (!lastField.type.test(rest)) { return undefined }

            object[lastField.name] = rest
            return object
        }
        return {
            buildObject: (val) => baseRecord(fields, val),
            toObject,
            test: (val) => !!toObject(val),
        }
    }
}
