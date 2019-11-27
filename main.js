function extendGraph(selectedNode) {
    if (selectedNode.type == "user"){
        extendGraphWithRepos(selectedNode.id);
    }
    else {
        extendGraphWithUsers(selectedNode.owner, selectedNode.id);
    }
}

function extendGraphWithRepos(user, addUser=false){
    // this function copies the code of extendGraphWithUser, can some fix be found ?
    // having G be a global variable is terrible, change that !
    if (addUser){
        getUserAvatarUrlAsync(user, function(res){
            G.addUser(user, res);
            updateGraph(G);
            extendGraphWithRepos(user);
        });
    }
    else{
        getUserRepositoriesAsync(user, function(res){
            G.addRepositoriesOfUser(user, res);
            updateGraph(G);
        });
    }
}

function extendGraphWithUser(user){
    getUserAvatarUrlAsync(user, function(res){
        G.addUser(user, res);
        updateGraph(G);
    });
}

function extendGraphWithUsers(owner, repo){
    getRepositoryContributorsAsync(owner, repo, function(res){
        G.addContributorsOfRepository(repo, owner, res);
        updateGraph(G);
    });
}