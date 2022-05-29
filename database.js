const InfiniteDB = require('infinitedb')

const HOST = {
    hostname: 'infinitedb',
    port: '8080'
}

const DATABASE_NAME = 'mesh'

const USER_TABLE = 'users'
const USER_FIELDS = {
    id: {
        type: 'text',
        indexed: true,
        unique: true
    },
    name: {
        type: 'text',
        indexed: true,
        unique: true
    },
    displayedName: {
        type: 'text',
        indexed: true,
        unique: true
    },
    chosenName: {
        type: 'text',
        indexed: true
    },
    email: {
        type: 'text',
        indexed: true,
        unique: true
    },
    emailVerified: {
      type: 'boolean'
    },
    password: {
        type: 'text'
    },
    image: {
        type: 'text'
    }
}

const SESSION_TABLE = 'sessions'
const SESSION_FIELDS = {
    id: {
        type: 'text',
        indexed: true,
        unique: true
    },
    user: {
        type: 'text',
        indexed: true
    }
}

const COMMUNITY_TABLE = 'communities'
const COMMUNITY_FIELDS = {
    name: {
        type: 'text',
        indexed: true,
        unique: true
    },
    displayedName: {
      type: 'text',
      indexed: true,
      unique: true
    },
    description: {
        type: 'text',
        indexed: true
    },
    public: {
        type: 'boolean'
    }
}

const SUBSCRIPTION_TABLE = 'subscriptions'
const SUBSCRIPTION_FIELDS = {
    user: {
        type: 'text',
        indexed: true
    },
    community: {
        type: 'text',
        indexed: true
    }
}

const POST_TABLE = 'posts'
const POST_FIELDS = {
    id: {
        type: 'text',
        indexed: true,
        unique: true
    },
    user: {
        type: 'text',
        indexed: true,
        external: true
    },
    community: {
        type: 'text',
        indexed: true
    },
    title: {
        type: 'text',
        indexed: true
    },
    content: {
        type: 'text',
        indexed: true
    },
    created: {
        type: 'number',
        indexed: true
    }
}

const PERMISSION_TABLE = 'permissions'
const PERMISSION_FIELDS = {
    user: {
        type: 'text',
        indexed: true
    },
    permission: {
        type: 'text',
        indexed: true
    }
}

const MAIL_VERIFICATION_TABLE = 'mail_verifications'
const MAIL_VERIFICATION_FIELDS = {
    user: {
        type: 'text',
        indexed: true,
        unique: true
    },
    verification: {
        type: 'text',
        indexed: true,
        unique: true
    },
    created: {
        type: 'number',
        indexed: true
    }
}

const POST_IMPLEMENT = [
    {
        from: {
            table: COMMUNITY_TABLE,
            field: "name"
        },
        field: 'community',
        as: 'community'
    },
    {
        from: {
            table: USER_TABLE,
            field: 'id'
        },
        field: 'user',
        as: 'user'
    }
]

const CDN_TABLE = 'cdn'

module.exports = class Database {
    constructor() {
        this.database = new InfiniteDB(HOST, DATABASE_NAME)
    }

    async connect() {
        try {
            await InfiniteDB.createDatabase(HOST, DATABASE_NAME, {number: {start: 0, end: 100000000000000}})

            console.log('Created database')
        } catch (e) {
            console.log('Could not create database (already exists?)')
        }

        await this.database.connect()

        try {
            await this.database.createTableInDatabase(USER_TABLE, USER_FIELDS)
            console.log('Created user table')
        } catch (e) {
            console.log('Could not create user table')
        }

        try {
            await this.database.createTableInDatabase(SESSION_TABLE, SESSION_FIELDS)
            console.log('Created session table')
        } catch (e) {
            console.log('Could not create session table')
        }

        try{
            await this.database.createTableInDatabase(SUBSCRIPTION_TABLE, SUBSCRIPTION_FIELDS)
            console.log('Created subscription table')
        }catch (e) {
            console.log('Could not create subscription table')
        }

        try {
            await this.database.createTableInDatabase(COMMUNITY_TABLE, COMMUNITY_FIELDS)
            console.log('Created community table')
        } catch (e) {
            console.log('Could not create community table')
        }

        try {
            await this.database.createTableInDatabase(POST_TABLE, POST_FIELDS)
            console.log('Created post table')
        } catch (e) {
            console.log('Could not create post table')
        }

        try{
            await this.database.createTableInDatabase(PERMISSION_TABLE, PERMISSION_FIELDS)
            console.log('Created permission table')
        }catch (e) {
            console.log('Could not create permission table')
        }

        try{
            await this.database.createTableInDatabase(MAIL_VERIFICATION_TABLE, MAIL_VERIFICATION_FIELDS)
            console.log('Created mail verification table')
        }catch (e) {
            console.log('Could not create mail verification table')
        }
    }

    async insertMailVerification(user, verification, created){
        await this.database.insertToDatabaseTable(MAIL_VERIFICATION_TABLE, {user: user, verification: verification, created: created})
    }

    async getMailVerification(user, verification){
        let where = {
            field: 'user',
            operator: '=',
            value: user,
            and: {
                field: 'verification',
                operator: '=',
                value: verification
            }
        }

        return (await this.database.getFromDatabaseTable(MAIL_VERIFICATION_TABLE, {where: where})).results[0]
    }

    async removeMailVerification(user){
        let where = {
            field: 'user',
            operator: '=',
            value: user
        }

        return (await this.database.removeFromDatabaseTable(MAIL_VERIFICATION_TABLE, {where: where})).results
    }

    async insertUser(id, name, email, password) {
        await this.database.insertToDatabaseTable(USER_TABLE, {id: id, name: name.toLowerCase(), displayedName: name, chosenName: name, email: email.toLowerCase(), emailVerified: false, password: password, image: 'empty'})
    }

    async removeUser(id){
        let userWhere = {
            field: 'user',
            operator: '=',
            value: id
        }

        await this.database.removeFromDatabaseTable(SESSION_TABLE, {where: userWhere})

        await this.database.removeFromDatabaseTable(POST_TABLE, {where: userWhere})

        await this.database.removeFromDatabaseTable(SUBSCRIPTION_TABLE, {where: userWhere})

        await this.database.removeFromDatabaseTable(PERMISSION_TABLE, {where: userWhere})

        let where = {
            field: 'id',
            operator: '=',
            value: id
        }

        return (await this.database.removeFromDatabaseTable(USER_TABLE, {where: where})).results
    }

    async updateUserPassword(id, password){
        await this.database.updateInDatabaseTable(USER_TABLE, {id: id, password: password})
    }

    async updateUserImage(id, image){
        await this.database.updateInDatabaseTable(USER_TABLE, {id: id, image: image})
    }

    async updateUserMailVerified(id, verified){
        await this.database.updateInDatabaseTable(USER_TABLE, {id: id, emailVerified: verified})
    }

    async getUser(name) {
        let where = {
            field: 'name',
            operator: '=',
            value: name.toLowerCase()
        }

        let implement = [
            {
                from: {
                    table: PERMISSION_TABLE,
                    field: 'user'
                },
                field: 'id',
                as: 'permissions',
                forceArray: true
            }
        ]

        return (await this.database.getFromDatabaseTable(USER_TABLE, {where: where, implement: implement})).results[0]
    }

    async getUserFromEmail(email){
        let where = {
            field: 'email',
            operator: '=',
            value: email.toLowerCase()
        }

        let implement = [
            {
                from: {
                    table: PERMISSION_TABLE,
                    field: 'user'
                },
                field: 'id',
                as: 'permissions',
                forceArray: true
            }
        ]

        return (await this.database.getFromDatabaseTable(USER_TABLE, {where: where, implement: implement})).results[0]
    }

    async matchUser(name, skip, limit){
        let where = {
            field: 'name',
            operator: 'match',
            value: name
        }

        let sort = {
            field: 'name',
            direction: 'desc',
            levenshtein: name
        }

        let result = await this.database.getFromDatabaseTable(USER_TABLE, { where: where, sort: sort, skip: skip, limit: limit }).results

        for(let i in result){
            result[i] = this.cleanUser(result[i])
        }

        return result
    }

    async insertSession(id, user) {
        await this.database.insertToDatabaseTable(SESSION_TABLE, {id: id, user: user})
    }

    async getSession(id) {
        let where = {
            field: 'id',
            operator: '=',
            value: id
        }

        let implement = [
            {
                from: {
                    table: USER_TABLE,
                    field: 'id'
                },
                field: 'user',
                as: 'user'
            }
        ]

        let session = (await this.database.getFromDatabaseTable(SESSION_TABLE, {where: where, implement: implement})).results[0]

        if(session && session.user){
            session.user.password = undefined
            return session
        }else{
            throw 'Invalid session'
        }
    }

    async insertCommunity(name, description) {
        await this.database.insertToDatabaseTable(COMMUNITY_TABLE, {name: name.toLowerCase(), displayedName: name, description: description, public: true})
    }

    async removeCommunity(name){
        let communityWhere = {
            field: 'community',
            operator: '=',
            value: name.toLowerCase()
        }

        await this.database.removeFromDatabaseTable(POST_TABLE, {where: communityWhere})

        await this.database.removeFromDatabaseTable(SUBSCRIPTION_TABLE, {where: communityWhere})

        let where = {
            field: 'name',
            operator: '=',
            value: name.toLowerCase()
        }

        return (await this.database.removeFromDatabaseTable(COMMUNITY_TABLE, {where: where})).removed
    }

    async getCommunity(name) {
        let where = {
            field: 'name',
            operator: '=',
            value: name.toLowerCase()
        }

        return (await this.database.getFromDatabaseTable(COMMUNITY_TABLE, {where: where})).results[0]
    }

    async matchCommunity(name, skip, limit){
        let where = {
            field: 'name',
            operator: 'match',
            value: name
        }

        let sort = {
            field: 'name',
            direction: 'desc',
            levenshtein: name
        }

        return (await this.database.getFromDatabaseTable(COMMUNITY_TABLE, {where: where, sort:sort, skip: skip, limit: limit})).results
    }

    async insertPost(id, user, community, title, content, created) {
        await this.database.insertToDatabaseTable(POST_TABLE, {
            id: id,
            user: user,
            community: community.toLowerCase(),
            title: title,
            content: content,
            created: created
        })
    }

    async removePost(id){
        let where = {
            field: 'id',
            operator: '=',
            value: id
        }

        return (await this.database.removeFromDatabaseTable(POST_TABLE, {where: where})).removed
    }

    async getPost(id) {
        let where = {
            field: 'id',
            operator: '=',
            value: id
        }

        let result = (await this.database.getFromDatabaseTable(POST_TABLE, {where: where, implement: POST_IMPLEMENT})).results[0]

        result.user = this.cleanUser(result.user)

        return result
    }

    cleanUser(user){
        if(user){
            let newUser = {

            }

            newUser.id = user.id
            newUser.name = user.displayedName
            newUser.chosenName = user.chosenName
            newUser.image = user.image

            return newUser
        }else{
            return {}
        }
    }

    cleanOwnUser(user){
        if(user){
            let newUser = this.cleanUser(user)

            newUser.email = user.email
            newUser.permissions = Database.#cleanPermissions(user.permissions)

            return newUser
        }else{
            return {}
        }
    }

    static #cleanPermissions(permissions){
        if(permissions){
            let newPermissions = []

            for(let i in permissions){
                newPermissions.push(permissions[i].permission)
            }

            return newPermissions
        }else{
            return []
        }
    }

    async getCommunityPosts(name, skip, limit){
        let where = {
            field: 'community',
            operator: '=',
            value: name.toLowerCase()
        }

        let sort = {
            field: 'created',
            direction: 'desc'
        }

        let result = (await this.database.getFromDatabaseTable(POST_TABLE, {where: where, implement: POST_IMPLEMENT, skip: skip, limit: limit, sort: sort})).results

        for(let i in result){
            result[i].user = this.cleanUser(result[i].user)
        }

        return result
    }

    async matchCommunityPost(value, skip, limit){
        let where = {
            field: 'title',
            operator: 'match',
            value: value,
            or: {
                field: 'content',
                operator: 'match',
                value: value
            }
        }

        let sort = {
            field: 'title',
            direction: 'desc',
            levenshtein: value
        }

        let result = (await this.database.getFromDatabaseTable(POST_TABLE, {where: where, implement: POST_IMPLEMENT, sort: sort, skip: skip, limit: limit})).results

        for(let i in result){
            result[i].user = this.cleanUser(result[i].user)
        }

        return result
    }

    async getCommunitiesPosts(communities, skip, limit){
        let where = {
            field: 'community',
            operator: '=',
            value: communities[0].name.toLowerCase()
        }

        let lastOr = where

        for(let i = 1; i < communities.length; i++){
            lastOr.or = {
                field: 'community',
                operator: '=',
                value: communities[i].name.toLowerCase()
            }

            lastOr = lastOr.or
        }

        let sort = {
            field: 'created',
            direction: 'desc'
        }

        let result = (await this.database.getFromDatabaseTable(POST_TABLE, {where: where, implement: POST_IMPLEMENT, skip: skip, limit: limit, sort: sort})).results

        for(let i in result){
            result[i].user = this.cleanUser(result[i].user)
        }

        return result
    }

    async getUserPosts(username, skip, limit){
        let user = await this.getUser(username)

        if(user){
            let where = {
                field: 'user',
                operator: '=',
                value: user.id
            }

            let sort = {
                field: 'created',
                direction: 'desc'
            }

            let result = (await this.database.getFromDatabaseTable(POST_TABLE, {where: where, implement: POST_IMPLEMENT, skip: skip, limit: limit, sort: sort})).results

            for(let i in result){
                result[i].user = this.cleanUser(result[i].user)
            }

            return result
        }else{
            throw 'Could not find user'
        }
    }

    async insertSubscription(user, community){
        await this.database.insertToDatabaseTable(SUBSCRIPTION_TABLE, {user: user, community: community.toLowerCase()})
    }

    async removeSubscription(user, community){
        let where = {
            field: 'user',
            operator: '=',
            value: user,
            and: {
                field: 'community',
                operator: '=',
                value: community.toLowerCase()
            }
        }

        return (await this.database.removeFromDatabaseTable(SUBSCRIPTION_TABLE, {where: where})).removed
    }

    async getSubscriptions(user){
        let where = {
            field: 'user',
            operator: '=',
            value: user
        }

        let implement = [
            {
                from: {
                    table: COMMUNITY_TABLE,
                    field: 'name'
                },
                field: 'community',
                as: 'community'
            }
        ]

        let data = await this.database.getFromDatabaseTable(SUBSCRIPTION_TABLE, { where: where, implement: implement }).results

        let result = []

        for(let i in data){
            result.push(data[i].community)
        }

        return result
    }

    async getCdn(){
        let sort = {
            field: 'load',
            direction: 'desc'
        }

        return await this.database.getFromDatabaseTable(CDN_TABLE, {sort: sort}).results
    }

    async insertPermission(user, permission){
        await this.database.insertToDatabaseTable(PERMISSION_TABLE, {user: user, permission: permission})
    }

    async getPermission(user, permission){
        let where = {
            field: 'user',
            operator: '=',
            value: user,
            and: {
                field: 'permission',
                operator: '=',
                value: permission
            }
        }

        return (await this.database.getFromDatabaseTable(PERMISSION_TABLE, {where: where})).results[0]
    }
}