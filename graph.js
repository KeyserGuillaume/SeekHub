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

    getRandomNeighbor(nodeId){
        console.log(nodeId);
        var neighbors = this.links.filter(function(link){
            return (link.source.id == nodeId || link.target.id == nodeId);
            });
        var neighbors = neighbors.map(function(link){
            return link.source.id == nodeId ? link.target.id : link.source.id;
        });
        var randomIndex = Math.round(Math.random() * (neighbors.length - 1));
        console.log(randomIndex, neighbors[randomIndex], neighbors.length);
        return neighbors[randomIndex];
    }

    doRandomWalkIteration(nbIter = 10){
        if (nbIter < 0) {
            simulation.alphaTarget(0).restart();
            return;
        }
        // start from the focused node
        var walker = this.nodes[this.focusedNodeIndex];
        let next = this.getRandomNeighbor(walker.id);
        console.log(next);
        next = this.getNodeById(next);
        console.log(next);
        this.extendNode(next, (function(){
            this.setFocus(next.id);
            simulation.alphaTarget(0.3).restart();
            setTimeout((function(){this.doRandomWalkIteration(nbIter-1);}).bind(this), 1000);

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
        return {"id": user, "type": "user", "avatarUrl": avatarUrl, "hasFocus": false};
    }

    formRepositoryNode(repo, owner, isFork){
        return {"id": repo, "type": "repo", "owner": owner, "isFork": isFork, "hasFocus": false}
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
            var repoNode = this.formRepositoryNode(repos[repo].id, repos[repo].owner, repos[repo].isFork);
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
        // this function copies the code of extendGraphWithUser, can some fix be found ?
        // having G be a global variable is terrible, change that !
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
        getRepositoryContributorsAsync(owner, repo, (function(res){
            this.addContributorsOfRepository(repo, owner, res);
            updateGraph(this.getVersionForD3Force());
            callback();
        }).bind(this));
    }
}
