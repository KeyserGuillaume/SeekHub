function extendGraph(selectedNode) {
    if (selectedNode.type == "user"){
        extendGraphWithRepos(selectedNode.id);
    }
    else {
        extendGraphWithUsers(selectedNode.owner, selectedNode.id);
    }
}

function extendGraphWithRepos(user, addUser=false){
    // this function copies the code of extendGraphWithUser, can a fix be found ?
    // having G be a global variable is terrible, change that !
    if (addUser){
        sendQueryToGithubAPIv4(
            getUserAvatarUrlQuery(user),
            function(res){
                G.addUser(user, userAvatarUrlParser(res));
                updateGraph(G);
                extendGraphWithRepos(user);
            });
    }
    else{
        sendQueryToGithubAPIv4(
            getUserRepositoriesQuery(user),
            function(res){
                G.addRepositoriesOfUser(user, userRepositoriesParser(res));
                updateGraph(G);
            });
    }
}

function extendGraphWithUser(user){
    sendQueryToGithubAPIv4(
        getUserAvatarUrlQuery(user),
        function(res){
            G.addUser(user, userAvatarUrlParser(res));
            updateGraph(G);
        });
}

function extendGraphWithUsers(owner, repo){
    sendQueryToGithubAPIv3(
        getRepositoryContributorsUrl(owner, repo),
        function(res){
            G.addContributorsOfRepository(repo, owner, JSON.parse(res));
            updateGraph(G);
        });
}