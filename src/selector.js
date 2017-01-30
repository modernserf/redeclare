import { findIn } from "./scope"

export function select (state, selectors, dependencies, scope) {
    const params = {}
    const pairs = toPairs(dependencies)
    for (let i = 0; i < pairs.length; i++) {
        const [key, value] = pairs[i]
        const dep = findIn(selectors, scope, value)
        if (!dep) { throw new Error(`Unknown selector dependency: ${key}`) }
        params[key] = dep(state)
    }
    return params
}

function toPairs (obj) {
    if (Array.isArray(obj)) { return obj.map((key) => [key, key]) }
    const arr = []
    for (const key in obj) { arr.push([key, obj[key]]) }
    return arr
}
