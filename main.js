const Database = require('./database.js')
const Api = require('./api.js')
const express = require('express')
const bodyParser = require('body-parser')
const cookieParser = require("cookie-parser")

const config = require('./config.json')

const API_PREFIX = '/api'
const PORT = 80

let database = new Database()

database.connect().then(() => {
    console.log('Connected to database')

    let api = new Api(database, config)

    api.createAdminUser()

    const app = express()
    app.use(bodyParser.json({limit: '50mb'}))
    app.use(cookieParser())

    app.get(API_PREFIX + '/', ((req, res) => {
        res.status(418).send('Hello world')
    }))

    app.get(API_PREFIX + '/user', (req, res) => {
        api.getUser(req, res)
    })

    app.get(API_PREFIX + '/user/verify-mail', (req, res) => {
        api.verifyUserMail(req, res)
    })

    app.get(API_PREFIX + '/user/:name', (req, res) => {
        api.getUserFromName(req, res)
    })

    app.get(API_PREFIX + '/user/:name/posts', (req, res) => {
        api.getUserPosts(req, res)
    })

    app.post(API_PREFIX + '/user/register', (req, res) => {
        api.registerUser(req, res)
    })

    app.post(API_PREFIX + '/user/login', (req, res) => {
        api.loginUser(req, res)
    })

    app.post(API_PREFIX + '/user/password', (req, res) => {
        api.changeUserPassword(req, res)
    })

    app.post(API_PREFIX + '/user/image', (req, res) =>{
        api.setUserImage(req, res)
    })

    app.delete(API_PREFIX + '/user', (req, res) => {
        api.deleteUser(req, res)
    })

    app.get(API_PREFIX + '/user/communities', (req, res) => {
        api.getSubscribedCommunities(req, res)
    })

    app.post(API_PREFIX + '/community', (req, res) => {
        api.createCommunity(req, res)
    })

    app.get(API_PREFIX + '/community/:name', (req, res) => {
        api.getCommunityPosts(req, res)
    })

    app.delete(API_PREFIX + '/community/:name', (req, res) => {
        api.deleteCommunity(req, res)
    })

    app.get(API_PREFIX + '/community/:name/subscribe', (req, res) => {
        api.subscribeToCommunity(req, res)
    })

    app.get(API_PREFIX + '/community/:name/unsubscribe', (req, res) => {
        api.unsubscribeFromCommunity(req, res)
    })

    app.get(API_PREFIX + '/community/:name/:postId', (req, res) => {
        api.getCommunityPost(req, res)
    })

    app.delete(API_PREFIX + '/community/:name/:postId', (req, res) => {
        api.deleteCommunityPost(req, res)
    })

    app.post(API_PREFIX + '/community/:name', (req, res) => {
        api.createCommunityPost(req, res)
    })

    app.get(API_PREFIX + '/search', (req, res) => {
        api.search(req, res)
    })

    app.get(API_PREFIX + '/search/user', (req, res) => {
        api.searchUser(req, res)
    })

    app.get(API_PREFIX + '/search/community', (req, res) => {
        api.searchCommunity(req, res)
    })

    app.get(API_PREFIX + '/search/post', (req, res) => {
        api.searchCommunityPost(req, res)
    })

    app.get(API_PREFIX + '/frontpage', (req, res) => {
        api.getFrontpage(req, res)
    })

    app.get(API_PREFIX + '/cdn', (req, res) => {
        api.getCdn(req, res)
    })

    app.listen(PORT, () => {
        console.log('Server started on port ' + PORT)
    })
})