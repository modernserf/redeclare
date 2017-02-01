import { findIn } from "./scope";

export function select(state, selectors, dependencies, scope) {
    return toPairs(dependencies).reduce(
        (params, [key, value]) => {
            const dep = findIn(selectors, scope, value);
            if (!dep) {
                throw new Error(`Unknown selector dependency: ${key}`);
            }
            params[key] = dep(state);
            return params;
        },
        {}
    );
}

function toPairs(obj) {
    return Array.isArray(obj)
        ? obj.map(key => [key, key])
        : Object.keys(obj).map(key => [key, obj[key]]);
}
