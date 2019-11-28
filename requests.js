// A completely generic function for sending a request with XMLHttpRequest
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

// Github API v3: limited to 5000 requests per hour. Mostly used to get the
// collaborators of a repository.
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

// Github API v4: more powerful, more flexible. Rate limit is counted in points.
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

function getUserAvatarUrlAsync(username, callback){
    sendQueryToGithubAPIv4(
        {
            "query":`query {
                user(login:"` + username + `") {
                    avatarUrl
                }
            }`,
            "variables":{}
        },
        function(res){
            var result = JSON.parse(res).data.user.avatarUrl;
            callback(result);
        });
}

function getRepositoryParentAsync(owner, repo, callback){
    sendQueryToGithubAPIv4(
        {
            "query":`query {
                repository(owner:"` + owner + `", name:"` + repo + `") {
                  parent{
                    name
                    owner{login}
                    isFork
                  }
              }
            }`
        },
        function(res){
            var result = JSON.parse(res);
            result = result.data.repository.parent;
            callback(result);
        });
}

function postProcessUserRepositoriesAsync(result, i, callback) {
    // This postprocessing is asynchronous because sometimes we find out
    // that the request we made did not give us all the data we needed so
    // we do other ones. They are done one by one, in a blocking way.
    // The assumption is that result has been treated between 0 and i (excluded) so
    // i is set to 0 when the function is called from getUserRepositoriesAsync.
    for (let j = i; j < result.length; j++){
        var t = result[j];
        if (!t.node.isFork){
            result[j] = {
                "id": t.node.name, "owner": t.node.owner.login, "isFork": false, "viaFork": false
            };
        } else if(t.node.name != t.node.parent.name){
            result.splice(j+1, 0, t);
            result[j] = {
                "id": t.node.name, "owner": t.node.owner.login, "isFork": true, "viaFork": false
            };
            result[j+1].node.name = t.node.parent.name;
            postProcessUserRepositoriesAsync(result, j+1, callback);
            return;
        } else if (t.node.name == t.node.parent.name && !t.node.parent.isFork){
            result[j] = {
                "id": t.node.name, "owner": t.node.parent.owner.login, "viaFork": true
            };
        } else {
            // index j is for a repo which was forked from some other forked repo
            // so we find out the repo it was forked from higher up and we consider it
            // the parent, so that once the query result is known we can hopefully finish up.
            let transmittedResults = result;
            let transmittedCallback = callback;
            getRepositoryParentAsync(t.node.parent.owner.login, t.node.name, function(r){
                transmittedResults[j].node.parent = r;
                postProcessUserRepositoriesAsync(transmittedResults, j, transmittedCallback);
            });
            return;
        }
    }
    callback(result);
}

function getUserRepositoriesAsync(username, callback) {
    sendQueryToGithubAPIv4(
        {"query":`query {
            user(login:"` + username + `") {
                login
                repositories(first: 100) {
                    edges {
                        node {
                            name
                            owner{
                                login
                            }
                            isFork
                            parent{
                                name
                                owner{login}
                                isFork
                              }
                        }
                    }
                }
            }
        }`
        },
        function(res){
            var result = JSON.parse(res);   
            result = result.data.user.repositories.edges;
            postProcessUserRepositoriesAsync(result, 0, callback);
        });
}

function getRepositoryContributorsAsync(owner, repo, callback) {
    sendQueryToGithubAPIv3(
        "https://api.github.com/repos/" + owner + "/" + repo + "/contributors",
        function(res){
            var result = JSON.parse(res);
            callback(result);
        });
}

/*
function getRepositoryContributorsQuery(owner, name) {
    // it is a valid query, it works on their online console
    // but I get an error message from the API
    return {"query":`query {
                        repository(owner:"` + owner + `", name:"` + name + `") {
                            name
                            owner {login}
                            collaborators(first: 100) {
                                edges {
                                node {
                                    login
                                }
                                }
                            }
                            }
                    }`
    }
}
*/