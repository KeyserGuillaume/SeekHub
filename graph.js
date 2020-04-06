function minusImportance(node){
    return (node.type == "user") ? -node.repositoryCount: -node.forkCount;
}

function earliness(node){
    return Date.parse(node.createdAt);
}

class GithubGraph{
    // a graph in which nodes are added, never deleted, and which sends a copy
    // of itself to D3.js
    constructor(){
        this.nodes = [];
        this.links = [];
        this.anchor1NodeIndex = null;
        this.anchor2NodeIndex = null;
    }

    getVersionForD3Force(){
        if (!this.anchor1NodeIndex && this.anchor1NodeIndex !== 0){
            this.anchor1NodeIndex = 0;
            this.nodes[0].isAnchor1 = true;
            this.nodes[0].x = width/2;
            this.nodes[0].y = height/2;
            this.nodes[0].fx = width/2;
            this.nodes[0].fy = height/2;
        }
        return {
            "nodes": this.nodes.slice(0, this.nodes.length), 
            "links": this.links.slice(0, this.links.length)
        };
    }

    getNodeById(nodeId){
        return this.nodes.find(function(n){ return n.id == nodeId;})
    }

    getLink(s, t){
        return this.links.find(function(element){
            return (element.source.id == s && element.target.id == t) || (element.source.id == t && element.target.id == s);
        });
    }

    getNeighbors(nodeId){
        return this.links
        .filter(function(link){
            return (link.source.id == nodeId || link.target.id == nodeId);
            })
        .map(function(link){
            return link.source.id == nodeId ? link.target.id : link.source.id;
        });
    }

    getRandomNeighbor(nodeId){
        var neighbors = this.getNeighbors(nodeId);
        var randomIndex = Math.round(Math.random() * (neighbors.length - 1));
        return neighbors[randomIndex];
    }

    doRandomWalkIteration(nbIter = 30, visited={}){
        if (nbIter < 0) {
            simulation.alphaTarget(0).restart();
            return;
        }
        // start from the focused node
        var walker = this.nodes[this.anchor1NodeIndex];
        visited[walker.is] = true;
        // take random neighbor, one we have not visited yet if possible
        var neighbors = this.getNeighbors(walker.id);
        let next = this.getRandomNeighbor(walker.id);
        var preferredNeighbors = neighbors.filter(function(n){return !visited[n];});
        if (preferredNeighbors.length > 0){
            var randomIndex = Math.round(Math.random() * (preferredNeighbors.length - 1));
            next = preferredNeighbors[randomIndex];
        }
        this.setAnchor1(next);
        visited[next] = true;
        next = this.getNodeById(next);
        this.extendNode(next, (function(){
            simulation.alphaTarget(0.3).restart();
            setTimeout((function(){this.doRandomWalkIteration(nbIter-1, visited);}).bind(this), 500);

        }).bind(this));   
    }

    BFS(toVisit=[], visited={}, beginning=true){
        if (beginning) toVisit = [this.nodes[this.anchor1NodeIndex]];
        if (toVisit.length > 2000 || toVisit.length == 0) {
            simulation.alphaTarget(0).restart();
            return;
        }
        var next = toVisit[0];
        toVisit.shift();
        if (visited[next.id]) this.BFS(toVisit, visited, false);
        visited[next.id] = true;
        this.extendNode(next, (function(){
            simulation.alphaTarget(0.3).restart();
            updateGraph(this.getVersionForD3Force());
            var neighbors = this.getNeighbors(next.id);
            for (let i = 0; i < neighbors.length; i++){
                toVisit.push(this.getNodeById(neighbors[i]));
            }
            setTimeout((function(){this.BFS(toVisit, visited, false)}).bind(this), 400);
        }).bind(this));
    }

    gradientDescent(previous=null, visited={}, f, callback=null){
        // f is a real function defined on all nodes (both
        // users and repos), and may be null if the data is not there.
        // this method minimizes f with a gradient descent.
        // if a callback is given, only one step will be done;
        // if no callback is given, then steps will be done until
        // there are 10 entries in visited.
        var count = 0;
        for (var x in visited){
            count++;
        }
        if (count > 10) {
            simulation.alphaTarget(0).restart();
            return;
        }
        if (previous == null) previous = this.nodes[this.anchor1NodeIndex];
        var neighbors = this.getNeighbors(previous.id);
        // check at least one neighbor has the required data (only the case of user nodes for now)
        var ready = false;
        for (var n in neighbors){
            var node = this.getNodeById(neighbors[n]);
            if (!visited[node.id] && f(node)){
                ready = true;
            }
        }
        // wait 0.5s if that's not the case (probably enough)
        if (!ready){
            setTimeout((function(){this.gradientDescent(previous, visited, f, callback);}).bind(this), 500);
            return;
        }
        // determine neighbor minimizing f
        var minIndex = null;
        var min = Infinity;
        for (var n in neighbors){
            var value = f(this.getNodeById(neighbors[n]));
            if (value < min){
                if (visited[neighbors[n]]) continue;
                min = value;
                minIndex = n;
            }
        }
        var next = this.getNodeById(neighbors[minIndex]);
        this.extendNode(next, (function(){
            simulation.alphaTarget(0.3).restart();
            updateGraph(this.getVersionForD3Force());
            visited[next.id] = true;
            if (callback){
                callback(next);
            } else {
                this.gradientDescent(next, visited, f);
            }
        }).bind(this));
    }

    greedyWalkOfFame(){
        this.gradientDescent(null, {}, minusImportance);
    }

    greedyWalkOfAge(){
        this.gradientDescent(null, {}, earliness);
    }

    initializeColor(color, x){
        // do a BFS and give the color x to every node seen from anchor x
        // x in {1, 2}
        var visited = {};
        var toVisit = [this.nodes[x == 1 ? this.anchor1NodeIndex : this.anchor2NodeIndex]];
        while (toVisit.length > 0){
            var next = toVisit[0];
            toVisit.shift();
            color[next.id] = x;
            var neighbors = this.getNeighbors(next.id);
            for (let i = 0; i < neighbors.length; i++){
                if (!visited[neighbors[i]]){
                    toVisit.push(this.getNodeById(neighbors[i]));
                }
            }
            visited[next.id] = true;
        }
    }

    shortestPathColoring(){
        // the path is shortest in the very small subgraph we got from Github API, in general it is not the shortest
        // do BFS starting from anchor1
        var visited = {};
        var toVisit = [this.nodes[this.anchor1NodeIndex]];
        var predecesssors = {};
        var found = false;
        while (toVisit.length > 0 && !found){
            var next = toVisit[0];
            toVisit.shift();
            var neighbors = this.getNeighbors(next.id);
            for (let i = 0; i < neighbors.length; i++){
                if (!visited[neighbors[i]]){
                    toVisit.push(this.getNodeById(neighbors[i]));
                    predecesssors[neighbors[i]] = next.id;
                    if (neighbors[i] == this.nodes[this.anchor2NodeIndex].id){
                        found = true;
                        break;
                    }
                }
            }
            visited[next.id] = true;
        }
        if (!found){
            console.log("The shortest path coloring did not find a path between " + this.nodes[this.anchor1NodeIndex].id + " and " + this.nodes[this.anchor2NodeIndex].id);
            return;
        }
        // now start again in the other direction, ie from anchor 2 back to anchor 1
        var start = this.nodes[this.anchor2NodeIndex].id;
        var current = start;
        var end = this.nodes[this.anchor1NodeIndex].id;
        while (current != end){
            var next = predecesssors[current];
            var link = this.getLink(next, current);
            link.onShortestPath = true;
            current = next;
        }
        updateGraph(this.getVersionForD3Force());
    }

    greedyBidirectionalPathFinding(previous1=null, previous2=null, visited1={}, visited2={}, color={}){
        // We expand a node of the graph component of anchor 1 and anchor 2 alternately.
        // The objective is to find a path between them, going through the heavy forkers / biggest projects.
        // component of anchor 1 has color 1, component of anchor 2 has color 2.
        // the colors propagate via the edges, that's how we find when the two components
        // become one connected component.
        if (previous1 == null) {
            previous1 = this.nodes[this.anchor1NodeIndex];
            visited1[previous1.id] = 0;
            this.initializeColor(color, 1);
            if (color[this.nodes[this.anchor2NodeIndex].id] == 1) {
                this.shortestPathColoring();
                simulation.alphaTarget(0.3).restart();
                setTimeout(function(){simulation.alphaTarget(0).restart();}, 500);
                return;
            }
            this.initializeColor(color, 2);
        }
        if (previous2 == null) {
            previous2 = this.nodes[this.anchor2NodeIndex];
            visited2[previous2.id] = 0;
        }
        var count1 = 0;
        for (var x in visited1){
            count1++;
        }
        var count2 = 0;
        for (var x in visited2){
            count2++;
        }
        if (count1 <= count2){
            this.gradientDescent(previous1, visited1, minusImportance, (function(next){
                var neighbors = this.getNeighbors(next.id);
                for (var n in neighbors){
                    if (color[neighbors[n]] == 2) {
                        this.shortestPathColoring();
                        simulation.alphaTarget(0).restart();
                        return;
                    }
                    color[neighbors[n]] = 1;
                }
                this.greedyBidirectionalPathFinding(next, previous2, visited1, visited2, color);
            }).bind(this));
        } else {
            this.gradientDescent(previous2, visited2, minusImportance, (function(next){
                var neighbors = this.getNeighbors(next.id);
                for (var n in neighbors){
                    if (color[neighbors[n]] == 1) {
                        this.shortestPathColoring();
                        simulation.alphaTarget(0).restart();
                        return;
                    }
                    color[neighbors[n]] = 2;
                }
                this.greedyBidirectionalPathFinding(previous1, next, visited1, visited2, color);
            }).bind(this));
        }

    }

    findPath(){
        var t = prompt("Write a user's login", "mathieuorhan");
        this.extendWithUser(t, (function(){
            this.setAnchor2(t);
            this.extendNode(this.getNodeById(t), this.greedyBidirectionalPathFinding.bind(this));
        }).bind(this));
    }

    isNew(node){
        return typeof this.nodes.find(function(element){
            return element.id == node.id;
        }) == 'undefined';
    }

    isNewLink(link){
        return typeof this.links.find(function(element){
            return element.source == link.source && element.target == link.target;
        }) == 'undefined';
    }

    addNewNode(node){
        this.nodes.push(node);
    }

    addNodeIfNew(node){
        if (this.isNew(node)){
            this.addNewNode(node);
        }
    }

    addNewLink(link){
        this.links.push(link);
    }

    formUserNode(user, avatarUrl){
        return {
            "id": user, 
            "type": "user", 
            "avatarUrl": avatarUrl, 
            "isAnchor1": false, 
            "isAnchor2": false,
            "repositoryCount": null,    // these attribute become available after
            "createdAt": null         // a second query, made for every user
        };
    }

    formRepositoryNode(repo, owner, isFork, forkCount, createdAt){
        return {
            "id": repo,
            "type": "repo",
            "owner": owner,
            "isFork": isFork,
            "isAnchor1": false, 
            "isAnchor2": false, 
            "forkCount": forkCount,
            "createdAt": createdAt
        };
    }

    setAnchor1(nodeId){
        // this will break if we delete any node !
        if(this.anchor1NodeIndex || this.anchor1NodeIndex === 0){
            var previous = this.nodes[this.anchor1NodeIndex];
            previous.isAnchor1 = false;
            previous.fx = null;
            previous.fy = null;
        }  
        this.anchor1NodeIndex = this.nodes.findIndex(function(n){ return n.id == nodeId;});
        var anchorNode = this.nodes[this.anchor1NodeIndex];
        anchorNode.isAnchor1 = true;
        anchorNode.x = width/2;
        anchorNode.y = height/2;
        anchorNode.fx = width/2;
        anchorNode.fy = height/2;
        updateGraph(this.getVersionForD3Force());
    }

    setAnchor2(nodeId){
        // this will break if we delete any node !
        if(this.anchor2NodeIndex || this.anchor2NodeIndex === 0){
            var previous = this.nodes[this.anchor2NodeIndex];
            previous.isAnchor2 = false;
            previous.fx = null;
            previous.fy = null;
        }  
        this.anchor2NodeIndex = this.nodes.findIndex(function(n){ return n.id == nodeId;});
        var anchorNode = this.nodes[this.anchor2NodeIndex];
        anchorNode.isAnchor2 = true;
        anchorNode.x = -width/2;
        anchorNode.y = height/2;
        anchorNode.fx = -width/2;
        anchorNode.fy = height/2;
        updateGraph(this.getVersionForD3Force());
    }

    addUser(user, avatar_url){
        this.addNodeIfNew(this.formUserNode(user, avatar_url));
    }
    
    addRepository(repo, owner){
        this.addNodeIfNew({"id": repo, "type": "repo", "owner": owner});
    }

    addRepositoriesOfUser(user, repos){
        // here we do not deal with the possibility that the graph does not yet have
        // the user, but I would prefer dealing with it by making an API call.
        if (this.isNew(this.formUserNode(user))){
            throw "cannot add repositories of user not already in the graph";
        }
        for (var repo in repos){
            var repoNode = this.formRepositoryNode(
                repos[repo].id, repos[repo].owner, repos[repo].isFork, 
                repos[repo].forkCount, repos[repo].createdAt
                );
            if (this.isNew(repoNode)){
                this.addNewNode(repoNode);
            }
            this.addNewLink({"source": user, "target": repos[repo].id, "viaFork":repos[repo].viaFork});
        }
    }

    addContributorsOfRepository(repo, owner, users){
        // directly reads the JSON-parsed answer of the API v3 response
        // we assume the repo is not forked from another repo and we know the
        // contributors we get in this case did not contribute only on some fork.
        this.addRepository(repo, owner);
        for (var user in users){
            var userNode = this.formUserNode(users[user]["login"], users[user]["avatar_url"]);
            var link = {"source": users[user]["login"], "target": repo, "viaFork": false};
            if (this.isNew(userNode)){
                this.addNewNode(userNode);
                this.addNewLink(link);
            } else if (this.isNewLink(link)) {
                this.addNewLink(link);
            }
        }
    }

    extendNode(selectedNode, callback) {
        if (selectedNode.type == "user"){
            this.extendNodeWithRepos(selectedNode.id, callback);
        }
        else if (!selectedNode.isFork){
            this.extendNodeWithUsers(selectedNode.owner, selectedNode.id, callback);
        }
    }

    addUserData(userName){
        getUserDataAsync(userName, (function(data){
            this.getNodeById(userName).repositoryCount = data.repositoryCount;
            this.getNodeById(userName).createdAt = data.createdAt;
        }).bind(this));
    }
    
    extendNodeWithRepos(user, callback, addUser=false){
        if (addUser){
            getUserAvatarUrlAsync(user, (function(res){
                this.addUser(user, res);
                this.addUserData(user);
                updateGraph(this.getVersionForD3Force());
                this.extendNodeWithRepos(user, callback);
            }).bind(this));
        }
        else{
            getUserRepositoriesAsync(user, (function(res){
                this.addRepositoriesOfUser(user, res);
                updateGraph(this.getVersionForD3Force());
                callback();
            }).bind(this));
        }
    }
    
    extendWithUser(user, callback){
        // not used for most users added from extension of repository node
        // because API v3 gives the avatar URL for free
        getUserAvatarUrlAsync(user, (function(res){
            this.addUser(user, res);
            this.addUserData(user);
            updateGraph(this.getVersionForD3Force());
            callback();
        }).bind(this));
    }
    
    extendNodeWithUsers(owner, repo, callback){
        // query the contributors to the repo
        getRepositoryContributorsAsync(owner, repo, (function(res){
            // add these contributors to the graph
            this.addContributorsOfRepository(repo, owner, res);
            // make query for every contributor to get their repository count, date of creation...
            for (var user in res){
                // made the mistake to put var here at first...
                let userName = res[user]["login"];
                this.addUserData(userName);
            }
            // update graph and go callback. Notice that the user data is 
            // probably not available at the time of the callback.
            updateGraph(this.getVersionForD3Force());
            callback();
        }).bind(this));
    }
}
