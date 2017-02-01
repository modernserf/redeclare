const get = require("lodash/get");
const { createElement, Component, PropTypes } = require("react");

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

export class Scope extends Component {
    constructor(props, context) {
        super(props, context);
        this.scopePath = (context.scopePath || []).concat([props.scope]);
    }
    getChildContext() {
        return { scopePath: this.scopePath };
    }
    render() {
        return this.props.children;
    }
}

Scope.propTypes = {
    scope: PropTypes.string.isRequired,
    children: PropTypes.element.isRequired
};

Scope.contextTypes = Scope.childContextTypes = {
    scopePath: PropTypes.arrayOf(PropTypes.string)
};

export function getScope(ChildComponent) {
    const ScopeConnector = class ScopeConnector extends Component {
        constructor(props, context) {
            super(props, context);
            this.scopePath = context.scopePath || [];
        }
        render() {
            const props = Object.assign({ scope: this.scopePath }, this.props);
            return createElement(ChildComponent, props);
        }
    };
    ScopeConnector.contextTypes = {
        scopePath: PropTypes.arrayOf(PropTypes.string)
    };
    return ScopeConnector;
}

// find key in object on path, starting at max depth and working back up
export function findIn(obj, path, key) {
    const keyArr = Array.isArray(key) ? key : [key];
    const atPath = get(obj, path.concat(keyArr));
    if (atPath) {
        return atPath;
    }
    if (!path.length) {
        return null;
    }
    return findIn(obj, path.slice(0, -1), key);
}
