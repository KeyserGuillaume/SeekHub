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

function download(){
    // uses filesaver.js
    var svg_data = document.getElementById("svg-container").innerHTML; //put id of your svg element here

    var head = '<svg title="graph" version="1.1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink">';

    // if you have some additional styling like graph edges put them inside <style> tag
    var style = '<style>circle {cursor: pointer;stroke-width: 1.5px;}text {font: 10px arial;}path {stroke: DimGrey;stroke-width: 1.5px;} line {stroke: #aaa;} .dashed-line { stroke-dasharray: 3, 3;}</style> ';

    var full_svg = head +  style + svg_data + "</svg>";
    var blob = new Blob([full_svg], {type: "image/svg+xml"});  
    saveAs(blob, "graph.svg");
}

ReactDOM.render(e(MenuBar, {
    "onClickActions": [
        "extend", 
      //  "focus", 
        "hyperlink"
    ],
    "functionCalls": {
        "random walk": G.doRandomWalkIteration.bind(G), 
        "GWoF": G.greedyWalkOfFame.bind(G),
        "find path": G.findPath.bind(G),
        "BFS": G.BFS.bind(G),
        "download": download
    }
}), domContainer);