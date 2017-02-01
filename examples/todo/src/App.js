import React from "react";
import "./App.css";
import { connect } from "./state";

const TodoInput = connect([], { onSubmit: "addedTodo" })(
    class TodoInput extends React.Component {
        constructor() {
            super();
            this.state = { text: "" };
            this.onSubmit = e => {
                e.preventDefault();
                this.props.onSubmit(this.state.text);
                this.setState({ text: "" });
            };
            this.onChange = e => {
                this.setState({ text: e.target.value });
            };
        }
        render() {
            return (
                <form onSubmit={this.onSubmit}>
                    <input
                        type="text"
                        placeholder="What needs to be done?"
                        value={this.state.text}
                        onChange={this.onChange}
                    />
                </form>
            );
        }
    }
);

class TodoText extends React.Component {
    constructor() {
        super();
        this.state = {
            editMode: false,
            editText: ""
        };
        this.startEditMode = () => {
            this.setState({
                editMode: true,
                editText: this.props.todo.text
            });
        };
        this.onChange = e => {
            this.setState({
                editText: e.target.value
            });
        };
        this.onSubmit = e => {
            e.preventDefault();
            this.props.onSubmit(this.state.editText);
            this.setState({
                editMode: false,
                editText: ""
            });
        };
    }
    render() {
        const { todo: { text } } = this.props;
        const { editMode, editText } = this.state;
        if (!editMode) {
            return <div onDoubleClick={this.startEditMode}>{text}</div>;
        }
        return (
            <form onSubmit={this.onSubmit}>
                <input type="text" value={editText} onChange={this.onChange} />
            </form>
        );
    }
}

const TodoItem = connect([], {
    onToggle: "toggledStatus",
    onEdit: "editedTodo",
    onRemove: "deletedTodo"
})(({ todo, onToggle, onEdit, onRemove }) => (
    <div>
        <input
            type="checkbox"
            checked={todo.status === "completed"}
            onChange={() => onToggle(todo.id)}
        />
        <TodoText todo={todo} onSubmit={text => onEdit(todo.id, text)} />
        <button onClick={() => onRemove(todo.id)}>✖️</button>
    </div>
));

const TodoList = connect({ todos: "visibleTodos" }, {})(({ todos }) => (
    <ol>
        {todos.map(todo => <li key={todo.id}><TodoItem todo={todo} /></li>)}
    </ol>
));

const ItemsLeft = connect(["itemsLeft"], {})(({ itemsLeft }) => {
    switch (itemsLeft) {
        case 0:
            return <div>No items left</div>;
        case 1:
            return <div>1 item left</div>;
        default:
            return <div>{itemsLeft} items left</div>;
    }
});

const statuses = [
    { id: "all", label: "All" },
    { id: "active", label: "Active" },
    { id: "completed", label: "Completed" }
];

const ViewStatus = connect(["viewStatus"], { onChange: "setViewStatus" })((
    { viewStatus, onChange }
) => (
    <ul>
        {statuses.map(({ id, label }) => (
            <li key={id} className={viewStatus === id ? "active" : ""}>
                <button onClick={() => onChange(id)}>{label}</button>
            </li>
        ))}
    </ul>
));

const ClearCompleted = connect(["hasCompleted"], {
    onClear: "clearedCompleted"
})(({ hasCompleted, onClear }) => {
    if (!hasCompleted) {
        return null;
    }

    return <button onClick={onClear}>Clear Completed</button>;
});

function ViewOptions() {
    return (
        <div>
            <ItemsLeft />
            <ViewStatus />
            <ClearCompleted />
        </div>
    );
}

export default function App() {
    return (
        <div className="App">
            <header className="App__header">
                <h2>todos</h2>
            </header>
            <div className="App__body">
                <TodoInput />
                <TodoList />
                <ViewOptions />
            </div>
            <div className="App__instructions">
                <p>Double-click to edit a todo</p>
                <p>Created by Oscar Godson</p>
                <p>Part of TodoMVC</p>
            </div>
        </div>
    );
}
