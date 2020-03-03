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
            let buttonData = this.props.onClickActions[actionIndex];
            L.push(
                e(
                    'button',
                    {
                        onClick: (function(){
                            this.setState({"selectedOnClickAction": buttonData.name});
                            selectedOnClickAction = buttonData.name
                        }).bind(this), 
                        className: buttonData.name == this.state.selectedOnClickAction ? "selected-button" : "button",
                        title: buttonData.hovertext
                    },
                    this.props.onClickActions[actionIndex].name
                )
            );
        }
        for (let callIndex in this.props.functionCalls){
            let buttonData = this.props.functionCalls[callIndex];
            L.push(
                e(
                    'button',
                    {
                        onClick: (function(){
                            buttonData.call();
                        }), 
                        className: "button",
                        title: buttonData.hovertext
                    },
                    buttonData.name
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
        {name:"extend", hovertext:"With this mode, clicking on a node calls the GitHub API and adds a subset of its neighbors"}, 
      //  "focus", 
        {name:"hyperlink", hovertext:"With this mode, clicking on a node opens the corresponding GitHub page in a new tab"}
    ],
    "functionCalls": [
        {name:"random walk", call:G.doRandomWalkIteration.bind(G), hovertext:"Start from starting point a random walk on the graph"}, 
        {name:"GWoF", call:G.greedyWalkOfFame.bind(G), hovertext:"Start a greedy random walk visiting large projects"},
        {name:"find path", call:G.findPath.bind(G), hovertext:"Look for a path linking starting point to another user"},
        {name:"BFS", call:G.BFS.bind(G), hovertext:"If you know what BFS is, then you also know that it is a bad idea here"},
        {name:"download", call:download, hovertext:"Download the current view as an svg document"}
    ]
}), domContainer);