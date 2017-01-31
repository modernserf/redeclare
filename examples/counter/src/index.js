import "./index.css"
import React, { PropTypes } from "react"
import ReactDOM from "react-dom"
import { createSchema, reducer } from "redeclare"

const schema = createSchema({
    increment: [],
    decrement: [],
    add: ["value"],
    set: ["value"],
    reset: [],
}, {
    counter: reducer({
        increment: (count) => count + 1,
        decrement: (count) => count - 1,
        add: (count, { value }) => count + value,
        set: (_, { value }) => value,
        reset: () => 0,
    }, 0),
})

class App extends React.Component {
    state = schema.reducer(undefined, { type: "init " })
    bind = (actionCreator) => (...args) => {
        this.setState((state) => schema.reducer(state, actionCreator(...args)))
    }
    render () {
        const bind = this.bind
        const { counter } = schema.selectors
        const { increment, decrement, add, set, reset } = schema.actions

        return (
            <div className="App">
                <header><h1>{counter(this.state)}</h1></header>
                <div className="row">
                    <button onClick={bind(increment)}>+</button>
                    <button onClick={bind(decrement)}>-</button>
                    <NumberInput onChange={bind(add)}>Add</NumberInput>
                    <NumberInput onChange={bind(set)}>Set</NumberInput>
                    <button onClick={bind(reset)}>reset</button>
                </div>
            </div>
        )
    }
}

class NumberInput extends React.Component {
    static propTypes = {
        children: PropTypes.node,
        onChange: PropTypes.func.isRequired,
    }
    state = { input: 0 }
    onChangeInput = (e) => this.setState({ input: Number(e.target.value) })
    onSubmit = (e) => {
        e.preventDefault()
        this.props.onChange(this.state.input)
        this.setState({ input: 0 })
    }
    render () {
        return (
            <form onSubmit={this.onSubmit}>
                <label>{this.props.children}</label>
                <input type="number" value={this.state.input} onChange={this.onChangeInput}/>
                <button type="submit">OK</button>
            </form>
        )
    }
}

ReactDOM.render(
    <App />,
    document.getElementById("root")
)
