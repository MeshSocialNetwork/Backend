module.exports = class Messages{
    static createdAdminUser(password){
        return `Created user admin with password ${password}`
    }

    static get internalServerError(){
        return 'Internal server error'
    }

    static get couldNotCreateAdminUser(){
        return 'Could not create admin user'
    }

    static get couldNotFindUser(){
        return 'Could not find user'
    }

    static missingParameterValue(name){
        return `Missing parameter value for ${name}`
    }

    static missingBodyValue(name){
        return `Missing body value for ${name}`
    }

    static missingQueryValue(name){
        return `Missing query value for ${name}`
    }

    static invalidBodyValue(value){
        return `Invalid body value ${value}`
    }

    static get userRegistered(){
        return 'User registered, please verify email'
    }

    static get emailVerified(){
        return 'Email verified and account unlocked'
    }

    static get verificationNotFound(){
        return 'Could not find verification'
    }

    static get emailAlreadyUsed(){
        return 'Email already used'
    }

    static get usernameAlreadyUsed(){
        return 'Username already used'
    }

    static get invalidSession(){
        return 'Invalid session'
    }

    static get notLoggedIn(){
        return 'Not logged in'
    }

    static get emailNotVerified(){
        return 'Email not verified'
    }

    static get couldNotUnsubscribeFromCommunity() {
        return 'Could not unsubscribe from community'
    }

    static get unsubscribedFromCommunity(){
        return 'Unsubscribed from community'
    }

    static get alreadySubscribedToCommunity(){
        return 'Already subscribed to community'
    }

    static get noPermission(){
        return 'No permission'
    }

    static get couldNotFindCommunity(){
        return 'Could not find community'
    }

    static get subscribedToCommunity(){
        return 'Subscribed to community'
    }

    static get couldNotFindPost(){
        return 'Could not find post'
    }

    static get couldNotDeletePost(){
        return 'Could not delete post'
    }

    static get deletedPost(){
        return 'Deleted post'
    }

    static get createdPost(){
        return 'Created post'
    }

    static get couldNotDeleteCommunity(){
        return 'Could not delete community'
    }

    static get deletedCommunity(){
        return 'Deleted community'
    }

    static get createdCommunity(){
        return 'Created community'
    }

    static get communityAlreadyExists(){
        return 'Community already exists'
    }

    static get wrongPassword(){
        return 'Wrong password'
    }

    static get couldNotDeleteUser(){
        return 'Could not delete user'
    }

    static get deletedUser(){
        return 'Deleted user'
    }

    static get updatedUser(){
        return 'Updated user'
    }

    static get loginSuccessful(){
        return 'Login successful'
    }
}