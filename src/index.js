// # redeclare
//
// Declarative action & state management for redux
//
// ## Introduction
//
// Redux is a simple but flexible library for managing state in javascript applications using a programming model similar to [event sourcing](http://martinfowler.com/eaaDev/EventSourcing.html). Redux's flexibility comes from the small but highly composable set of functions that compose its API; this flexibility in turn has enabled a sizable ecosystem of plugins and helpers for redux.
//
// However, the simplicity comes at a cost. Redux has a reputation for both the complexity of its configuration and its tendency towards boilerplate. Many libraries that promise to reduce this complexity and repetition do so at the cost of Redux's _soul_ -- the many-to-many mapping of actions to state.
//
// Redeclare is an attempt to reduce the boilerplate of Redux configuration in a form that takes advantage of Redux's best qualities. Its focused on creating _schemas_ for actions and state that serve as both documentation and configuration, replacing the need for repetititve files full of constants and complex assemblages of helper functions.
//
// ## Examples
// - Counter [code](https://github.com/modernserf/redeclare/blob/master/examples/counter/src/index.js)
// - Todo List [code](https://github.com/modernserf/redeclare/tree/master/examples/todo)
// - Pixquisite [code](https://github.com/modernserf/pixquisite) [demo](http://pixquisite.club/)

// ## API

// ### Creating a Schema
// ```
// createSchema(actionDefinitions, selectorDefinitions)
// => Schema
// ```
export {
    createSchema,
    // ```
    // reducer(reducersPerAction, initState, [scope])
    // ```
    // create a reducer definition.
    reducer,
    // ```
    // selector(...selectorNames, combineSelectors)
    // ```
    // create a selector definition.
    selector
} from "./schema";
// [Schema examples and implementation](schema.html)

// ### connectors
// ```
// createConnector(schema, connector)
// => connector(selectorNames, actionNames, [mergeProps])
// ```
// Wraps a `connect` decorator (like the one in react-redux) with a schema-aware connector that lets you access selectors / reducers by _name_, not value. Works a little bit like dependency injection in Angular.
//
// Lets you write a connected component such as this:
// ```
// const Counter = connect(
//     (state) => ({ count: selectors.count(state) }),
//     { inc: actions.inc, dec: actions.dec }
// )(({ count, inc, dec }) => <div>
//     <h1>{count}</h1>
//     <button onClick={inc}>Increment</button>
//     <button onClick={dec}>Decrement</button>
// </div>)
// ```
// like this:
// ```
// const Counter = connect(["count"],["inc","dec"])(
//  ({ count, inc, dec }) => <div>
//     <h1>{count}</h1>
//     <button onClick={inc}>Increment</button>
//     <button onClick={dec}>Decrement</button>
// </div>)
// ```
export { createConnector } from "./connector";
// [Connector examples and implementation](connector.html)

// [Actions](actions.html)
export { createActions } from "./actions";
// [Reducers](reducers.html)
export { createReducer } from "./reducers";
