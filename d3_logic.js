var svg = document.getElementById("svg");
svg.setAttribute("width", window.innerWidth);
svg.setAttribute("height", window.innerHeight);

svg = d3.select("svg");
var width = +svg.attr("width"),
    height = +svg.attr("height");

var simulation = d3.forceSimulation()
    .force("link", d3.forceLink().id(function(d) { return d.id; }))
    //.force("collision", d3.forceCollide(20))
    .force("charge", d3.forceManyBody().strength(-500)); // was -500 when no collision
    //.force("center", d3.forceCenter(width / 2, height / 2));

function updateGraph(graph) {

    var link = svg.selectAll(".continuous-line,.dashed-line")
    .data(graph.links);
    link = link.enter().append("line")
    .attr("class",  getLinkClass)
    .merge(link);

    var node = svg.selectAll(".nodes,.focused-node")
    .data(graph.nodes)

    node.exit().remove();
    
    node = node.enter().append("g")
    .merge(node)
    .attr("class", getNodeClass)
    .call(d3.drag()
        .on("start", dragstarted)
        .on("drag", dragged)
        .on("end", dragended));

    node.append("image")
    .attr("xlink:href", getNodeImageUrl)
    .attr("x", -8)
    .attr("y", -8)
    .attr("width", 16)
    .attr("height", 16);

    node.append("text")
    .attr("dx", 12)
    .attr("dy", ".35em")
    .text(function(d) { return d.id });

    node.on('click', function(n){
        if (selectedOnClickAction == "extend"){
            G.extendNode(n, function(){});
        }
        else if (selectedOnClickAction == "focus"){
            G.setFocus(n.id);
        }
        updateGraph(G.getVersionForD3Force());
    });

    if (graph.nodes.length > 0){
        // we put a centering force only on the node element in focus
        var centeringOneNode = d3.forceCenter(width / 2, height / 2);
        var init = centeringOneNode.initialize;
        centeringOneNode.initialize = function(nodes){
            init(nodes.filter(function(n, i){return n.hasFocus;}))
        }
        simulation.force("center", centeringOneNode);
    }

    simulation
        .nodes(graph.nodes)
        .on("tick", ticked);

    simulation.force("link")
        .links(graph.links);

    function ticked() {
        link
            .attr("x1", function(d) { return d.source.x; })
            .attr("y1", function(d) { return d.source.y; })
            .attr("x2", function(d) { return d.target.x; })
            .attr("y2", function(d) { return d.target.y; });

        node.attr("transform", function(d) {
            return "translate(" + d.x + "," + d.y + ")"; 
        });
    }
}

function dragstarted(d) {
    if (!d3.event.active) simulation.alphaTarget(0.3).restart();
    d.fx = d.x;
    d.fy = d.y;
}

function dragged(d) {
    d.fx = d3.event.x;
    d.fy = d3.event.y;
}

function dragended(d) {
    if (!d3.event.active) simulation.alphaTarget(0);
    d.fx = null;
    d.fy = null;
}

function getNodeImageUrl(d) {
    if (d.type == "repo"){
        return "https://github.com/favicon.ico";
    } 
    else {
        return d.avatarUrl;
    }
}

function getNodeClass(d) {
    if (d.hasFocus){
        return "focused-node";
    } else {
        return "nodes";
    }
}

function getLinkClass(d) {
    if (d.viaFork){
        return "dashed-line";
    } else {
        return "continuous-line";
    }
}