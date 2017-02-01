import { createStore } from "redux";
import { createSchema, createConnector, reducer, selector } from "redeclare";

const status = {
    all: "all",
    active: "active",
    completed: "completed",
    invert: stat => stat === "active" ? "completed" : "active"
};

const update = (todos, id, fn) =>
    todos.map(todo => todo.id === id ? fn(todo) : todo);

const m = (a, b) => Object.assign({}, a, b);

const schema = createSchema(
    {
        addedTodo: text => ({ type: "addedTodo", text, id: Date.now() }),
        editedTodo: ["id", "text"],
        deletedTodo: ["id"],
        toggledStatus: ["id"],
        markedAllAsDone: [],
        clearedCompleted: [],
        setViewStatus: ["status"]
    },
    {
        todos: reducer(
            {
                addedTodo: (todos, { text, id }) =>
                    todos.concat([{ text, id, status: status.active }]),
                editedTodo: (todos, { text, id }) =>
                    update(todos, id, todo => m(todo, { text })),
                deletedTodo: (todos, { id }) =>
                    todos.filter(todo => todo.id !== id),
                toggledStatus: (todos, { id }) =>
                    update(todos, id, todo =>
                        m(todo, { status: status.invert(todo.status) })),
                markedAllAsDone: todos =>
                    todos.map(todo => m(todo, { status: status.completed })),
                clearedCompleted: todos =>
                    todos.filter(todo => todo.status !== status.completed)
            },
            []
        ),
        viewStatus: reducer(
            { setViewStatus: (_, { status }) => status },
            status.all
        ),
        visibleTodos: selector(
            ["todos", "viewStatus"],
            ({ todos, viewStatus }) =>
                viewStatus === status.all
                    ? todos
                    : todos.filter(({ status }) => status === viewStatus)
        ),
        itemsLeft: selector(["todos"], ({ todos }) => todos.length),
        hasCompleted: selector(["todos"], ({ todos }) =>
            todos.some(todo => todo.status === status.completed))
    }
);

export const store = createStore(
    schema.reducer,
    window.__REDUX_DEVTOOLS_EXTENSION__ && window.__REDUX_DEVTOOLS_EXTENSION__()
);
export const connect = createConnector(schema);
