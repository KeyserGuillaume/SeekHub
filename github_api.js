class GithubGraph{
    constructor(){
        this.nodes = [];
        this.links = [];
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

    formUserNode(user, avatar_url){
        return {"id": user, "type": "user", "avatar_url": avatar_url};
    }

    formRepositoryNode(repo, owner){
        return {"id": repo, "type": "repo", "owner": owner}
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
            this.addNodeIfAbsent(this.formRepositoryNode(repos[repo].id, repos[repo].owner));
            this.links.push({"source": user, "target": repos[repo].id, "viaFork":repos[repo].viaFork});
        }
    }

    addContributorsOfRepository(repo, owner, users){
        // directly reads the JSON-parsed answer of the API v3 response
        this.addRepository(repo, owner);
        for (var user in users){
            this.addNodeIfAbsent(this.formUserNode(users[user]["login"], users[user]["avatar_url"]));
            this.links.push({"source": users[user]["login"], "target": repo, "viaFork": false});
        }
    }
}
