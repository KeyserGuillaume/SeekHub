function userAvatarUrlQuery(username) {
    return {"query":`query {
                        user(login:"` + username + `") {
                        avatarUrl
                      }
                    }`,
            "variables":{}}
}

function userRepositoriesQuery(username) {
    return {"query":`query {
                        user(login:"` + username + `") {
                        login
                        repositories(first: 100) {
                            edges {
                            node {
                                name
                                owner{
                                    login
                                }
                            }
                            }
                        }
                        }
                    }`
    }
}

function userAvatarUrlParser(queryResults) {
    var result = JSON.parse(queryResults);
    return result.data.user.avatarUrl;
}

function userRepositoriesParser(queryResults) {
    var result = JSON.parse(queryResults);
    return result.data.user.repositories.edges.map(t => ({
        "id": t.node.name, "owner": t.node.owner.login
    }));
}

function repositoryContributorsQuery(owner, name) {
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