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
            this.links.push({"source": user, "target": repos[repo].id, "viaFork":repos[repo].isFork});
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

function sendQueryToUrl(url, headers, method, data, callback) {
    var xmlHttp = new XMLHttpRequest();
    xmlHttp.onreadystatechange = function () {
        if (xmlHttp.readyState == 4 && xmlHttp.status == 200)
            callback(xmlHttp.responseText);
    }
    xmlHttp.open(method, url, true);
    for (h in headers){
        xmlHttp.setRequestHeader(headers[h][0], headers[h][1]);
    }
    xmlHttp.send(data); // not a problem if data is null like when method is GET.
}

function sendQueryToGithubAPIv4(query, callback) {
    sendQueryToUrl(
        "https://api.github.com/graphql",
        [
            ["Authorization", "bearer " + TOKEN],
            ["Content-Type", "application/json;charset=UTF-8"]
        ],
        "POST",
        JSON.stringify(query),
        callback);
}

function sendQueryToGithubAPIv3(url, callback) {
    sendQueryToUrl(
        url,
        [
            ["Authorization", "token " + TOKEN],
            ["Accept", "application/vnd.github.v3+json"],
        ],
        "GET",
        null,
        callback);
}
