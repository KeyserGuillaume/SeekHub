var selectedOnClickAction = "extend";

const domContainer = document.getElementById("global-container");
const e = React.createElement;

class MenuBar extends React.Component {
    constructor(props) {
        super(props);
        this.state = {"selectedOnClickAction": selectedOnClickAction};
    }
    render(){
        var L = [];
        for (let actionIndex in this.props.onClickActions){
            let action = this.props.onClickActions[actionIndex];
            L.push(
                e(
                    'button',
                    {
                        onClick: (function(){
                            this.setState({"selectedOnClickAction": action});
                            selectedOnClickAction = action
                        }).bind(this), 
                        className: action == this.state.selectedOnClickAction ? "selected-button" : "button"
                    },
                    this.props.onClickActions[actionIndex]
                )
            );
        }
        for (let callIndex in this.props.functionCalls){
            let functionCall = this.props.functionCalls[callIndex];
            L.push(
                e(
                    'button',
                    {
                        onClick: (function(){
                            functionCall();
                        }), 
                        className: "button"
                    },
                    callIndex
                )
            );
        }
        return e('div', {id: "menu-bar-container"}, ...L);
    }
}

ReactDOM.render(e(MenuBar, {
    "onClickActions": ["extend", "focus"],
    "functionCalls": {"random walk": G.doRandomWalkIteration.bind(G)}
}), domContainer);