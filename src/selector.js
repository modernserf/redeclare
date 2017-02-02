import get from "lodash/get";

export function select(state, selectors, dependencies) {
    return dependencies.map(dep => {
        const selector = get(selectors, dep);
        if (!selector) {
            throw new Error(`Unknown selector dependency: ${dep}`);
        }
        return selector(state);
    });
}
