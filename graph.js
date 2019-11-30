class GithubGraph{
    constructor(){
        this.nodes = [];
        this.links = [];
    }

    getCopy(){
        return {
            "nodes": this.nodes.slice(0, this.nodes.length), 
            "links": this.links.slice(0, this.links.length)
        };
    }

    isAbsent(node){
        return typeof this.nodes.find(function(element){
            return element.id == node.id;
        }) == 'undefined';
    }

    addNodeIfAbsent(node){
        if (this.isAbsent(node)){
            this.nodes.push(node);
        }
    }

    addLink(link){
        this.links.push(link);
    }

    formUserNode(user, avatar_url){
        return {"id": user, "type": "user", "avatar_url": avatar_url};
    }

    formRepositoryNode(repo, owner, isFork){
        return {"id": repo, "type": "repo", "owner": owner, "isFork": isFork}
    }

    addUser(user, avatar_url){
        this.addNodeIfAbsent(this.formUserNode(user, avatar_url));
    }
    
    addRepository(repo, owner){
        this.addNodeIfAbsent({"id": repo, "type": "repo", "owner": owner});
    }

    addRepositoriesOfUser(user, repos){
        // here we do not deal with the possibility that the graph does not yet have
        // the user, but I would prefer dealing with it by making an API call.
        if (this.isAbsent(this.formUserNode(user))){
            throw "cannot add repositories of user not already in the graph";
        }
        for (var repo in repos){
            this.addNodeIfAbsent(this.formRepositoryNode(repos[repo].id, repos[repo].owner, repos[repo].isFork));
            this.addLink({"source": user, "target": repos[repo].id, "viaFork":repos[repo].viaFork});
        }
    }

    addContributorsOfRepository(repo, owner, users){
        // directly reads the JSON-parsed answer of the API v3 response
        // we assume the repo is not forked from another repo and we know the
        // contributors we get in this case did not contribute only on some fork.
        this.addRepository(repo, owner);
        for (var user in users){
            this.addNodeIfAbsent(this.formUserNode(users[user]["login"], users[user]["avatar_url"]));
            this.addLink({"source": users[user]["login"], "target": repo, "viaFork": false});
        }
    }

    extendNode(selectedNode) {
        if (selectedNode.type == "user"){
            this.extendNodeWithRepos(selectedNode.id);
        }
        else if (!selectedNode.isFork){
            this.extendNodeWithUsers(selectedNode.owner, selectedNode.id);
        }
    }
    
    extendNodeWithRepos(user, addUser=false){
        // this function copies the code of extendGraphWithUser, can some fix be found ?
        // having G be a global variable is terrible, change that !
        if (addUser){
            getUserAvatarUrlAsync(user, (function(res){
                this.addUser(user, res);
                updateGraph(this.getCopy());
                this.extendNodeWithRepos(user);
            }).bind(this));
        }
        else{
            getUserRepositoriesAsync(user, (function(res){
                this.addRepositoriesOfUser(user, res);
                updateGraph(this.getCopy());
            }).bind(this));
        }
    }
    
    extendWithUser(user){
        getUserAvatarUrlAsync(user, (function(res){
            this.addUser(user, res);
            updateGraph(this.getCopy());
        }).bind(this));
    }
    
    extendNodeWithUsers(owner, repo){
        getRepositoryContributorsAsync(owner, repo, (function(res){
            this.addContributorsOfRepository(repo, owner, res);
            updateGraph(this.getCopy());
        }).bind(this));
    }
}
