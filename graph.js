class GithubGraph{
    // a graph in which nodes are added, never deleted, and which sends a copy
    // of itself to D3.js
    constructor(){
        this.nodes = [];
        this.links = [];
    }

    getVersionForD3Force(){
        if (!this.focusedNodeIndex && this.focusedNodeIndex !== 0){
            this.focusedNodeIndex = 0;
        this.nodes[0].hasFocus = true;
        }
        return {
            "nodes": this.nodes.slice(0, this.nodes.length), 
            "links": this.links.slice(0, this.links.length)
        };
    }

    getNodeById(nodeId){
        return this.nodes.find(function(n){ return n.id == nodeId;})
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
        var walker = this.nodes[this.focusedNodeIndex];
        visited[walker.is] = true;
        // take random neighbor, one we have not visited yet if possible
        var neighbors = this.getNeighbors(walker.id);
        let next = this.getRandomNeighbor(walker.id);
        console.log(neighbors.length);
        var preferredNeighbors = neighbors.filter(function(n){return !visited[n];});
        console.log("reduced to ", preferredNeighbors.length);
        if (preferredNeighbors.length > 0){
            var randomIndex = Math.round(Math.random() * (preferredNeighbors.length - 1));
            next = preferredNeighbors[randomIndex];
        }
        this.setFocus(next);
        visited[next] = true;
        next = this.getNodeById(next);
        this.extendNode(next, (function(){
            simulation.alphaTarget(0.3).restart();
            setTimeout((function(){this.doRandomWalkIteration(nbIter-1, visited);}).bind(this), 500);

        }).bind(this));   
    }

    BFS(to_visit=[], visited={}, beginning=true){
        if (beginning) to_visit = this.nodes[this.focusedNodeIndex];
        if (to_visit.length > 1000 || to_visit.length == 0) {
            simulation.alphaTarget(0).restart();
            return;
        }
        var next = to_visit[0];
        to_visit.shift();
        if (visited[next.id]) this.BFS(to_visit, visited, false);
        visited[next.id] = true;
        this.extendNode(next, (function(){
            simulation.alphaTarget(0.3).restart();
            updateGraph(this.getVersionForD3Force());
            var neighbors = this.getNeighbors(next.id);
            for (let i = 0; i < neighbors.length; i++){
                to_visit.push(this.getNodeById(neighbors[i]));
            }
            this.BFS(to_visit, visited, false);
        }).bind(this));
    }

    greedyWalkOfFame(previous=null, visited={}){
        var count = 0;
        for (var x in visited){
            count++;
        }
        if (count > 10) return;
        if (previous == null) previous = this.nodes[this.focusedNodeIndex];
        var neighbors = this.getNeighbors(previous.id);
        if (previous.type == "user"){
            // determine repository of maximum fork counts
            var maxIndex = -0.5;
            var max = 0;
            for (var n in neighbors){
                var forkCount = this.getNodeById(neighbors[n]).forkCount;
                if (forkCount > max){
                    if (visited[neighbors[n]]) continue;
                    max = forkCount;
                    maxIndex = n;
                }
            }
        } else {
            // wait 0.5s if none of the neighbors has a known repository count
            var ready = false;
            for (var n in neighbors){
                var userNode = this.getNodeById(neighbors[n]);
                if (!visited[userNode.id] && (userNode.repositoryCount)){
                    ready = true;
                }
            }
            if (!ready){
                setTimeout((function(){this.greedyWalkOfFame(previous, visited);}).bind(this), 500);
                return;
            }
            // determine user of maximum repository count
            var maxIndex = -0.5;
            var max = 0;
            for (var n in neighbors){
                var repoCount = this.getNodeById(neighbors[n]).repositoryCount;
                if (repoCount && repoCount > max){
                    if (visited[neighbors[n]]) continue;
                    max = repoCount;
                    maxIndex = n;
                }
            }
        }
        var next = this.getNodeById(neighbors[maxIndex]);
        this.extendNode(next, (function(){
            simulation.alphaTarget(0.3).restart();
            updateGraph(this.getVersionForD3Force());
            visited[next.id] = true;
            this.greedyWalkOfFame(next, visited);
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
            "hasFocus": false
        };
    }

    formRepositoryNode(repo, owner, isFork, forkCount){
        return {
            "id": repo,
            "type": "repo", 
            "owner": owner,
            "isFork": isFork,
            "hasFocus": false, 
            "forkCount": forkCount
        };
    }

    setFocus(nodeId){
        // this will break if we delete any node !
        if(this.focusedNodeIndex || this.focusedNodeIndex === 0){
            this.nodes[this.focusedNodeIndex].hasFocus = false;
        }  
        this.focusedNodeIndex = this.nodes.findIndex(function(n){ return n.id == nodeId;});
        this.nodes[this.focusedNodeIndex].hasFocus = true;
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
            var repoNode = this.formRepositoryNode(repos[repo].id, repos[repo].owner, repos[repo].isFork, repos[repo].forkCount);
            if (this.isNew(repoNode)){
                this.addNewNode(repoNode);
                this.addNewLink({"source": user, "target": repos[repo].id, "viaFork":repos[repo].viaFork});
            }
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
    
    extendNodeWithRepos(user, callback, addUser=false){
        if (addUser){
            getUserAvatarUrlAsync(user, (function(res){
                this.addUser(user, res);
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
    
    extendWithUser(user){
        getUserAvatarUrlAsync(user, (function(res){
            this.addUser(user, res);
            updateGraph(this.getVersionForD3Force());
        }).bind(this));
    }
    
    extendNodeWithUsers(owner, repo, callback){
        // query the contributors to the repo
        getRepositoryContributorsAsync(owner, repo, (function(res){
            // add these contributors to the graph
            this.addContributorsOfRepository(repo, owner, res);
            // make query for every contributor to get their repository count
            for (var user in res){
                // made the mistake to put var here at first...
                let userName = res[user]["login"];
                getUserRepositoryCountAsync(userName, (function(repositoryCount){
                    this.getNodeById(userName).repositoryCount = repositoryCount;
                }).bind(this));
            }
            // update graph and go callback. Notice that the repository counts are 
            // probably not available at the time of the callback.
            updateGraph(this.getVersionForD3Force());
            callback();
        }).bind(this));
    }
}
