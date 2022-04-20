const {v4: uuidv4} = require("uuid")
const crypto = require('crypto')
const Permission = require('./permission')
const Mail = require('./mail.js')
const Input = require('./input.js')
const Messages = require('./messages.js')

module.exports = class Api {
    constructor(database, config) {
        this.config = config
        this.database = database
        this.permission = new Permission(database)
        this.mail = new Mail(config)
        this.input = new Input()
    }

    async createAdminUser() {
        let id = uuidv4()
        let email = 'admin@meshnetwork.app'
        let username = 'admin'
        let password = uuidv4()

        try {
            await this.database.insertUser(id, username, email, Api.#hash(password))
            await this.permission.giveAdmin(id)

            console.log(Messages.createdAdminUser(password))
        } catch (e) {
            console.log(Messages.couldNotCreateAdminUser)
            console.log(e)
        }
    }

    async getUserFromName(req, res) {
        let name = req.params.name

        if (!name) {
            res.status(400).send({message: Messages.missingParameterValue('name')})
        } else {
            try {
                let user = await this.database.getUser(name)

                if (user) {
                    user = this.#addImageToUser(user)
                    user = this.database.cleanUser(user)

                    res.send(user)
                } else {
                    res.status(404).send({message: Messages.couldNotFindUser})
                }
            } catch (e) {
                res.status(500).send({message: Messages.internalServerError})
                console.log(e)
            }
        }
    }

    async getUser(req, res) {
        let session = await this.#checkSession(req, res)

        if (session) {
            let user = await this.database.getUser(session.user.name)
            user = this.database.cleanOwnUser(user)
            user = this.#addImageToUser(user)

            res.send(user)
        }
    }

    async registerUser(req, res) {
        let username = req.body.username
        let email = req.body.email
        let password = req.body.password

        if (!username) {
            res.status(400).send({message: Messages.missingBodyValue('username')})
        } else if (!email) {
            res.status(400).send({message: Messages.missingBodyValue('email')})
        } else if (!password) {
            res.status(400).send({message: Messages.missingBodyValue('password')})
        } else {
            if(!this.input.verifyUsername(username)){
                res.status(400).send({message: Messages.invalidBodyValue('username')})
            }else if(!this.input.verifyEmail(email)){
                res.status(400).send({message: Messages.invalidBodyValue('email')})
            }else if(!this.input.verifyPassword(password)){
                res.status(400).send({message: Messages.invalidBodyValue('password')})
            }else{
                let id = uuidv4()

                password = Api.#hash(password)

                try {
                    let existingUser = await this.database.getUser(username)

                    if (!existingUser) {
                        existingUser = await this.database.getUserFromEmail(email)

                        if(!existingUser){
                            await this.database.insertUser(id, username, email, password)

                            let mailVerification = uuidv4()
                            await this.database.insertMailVerification(id, mailVerification, Date.now())
                            await this.mail.sendVerificationEmail(email, username, mailVerification)

                            res.send({message: Messages.userRegistered})
                        }else{
                            res.status(400).send({message: Messages.emailAlreadyUsed})
                        }
                    } else {
                        res.status(400).send({message: Messages.usernameAlreadyUsed})
                    }
                } catch (e) {
                    res.status(500).send({message: Messages.internalServerError})
                    console.log(e)
                }
            }
        }
    }

    async verifyUserMail(req, res){
        let username = req.query.username
        let verificationId = req.query.verificationId

        if(!username){
            res.status(400).send({message: Messages.missingQueryValue('username')})
        }else if(!verificationId){
            res.status(400).send({message: Messages.missingQueryValue('verificationId')})
        }else{
            try{
                let user = await this.database.getUser(username)

                if(user){
                    if((await this.database.getMailVerification(user.id, verificationId))){
                        await this.database.removeMailVerification(user.id)

                        await this.database.updateUserMailVerified(user.id, true)

                        await this.permission.giveUploadImage(user.id)
                        await this.permission.giveCreateCommunity(user.id)
                        await this.permission.giveCreatePost(user.id)

                        res.send({message: Messages.emailVerified})
                    }else{
                        res.status(400).send({message: Messages.verificationNotFound})
                    }
                }else{
                    res.status(404).send({message: Messages.couldNotFindUser})
                }
            }catch (e) {
                res.status(500).send({message: Messages.internalServerError})
                console.log(e)
            }
        }
    }

    async loginUser(req, res) {
        let username = req.body.username
        let password = req.body.password

        if (!username) {
            res.status(400).send({message: Messages.missingBodyValue('username')})
        } else if (!password) {
            res.status(400).send({message: Messages.missingBodyValue('password')})
        } else {
            try {
                let user = await this.database.getUser(username)

                if (user) {
                    if(user.emailVerified){
                        password = Api.#hash(password)

                        if (user.password === password) {
                            let sessionId = uuidv4()

                            await this.database.insertSession(sessionId, user.id)

                            //TODO max age
                            res.cookie('session', sessionId)
                            res.send({message: Messages.loginSuccessful})
                        } else {
                            res.status(401).send({message: Messages.wrongPassword})
                        }
                    }else{
                        res.status(400).send({message: Messages.emailNotVerified})
                    }

                } else {
                    res.status(404).send({message: Messages.couldNotFindUser})
                }
            } catch (e) {
                res.status(500).send({message: Messages.internalServerError})
                console.log(e)
            }
        }
    }

    async changeUserPassword(req, res) {
        let session = await this.#checkSession(req, res)

        if (session) {
            let password = req.body.password
            let newPassword = req.body.newPassword

            if (!password) {
                res.status(400).send({message: Messages.missingBodyValue('password')})
            } else if (!newPassword) {
                res.status(400).send({message: Messages.missingBodyValue('newPassword')})
            } else {
                let user = session.user

                try {
                    user = await this.database.getUser(user.name)

                    if (user) {
                        password = Api.#hash(password)
                        newPassword = Api.#hash(newPassword)

                        if (user.password === password) {
                            await this.database.updateUserPassword(user.id, newPassword)

                            res.send({message: Messages.updatedUser})
                        } else {
                            res.status(401).send({message: Messages.wrongPassword})
                        }
                    } else {
                        res.status(404).send({message: Messages.couldNotFindUser})
                    }
                } catch (e) {
                    res.status(500).send({message: Messages.internalServerError})
                    console.log(e)
                }
            }
        }
    }

    async setUserImage(req, res){
        let session = await this.#checkSession(req, res)

        if (session) {
            let cdnId = req.body.cdnId
            let id = req.body.id
            let type = req.body.type

            if(!cdnId){
                res.status(400).send({message: Messages.missingBodyValue('cdnId')})
            }else if(!id) {
                res.status(400).send({message: Messages.missingBodyValue('id')})
            }else if(!type){
                res.status(400).send({message: Messages.missingBodyValue('type')})
            }else{
                if(type === 'image' || type === 'animated'){
                    try{
                        await this.database.updateUserImage(session.user.id, `${cdnId}/${type}/${id}`)

                        res.send({message: Messages.updatedUser})
                    }catch (e) {
                        res.status(500).send({message: Messages.internalServerError})
                        console.log(e)
                    }
                }else{
                    res.status(400).send({message: Messages.invalidBodyValue('type')})
                }
            }
        }
    }

    async deleteUser(req, res) {
        let session = await this.#checkSession(req, res)

        if (session) {
            let password = req.body.password

            if (!password) {
                res.status(400).send({message: Messages.missingBodyValue('password')})
            } else {
                let user = session.user

                try {
                    user = await this.database.getUser(user.name)

                    if (user) {
                        password = Api.#hash(password)

                        if (user.password === password) {
                            if ((await this.database.removeUser(user.id)) > 0) {
                                res.send({message: Messages.deletedUser})
                            } else {
                                res.status(500).send({message: Messages.couldNotDeleteUser})
                            }
                        } else {
                            res.status(401).send({message: Messages.wrongPassword})
                        }
                    } else {
                        res.status(404).send({message: Messages.couldNotFindUser})
                    }
                } catch (e) {
                    res.status(500).send({message: Messages.internalServerError})
                    console.log(e)
                }
            }
        }
    }

    async createCommunity(req, res) {
        let session = await this.#checkSession(req, res)

        if (session) {
            let name = req.body.name
            let description = req.body.description

            if (!name) {
                res.status(400).send({message: Messages.missingBodyValue('name')})
            } else if (!description) {
                res.status(400).send({message: Messages.missingBodyValue('description')})
            } else {
                try {
                    let user = session.user

                    if ((await this.permission.createCommunity(user.id))) {
                        let existingCommunity = await this.database.getCommunity(name)

                        if (!existingCommunity) {
                            let user = session.user

                            await this.database.insertCommunity(name, description, user.id)
                            await this.permission.giveModerator(user.id, name)

                            res.send({message: Messages.createdCommunity})
                        } else {
                            res.status(400).send({message: Messages.communityAlreadyExists})
                        }
                    } else {
                        res.status(401).send({message: Messages.noPermission})
                    }
                } catch (e) {
                    res.status(500).send({message: Messages.internalServerError})
                    console.log(e)
                }
            }
        }
    }

    async deleteCommunity(req, res) {
        let session = await this.#checkSession(req, res)

        if (session) {
            let name = req.params.name

            if (!name) {
                res.status(400).send({message: Messages.missingParameterValue('name')})
            } else {
                try {
                    let user = session.user

                    if ((await this.permission.moderator(user.id, name))) {
                        if ((await this.database.removeCommunity(name)) > 0) {
                            res.send({message: Messages.deletedCommunity})
                        } else {
                            res.status(500).send({message: Messages.couldNotDeleteCommunity})
                        }
                    } else {
                        res.status(401).send({message: Messages.noPermission})
                    }
                } catch (e) {
                    res.status(500).send({message: Messages.internalServerError})
                    console.log(e)
                }
            }
        }
    }

    async createCommunityPost(req, res) {
        let session = await this.#checkSession(req, res)

        if (session) {
            let user = session.user

            let communityName = req.params.name
            let title = req.body.title
            let content = req.body.content

            if (!communityName) {
                res.status(400).send({message: Messages.missingParameterValue('communityName')})
            } else if (!title) {
                res.status(400).send({message: Messages.missingBodyValue('title')})
            } else if (!content) {
                res.status(400).send({message: Messages.missingBodyValue('content')})
            } else {
                try {
                    if ((await this.permission.createCommunityPost(user.id, communityName))) {
                        let community = await this.database.getCommunity(communityName)

                        if (community) {
                            let postId = uuidv4()
                            let created = Date.now()

                            await this.database.insertPost(postId, user.id, community.name, title, content, created)

                            res.send({message: Messages.createdPost, community: communityName, postId: postId})
                        } else {
                            res.status(404).send({message: Messages.couldNotFindCommunity})
                        }
                    } else {
                        res.status(401).send({message: Messages.noPermission})
                    }
                } catch (e) {
                    res.status(500).send({message: Messages.internalServerError})
                    console.log(e)
                }
            }
        }
    }

    async deleteCommunityPost(req, res) {
        let session = await this.#checkSession(req, res)

        if (session) {
            let communityName = req.params.name
            let postId = req.params.postId

            if (!communityName) {
                res.status(400).send({message: Messages.missingParameterValue('communityName')})
            } else if (!postId) {
                res.status(400).send({message: Messages.missingParameterValue('postId')})
            } else {
                try {
                    let user = session.user

                    if ((await this.permission.moderator(user.id, communityName)) || (await this.database.getPost(postId)).user.id === user.id) {
                        if ((await this.database.removePost(postId)) > 0) {
                            res.send({message: Messages.deletedPost})
                        } else {
                            res.status(500).send({message: Messages.couldNotDeletePost})
                        }
                    } else {
                        res.status(401).send({message: Messages.noPermission})
                    }
                } catch (e) {
                    res.status(500).send({message: Messages.internalServerError})
                    console.log(e)
                }
            }
        }
    }

    async getCommunityPost(req, res) {
        let communityName = req.params.name
        let postId = req.params.postId

        if (!communityName) {
            res.status(400).send({message: Messages.missingParameterValue('communityName')})
        } else if (!postId) {
            res.status(400).send({message: Messages.missingParameterValue('postId')})
        } else {
            try {
                let post = await this.database.getPost(postId)
                post.user = this.#addImageToUser(post.user)

                if (post) {
                    res.send(post)
                } else {
                    res.status(404).send({message: Messages.couldNotFindPost})
                }
            } catch (e) {
                res.status(500).send({message: Messages.internalServerError})
                console.log(e)
            }
        }
    }

    async getCommunityPosts(req, res) {
        let communityName = req.params.name

        let skip = Api.#sanitizeSkip(req.query.skip)
        let limit = Api.#sanitizeLimit(req.query.limit)

        let session = await this.#checkSession(req, res, true)

        if (!communityName) {
            res.status(400).send({message: Messages.missingParameterValue('communityName')})
        } else {
            try {
                let subscribed = false

                if(session){
                    let user = session.user

                    if(user){
                        let subscriptions = await this.database.getSubscriptions(user.id)

                        for (let i in subscriptions) {
                            let subscription = subscriptions[i]

                            if (subscription.name === communityName.toLowerCase()) {
                                subscribed = true
                                break
                            }
                        }
                    }
                }

                let community = await this.database.getCommunity(communityName)

                if(community){
                    let posts = await this.database.getCommunityPosts(communityName, skip, limit)

                    for(let i in posts){
                        posts[i].user = this.#addImageToUser(posts[i].user)
                    }

                    community.posts = posts
                    community.subscribed = subscribed

                    res.send(community)
                }else{
                    res.status(404).send({message: Messages.couldNotFindCommunity})
                }
            } catch (e) {
                res.status(500).send({message: Messages.internalServerError})
                console.log(e)
            }
        }
    }

    async getUserPosts(req, res) {
        let username = req.params.name

        let skip = Api.#sanitizeSkip(req.query.skip)
        let limit = Api.#sanitizeLimit(req.query.limit)

        if (!username) {
            res.status(400).send({message: Messages.missingParameterValue('username')})
        } else {
            try {
                let posts = await this.database.getUserPosts(username, skip, limit)

                for(let i in posts){
                    posts[i].user = this.#addImageToUser(posts[i].user)
                }

                res.send(posts)
            } catch (e) {
                res.status(500).send({message: Messages.internalServerError})
                console.log(e)
            }
        }
    }

    async subscribeToCommunity(req, res) {
        let session = await this.#checkSession(req, res)

        if (session) {
            let user = session.user

            let communityName = req.params.name

            if (!communityName) {
                res.status(400).send({message: Messages.missingParameterValue('communityName')})
            } else {
                try {
                    let subscriptions = await this.database.getSubscriptions(user.id)

                    let alreadySubscribed = false

                    for (let i in subscriptions) {
                        let subscription = subscriptions[i]

                        if (subscription.name === communityName.toLowerCase()) {
                            alreadySubscribed = true
                            break
                        }
                    }

                    if (!alreadySubscribed) {
                        let community = await this.database.getCommunity(communityName)

                        if (community.public) {
                            if (community) {
                                await this.database.insertSubscription(user.id, community.name)

                                try{
                                    await this.permission.giveCreateCommunityPost(user.id, community.name)
                                }catch (e) {

                                }

                                res.send({message: Messages.subscribedToCommunity})
                            } else {
                                res.status(404).send({message: Messages.couldNotFindCommunity})
                            }
                        } else {
                            res.status(401).send({message: Messages.noPermission})
                        }
                    } else {
                        res.status(400).send({message: Messages.alreadySubscribedToCommunity})
                    }
                } catch (e) {
                    res.status(500).send({message: Messages.internalServerError})
                    console.log(e)
                }
            }
        }
    }

    async unsubscribeFromCommunity(req, res) {
        let session = await this.#checkSession(req, res)

        if (session) {
            let user = session.user

            let communityName = req.params.name

            if(!communityName){
                res.status(400).send({message: Messages.missingParameterValue('communityName')})
            }else{
                try {
                    if ((await this.database.removeSubscription(user.id, communityName)) > 0) {
                        res.send({message: Messages.unsubscribedFromCommunity})
                    } else {
                        res.status(500).send({message: Messages.couldNotUnsubscribeFromCommunity})
                    }
                } catch (e) {
                    res.status(500).send({message: Messages.internalServerError})
                    console.log(e)
                }
            }
        }
    }

    async getSubscribedCommunities(req, res) {
        let session = await this.#checkSession(req, res)

        if (session) {
            let user = session.user

            try {
                let communities = await this.database.getSubscriptions(user.id)

                res.send(communities)
            } catch (e) {
                res.status(500).send({message: Messages.internalServerError})
                console.log(e)
            }
        }
    }

    async getFrontpage(req, res) {
        let session = await this.#checkSession(req, res, true)

        if (session) {
            let user = session.user

            let skip = Api.#sanitizeSkip(req.query.skip)
            let limit = Api.#sanitizeLimit(req.query.limit)

            try {
                let communities = await this.database.getSubscriptions(user.id)

                if (communities.length > 0) {
                    let posts = await this.database.getCommunitiesPosts(communities, skip, limit)

                    res.send(posts)
                } else {
                    res.send([])
                }
            } catch (e) {
                res.status(500).send({message: Messages.internalServerError})
                console.log(e)
            }
        }else{
            try{
                res.send([])
            }catch (e) {

            }
        }
    }

    async search(req, res) {
        let term = req.query.term

        if (!term) {
            res.status(500).send({message: Messages.missingQueryValue('term')})
        } else {
            try {
                let users = await this.database.matchUser(term, 0, 50)

                for(let i in users){
                    users[i] = this.#addImageToUser(users[i])
                }

                let communities = await this.database.matchCommunity(term, 0, 50)

                let posts = await this.database.matchCommunityPost(term, 0, 50)

                for(let i in posts){
                    posts[i].user = this.#addImageToUser(posts[i].user)
                }

                let result = {
                    users: users,
                    communities: communities,
                    posts: posts
                }

                res.send(result)
            } catch (e) {
                res.status(500).send({message: Messages.internalServerError})
                console.log(e)
            }
        }
    }

    async searchUser(req, res) {
        let term = req.query.term

        if (!term) {
            res.status(500).send({message: Messages.missingQueryValue('term')})
        } else {
            let skip = Api.#sanitizeSkip(req.query.skip)
            let limit = Api.#sanitizeLimit(req.query.limit)

            try {
                let users = await this.database.matchUser(term, skip, limit)

                for(let i in users){
                    users[i] = this.#addImageToUser(users[i])
                }

                res.send(users)
            } catch (e) {
                res.status(500).send({message: Messages.internalServerError})
                console.log(e)
            }
        }
    }

    async searchCommunity(req, res) {
        let term = req.query.term

        if (!term) {
            res.status(500).send({message: Messages.missingQueryValue('term')})
        } else {
            let skip = Api.#sanitizeSkip(req.query.skip)
            let limit = Api.#sanitizeLimit(req.query.limit)

            try {
                res.send(await this.database.matchCommunity(term, skip, limit))
            } catch (e) {
                res.status(500).send({message: Messages.internalServerError})
                console.log(e)
            }
        }
    }

    async searchCommunityPost(req, res) {
        let term = req.query.term

        if (!term) {
            res.status(500).send({message: Messages.missingQueryValue('term')})
        } else {
            let skip = Api.#sanitizeSkip(req.query.skip)
            let limit = Api.#sanitizeLimit(req.query.limit)

            try {
                let posts = await this.database.matchCommunityPost(term, skip, limit)

                for(let i in posts){
                    posts[i].user = this.#addImageToUser(posts[i].user)
                }

                res.send(posts)
            } catch (e) {
                res.status(500).send({message: Messages.internalServerError})
                console.log(e)
            }
        }
    }

    async getCdn(req, res) {
        try {
            let cdn = (await this.database.getCdn())[0]

            res.send({cdn: cdn})
        } catch (e) {
            res.status(500).send({message: Messages.internalServerError})
            console.log(e)
        }
    }

    static #sanitizeSkip(skip) {
        if (!skip) {
            skip = 0
        } else {
            skip = Number(skip)
        }

        return skip
    }

    static #sanitizeLimit(limit) {
        if (!limit) {
            limit = 50
        } else {
            limit = Number(limit)
        }

        if (limit > 50) {
            limit = 50
        }

        return limit
    }

    #addImageToUser(user){
        if(user.image === 'empty'){
            user.image = undefined
        }else{
            user.image = this.config.url + '/api/cdn/' + user.image
        }

        return user
    }

    async #checkSession(req, res, noError) {
        const sessionId = req.cookies.session

        if (sessionId) {
            try {
                const session = await this.database.getSession(sessionId)

                if (session) {
                    if (session.user) {
                        if(session.user.emailVerified){
                            return session
                        }else{
                            res.status(400).send({message: Messages.emailNotVerified})
                        }
                    } else {
                        res.status(404).send({message: Messages.couldNotFindUser})
                    }
                } else {
                    res.status(401).send({message: Messages.invalidSession})
                }
            } catch (e) {
                res.status(500).send({message: Messages.internalServerError})
                console.log(e)
            }
        } else {
            if(!noError){
                res.status(401).send({message: Messages.notLoggedIn})
            }
        }
    }

    static #hash(string) {
        return crypto.createHash('sha256').update(string).digest('base64')
    }
}