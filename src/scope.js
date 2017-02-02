export const scopedActionType = "redeclare/scopedAction";

export function buildScope(scopes) {
    if (!scopes.length) {
        return x => x;
    }
    if (scopes.length === 1) {
        return action => scopedAction(scopes[0], action);
    }
    return action =>
        scopedAction(scopes[0], buildScope(scopes.slice(1))(action));
}

export function scopedAction(scope, action) {
    return { type: scopedActionType, scope, action };
}
