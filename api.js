const {v4: uuidv4} = require("uuid")
const crypto = require('crypto')
const Permission = require('./permission')
const Mail = require('./mail.js')
const Input = require('./input.js')

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

            console.log(`Created user admin with password ${password}`)
        } catch (e) {
            console.log('Could not create admin user')
            console.log(e)
        }
    }

    async getUserFromName(req, res) {
        let name = req.params.name

        if (name) {
            try {
                let user = await this.database.getUser(name)

                if (user) {
                    user = this.#addImageToUser(user)
                    user = this.database.cleanUser(user)

                    res.send(user)
                } else {
                    res.status(404).send({message: 'Could not find user'})
                }
            } catch (e) {
                res.status(500).send({message: 'Internal server error'})
                console.log(e)
            }
        } else {
            res.status(400).send({message: 'Missing parameter name'})
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

    #addImageToUser(user){
        if(user.image === 'empty'){
            user.image = undefined
        }else{
            user.image = this.config.url + '/api/cdn/' + user.image
        }

        return user
    }

    async registerUser(req, res) {
        let username = req.body.username
        let email = req.body.email
        let password = req.body.password

        if (!username) {
            res.status(400).send({message: 'No username'})
        } else if (!email) {
            res.status(400).send({message: 'No email'})
        } else if (!password) {
            res.status(400).send({message: 'No password'})
        } else {
            if(!this.input.verifyUsername(username)){
                res.status(400).send({message: 'Not a valid username'})
            }else if(!this.input.verifyEmail(email)){
                res.status(400).send({message: 'Not a valid email'})
            }else if(!this.input.verifyPassword(password)){
                res.status(400).send({message: 'Not a valid password'})
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

                            res.send({message: 'User registered, please verify email'})
                        }else{
                            res.status(400).send({message: 'Email already used'})
                        }
                    } else {
                        res.status(400).send({message: 'Username already used'})
                    }
                } catch (e) {
                    res.status(500).send({message: 'Internal server error'})
                    console.log(e)
                }
            }
        }
    }

    async verifyUserMail(req, res){
        let username = req.query.username
        let verificationId = req.query.verificationId

        if(!username){
            res.status(400).send({message: 'No username'})
        }else if(!verificationId){
            res.status(400).send({message: 'No verificationId'})
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

                        res.send({message: 'Email verified and account unlocked'})
                    }else{
                        res.status(400).send({message: 'Could not find verification'})
                    }
                }else{
                    res.status(404).send({message: 'Could not find user'})
                }
            }catch (e) {
                res.status(500).send({message: 'Internal server error'})
                console.log(e)
            }
        }
    }

    async loginUser(req, res) {
        let username = req.body.username
        let password = req.body.password

        if (!username) {
            res.status(400).send({message: 'No username'})
        } else if (!password) {
            res.status(400).send({message: 'No password'})
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
                            res.send({message: 'Login success'})
                        } else {
                            res.status(401).send({message: 'Password is wrong'})
                        }
                    }else{
                        res.status(400).send({message: 'User email not verified'})
                    }

                } else {
                    res.status(404).send({message: 'Could not find user'})
                }
            } catch (e) {
                res.status(500).send({message: 'Internal server error'})
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
                res.status(400).send({message: 'No password'})
            } else if (!newPassword) {
                res.status(400).send({message: 'No newPassword'})
            } else {
                let user = session.user

                try {
                    user = await this.database.getUser(user.name)

                    if (user) {
                        password = Api.#hash(password)
                        newPassword = Api.#hash(newPassword)

                        if (user.password === password) {
                            await this.database.updateUserPassword(user.id, newPassword)

                            res.send({message: 'Updated password'})
                        } else {
                            res.status(401).send({message: 'Password is wrong'})
                        }
                    } else {
                        res.status(404).send({message: 'Could not find user'})
                    }
                } catch (e) {
                    res.status(500).send({message: 'Internal server error'})
                    console.log(e)
                }
            }
        }
    }

    async setUserImage(req, res){
        let session = await this.#checkSession(req, res)

        if (session) {
            let cdnId = req.body.cdnId
            let imageId = req.body.imageId

            if(!cdnId){
                res.status(400).send({message: 'No cdnId'})
            }else if(!imageId){
                res.status(400).send({message: 'No imageId'})
            }else{
                try{
                    await this.database.updateUserImage(session.user.id, `${cdnId}/image/${imageId}`)

                    res.send({message: 'Updated user image'})
                }catch (e) {
                    res.status(500).send({message: 'Internal server error'})
                    console.log(e)
                }
            }
        }
    }

    async deleteUser(req, res) {
        let session = await this.#checkSession(req, res)

        if (session) {
            let password = req.body.password

            if (!password) {
                res.status(400).send({message: 'No password'})
            } else {
                let user = session.user

                try {
                    user = await this.database.getUser(user.name)

                    if (user) {
                        password = Api.#hash(password)

                        if (user.password === password) {
                            if ((await this.database.removeUser(user.id)) > 0) {
                                res.send({message: 'User deleted'})
                            } else {
                                res.status(500).send({message: 'Could not delete user'})
                            }
                        } else {
                            res.status(401).send({message: 'Password is wrong'})
                        }
                    } else {
                        res.status(404).send({message: 'Could not find user'})
                    }
                } catch (e) {
                    res.status(500).send({message: 'Internal server error'})
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
                res.status(400).send({message: 'No name'})
            } else if (!description) {
                res.status(400).send({message: 'No description'})
            } else {
                try {
                    let user = session.user

                    if ((await this.permission.createCommunity(user.id))) {
                        let existingCommunity = await this.database.getCommunity(name)

                        if (!existingCommunity) {
                            let user = session.user

                            await this.database.insertCommunity(name, description, user.id)
                            await this.permission.giveModerator(user.id, name)

                            res.send({message: 'Created new community'})
                        } else {
                            res.status(400).send({message: 'Community already exists'})
                        }
                    } else {
                        res.status(401).send({message: 'No permission to create community'})
                    }
                } catch (e) {
                    res.status(500).send({message: 'Internal server error'})
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
                res.status(400).send({message: 'No name'})
            } else {
                try {
                    let user = session.user

                    if ((await this.permission.moderator(user.id, name))) {
                        if ((await this.database.removeCommunity(name)) > 0) {
                            res.send({message: 'Deleted community'})
                        } else {
                            res.status(500).send({message: 'Could not delete community'})
                        }
                    } else {
                        res.status(401).send({message: 'No permission to delete community'})
                    }
                } catch (e) {
                    res.status(500).send({message: 'Internal server error'})
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
                res.status(400).send({message: 'No community'})
            } else if (!title) {
                res.status(400).send({message: 'No title'})
            } else if (!content) {
                res.status(400).send({message: 'No content'})
            } else {
                try {
                    if ((await this.permission.createCommunityPost(user.id, communityName))) {
                        let community = await this.database.getCommunity(communityName)

                        if (community) {
                            let postId = uuidv4()
                            let created = Date.now()

                            await this.database.insertPost(postId, user.id, community.name, title, content, created)

                            res.send({message: 'Created post', community: communityName, postId: postId})
                        } else {
                            res.status(404).send({message: 'Could not find community'})
                        }
                    } else {
                        res.status(401).send({message: 'No permission to create community post'})
                    }
                } catch (e) {
                    res.status(500).send({message: 'Internal server error'})
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
                res.status(400).send({message: 'No community'})
            } else if (!postId) {
                res.status(400).send({message: 'No postId'})
            } else {
                try {
                    let user = session.user

                    if ((await this.permission.moderator(user.id, communityName)) || (await this.database.getPost(postId)).user.id === user.id) {
                        if ((await this.database.removePost(postId)) > 0) {
                            res.send({message: 'Deleted post'})
                        } else {
                            res.status(500).send({message: 'Could not delete post'})
                        }
                    } else {
                        res.status(401).send({message: 'No permission to delete post'})
                    }
                } catch (e) {
                    res.status(500).send({message: 'Internal server error'})
                    console.log(e)
                }
            }
        }
    }

    async getCommunityPost(req, res) {
        let communityName = req.params.name
        let postId = req.params.postId

        if (!communityName) {
            res.status(400).send({message: 'No community'})
        } else if (!postId) {
            res.status(400).send({message: 'No postId'})
        } else {
            try {
                let post = await this.database.getPost(postId)
                post.user = this.#addImageToUser(post.user)

                if (post) {
                    res.send(post)
                } else {
                    res.status(404).send({message: 'Could not find post'})
                }
            } catch (e) {
                res.status(500).send({message: 'Internal server error'})
                console.log(e)
            }
        }
    }

    async getCommunityPosts(req, res) {
        let communityName = req.params.name

        let skip = Api.#sanitizeSkip(req.query.skip)
        let limit = Api.#sanitizeLimit(req.query.limit)

        if (!communityName) {
            res.status(400).send({message: 'No community'})
        } else {
            try {
                let posts = await this.database.getCommunityPosts(communityName, skip, limit)

                for(let i in posts){
                    posts[i].user = this.#addImageToUser(posts[i].user)
                }

                res.send(posts)
            } catch (e) {
                res.status(500).send({message: 'Internal server error'})
                console.log(e)
            }
        }
    }

    async getUserPosts(req, res) {
        let username = req.params.name

        let skip = Api.#sanitizeSkip(req.query.skip)
        let limit = Api.#sanitizeLimit(req.query.limit)

        if (!username) {
            res.status(400).send({message: 'No user'})
        } else {
            try {
                let posts = await this.database.getUserPosts(username, skip, limit)

                for(let i in posts){
                    posts[i].user = this.#addImageToUser(posts[i].user)
                }

                res.send(posts)
            } catch (e) {
                res.status(500).send({message: 'Internal server error'})
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
                res.status(400).send({message: 'No community'})
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

                                res.send({message: 'Subscribed to community'})
                            } else {
                                res.status(404).send({message: 'Could not find community'})
                            }
                        } else {
                            res.status(401).send({message: 'No permission to subscribe to community'})
                        }
                    } else {
                        res.status(400).send({message: 'Already subscribed to community'})
                    }
                } catch (e) {
                    res.status(500).send({message: 'Internal server error'})
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

            try {
                if ((await this.database.removeSubscription(user.id, communityName)) > 0) {
                    res.send({message: 'Unsubscribed from community'})
                } else {
                    res.status(500).send({message: 'Could not unsubscribe from community'})
                }
            } catch (e) {
                res.status(500).send({message: 'Internal server error'})
                console.log(e)
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
                res.status(500).send({message: 'Internal server error'})
                console.log(e)
            }
        }
    }

    async getFrontpage(req, res) {
        //TODO implement frontpage for not logged in users

        let session = await this.#checkSession(req, res)

        if (session) {
            let user = session.user

            let skip = Api.#sanitizeSkip(req.query.skip)
            let limit = Api.#sanitizeLimit(req.query.limit)

            try {
                let communities = await this.database.getSubscriptions(user.id)

                if (communities) {
                    let posts = await this.database.getCommunitiesPosts(communities, skip, limit)

                    res.send(posts)
                } else {
                    res.status(404).send({message: 'No subscribed communities'})
                }
            } catch (e) {
                res.status(500).send({message: 'Internal server error'})
                console.log(e)
            }
        }
    }

    async search(req, res) {
        let term = req.query.term

        if (!term) {
            res.status(500).send({message: 'No term'})
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
                res.status(500).send({message: 'Internal server error'})
                console.log(e)
            }
        }
    }

    async searchUser(req, res) {
        let term = req.query.term

        if (!term) {
            res.status(500).send({message: 'No term'})
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
                res.status(500).send({message: 'Internal server error'})
                console.log(e)
            }
        }
    }

    async searchCommunity(req, res) {
        let term = req.query.term

        if (!term) {
            res.status(500).send({message: 'No term'})
        } else {
            let skip = Api.#sanitizeSkip(req.query.skip)
            let limit = Api.#sanitizeLimit(req.query.limit)

            try {
                res.send(await this.database.matchCommunity(term, skip, limit))
            } catch (e) {
                res.status(500).send({message: 'Internal server error'})
                console.log(e)
            }
        }
    }

    async searchCommunityPost(req, res) {
        let term = req.query.term

        if (!term) {
            res.status(500).send({message: 'No term'})
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
                res.status(500).send({message: 'Internal server error'})
                console.log(e)
            }
        }
    }

    async getCdn(req, res) {
        try {
            let cdn = (await this.database.getCdn())[0]

            res.send({cdn: cdn})
        } catch (e) {
            res.status(500).send({message: 'Internal server error'})
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

    async #checkSession(req, res) {
        const sessionId = req.cookies.session

        if (sessionId) {
            try {
                const session = await this.database.getSession(sessionId)

                if (session) {
                    if (session.user) {
                        if(session.user.emailVerified){
                            return session
                        }else{
                            res.status(400).send({message: 'Email not verified'})
                        }
                    } else {
                        res.status(404).send({message: 'User not found'})
                    }
                } else {
                    res.status(401).send({message: 'Invalid session'})
                }
            } catch (e) {
                res.status(500).send({message: 'Internal server error'})
                console.log(e)
            }
        } else {
            res.status(401).send({message: 'Not logged in'})
        }
    }

    static #hash(string) {
        return crypto.createHash('sha256').update(string).digest('base64')
    }
}