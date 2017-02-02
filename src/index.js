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
// ## Examples (TODO)
// - Counter [code] [demo]
// - Todo List [code] [demo]
// - Pixquisite [code] [demo]

// ## API
// TODO: overview of public API

// [Actions](actions.html)
export { createActions } from "./actions";
// [Reducers](reducers.html)
export { createReducer } from "./reducers";
// [Selectors](selectors.html)
export { createSchema, selector, reducer } from "./schema";
// [Connector](connector.html)
export { createConnector } from "./connector";
