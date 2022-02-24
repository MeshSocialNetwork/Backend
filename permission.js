const ADMIN_PERMISSION = 'admin'
const CREATE_COMMUNITY_PERMISSION = 'create_community'
const MODERATOR_PERMISSION = 'moderator_'
const UPLOAD_IMAGE_PERMISSION = 'upload_image'
const CREATE_POST_PERMISSION = 'create_post'
const CREATE_POST_COMMUNITY_PERMISSION = 'create_post_community_'

module.exports = class Permission {
    constructor(database) {
        this.database = database
    }

    async admin(userId) {
        return await this.database.getPermission(userId, ADMIN_PERMISSION)
    }

    async createCommunity(userId){
        let communityCreator = await this.database.getPermission(userId, CREATE_COMMUNITY_PERMISSION)

        if(!communityCreator){
            communityCreator = await this.admin(userId)
        }

        return communityCreator
    }

    async moderator(userId, community) {
        let moderator = await this.database.getPermission(userId, MODERATOR_PERMISSION + community)

        if(!moderator){
            moderator = await this.admin(userId)
        }

        return moderator
    }

    async uploadImage(userId) {
        let uploader = await this.database.getPermission(userId, UPLOAD_IMAGE_PERMISSION)

        if(!uploader){
            uploader = await this.admin(userId)
        }

        return uploader
    }

    async createPost(userId){
        return await this.database.getPermission(userId, CREATE_POST_PERMISSION)
    }

    async createCommunityPost(userId, community){
        let createPost = await this.createPost(userId)

        if(createPost){
            createPost = await this.database.getPermission(userId, CREATE_POST_COMMUNITY_PERMISSION + community)

            if(!createPost){
                createPost = await this.moderator(userId, community)
            }

            if(!createPost){
                createPost = await this.admin(userId)
            }
        }

        return createPost
    }

    async giveAdmin(userId) {
        if(!(await this.admin(userId))){
            await this.database.insertPermission(userId, ADMIN_PERMISSION)
        }else{
            throw 'Already has admin permission'
        }
    }

    async giveCreateCommunity(userId) {
        if(!(await this.createCommunity(userId))){
            await this.database.insertPermission(userId, CREATE_COMMUNITY_PERMISSION)
        }else{
            throw 'Already has moderator permission'
        }
    }

    async giveModerator(userId, community) {
        if(!(await this.moderator(userId, community))){
            await this.database.insertPermission(userId, MODERATOR_PERMISSION + community)
        }else{
            throw 'Already has moderator permission'
        }
    }

    async giveUploadImage(userId){
        if(!(await this.uploadImage(userId))){
            await this.database.insertPermission(userId, UPLOAD_IMAGE_PERMISSION)
        }else{
            throw 'Already has upload image permission'
        }
    }

    async giveCreatePost(userId){
        if(!(await this.createPost(userId))){
            await this.database.insertPermission(userId, CREATE_POST_PERMISSION)
        }else{
            throw 'Already has create post permission'
        }
    }

    async giveCreateCommunityPost(userId, community){
        if(!(await this.createCommunityPost(userId, community))){
            await this.database.insertPermission(userId, CREATE_POST_COMMUNITY_PERMISSION + community)
        }else{
            throw 'Already has create post in community permission'
        }
    }
}
