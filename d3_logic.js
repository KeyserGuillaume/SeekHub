var svg = document.getElementById("svg-container");
svg.setAttribute("width", window.innerWidth);
svg.setAttribute("height", window.innerHeight);

var svg = document.getElementById("svg");
svg.setAttribute("width", window.innerWidth);
svg.setAttribute("height", window.innerHeight);


svg_container = d3.select("#svg-container");
svg = d3.select("#svg");
var width = svg.attr("width"),
    height = svg.attr("height");

svg.attr({
        "width": "100%",
        "height": "100%"
      });
svg_container.classed("svg-content-responsive", true)
             .call(d3.zoom().on("zoom", function () {
                 svg.attr("transform", d3.event.transform)
              }));

var simulation = d3.forceSimulation()
    .force("link", d3.forceLink().id(function(d) { return d.id; }))
    //.force("collision", d3.forceCollide(20))
    .force("charge", d3.forceManyBody().strength(-500).distanceMax(500)); // was -500 when no collision
    //.force("center", d3.forceCenter(width / 2, height / 2));

function updateGraph(graph) {

    var link = svg.selectAll(".continuous-line,.dashed-line")
    .data(graph.links)
    link = link.enter().append("line")
    .merge(link)
    .attr("class",  getLinkClass)

    var node = svg.selectAll(".nodes,.anchor-node")
    .data(graph.nodes)

    node.exit().remove();
    
    node = node.enter().append("g")
    .merge(node)
    .attr("class", getNodeClass);
    node.call(d3.drag()
        .on("start", dragstarted)
        .on("drag", dragged)
        .on("end", dragended));

    node.append("a")
    .attr("xlink:href", getNodeLinkUrl)
    .attr("target", "_blank")
    .append("image")
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
        if (selectedOnClickAction != "hyperlink"){
            d3.event.preventDefault();
        }
        if (selectedOnClickAction == "extend"){
            G.extendNode(n, function(){});
            updateGraph(G.getVersionForD3Force());
        }/* else if (selectedOnClickAction == "focus"){
            G.setAnchor1(n.id);
            updateGraph(G.getVersionForD3Force());
            simulation.alphaTarget(0.3).restart();
            setTimeout(function(){simulation.alphaTarget(0).restart();}, 2000);
        }*/
    });

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
    if (!d.isAnchor1 && !d.isAnchor2){
        d.fx = null;
        d.fy = null;
    }
}

function getNodeImageUrl(d) {
    if (d.type == "repo"){
        return "https://github.com/favicon.ico";
    } 
    else {
        return d.avatarUrl;
    }
}

function getNodeLinkUrl(d) {
    if (d.type == "repo"){
        return "https://github.com/" + d.owner + "/" + d.id;
    } 
    else {
        return "https://github.com/" + d.id;
    }
}

function getNodeClass(d) {
    if (d.isAnchor1 || d.isAnchor2){
        return "anchor-node";
    } else {
        return "nodes";
    }
}

function getLinkClass(d) {
    return (d.viaFork ? "dashed-line" : "continuous-line") + (d.onShortestPath ? " shortest-path" : "");
}