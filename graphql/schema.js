const {buildSchema}=require('graphql');

module.exports = buildSchema(`
    input userInputData{
        name:String!
        email:String!
        password:String!
    }

    type Post{
        _id:ID!
        title:String!
        content:String!
        createdAt:String!
        imageUrl:String!
        updatedAt:String!
        creator:User!
    }

    input postInputData{
        title:String!
        content:String!
        imageUrl:String!
    }

    type User{
        _id:ID!
        name:String!
        email:String!
        password:String
        status:String!
        posts:[Post!]!
    }

    type Authdata{
        userId:String!
        token:String!
    }

    type postData{
        posts:[Post!]!
        totalPosts:Int!
    }

    type statusData{
        status:String!
    }

    type RootQuery{
        login(email:String!, password:String!): Authdata!
        posts(page:Int):postData!
        status:statusData!
        post(id:ID!):Post!
    }

    type responseMessage{
        message:String!
    }
    type RootMutation{
        createUser(userInput:userInputData):User!
        createPost(postInput:postInputData):Post!
        updateStatus(status:String!): responseMessage!
        updatePost(id:ID!,postInput:postInputData!):Post!
        deletePost(id:ID!):responseMessage!
    }

    schema{
        query:RootQuery
        mutation:RootMutation
    }
`);