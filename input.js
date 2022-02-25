module.exports = class Input{
    verifyUsername(username){
        let regex = new RegExp('^(?=.{4,16}$)(?![_.])(?!.*[_.]{2})[a-zA-Z0-9._]+(?<![_.])$')

        let match = username.match(regex)

        return (match.length === username.length)
    }

    verifyEmail(email){
        let regex = new RegExp('/^(([^<>()\\[\\]\\\\.,;:\\s@"]+(\\.[^<>()\\[\\]\\\\.,;:\\s@"]+)*)|(".+"))@((\\[[0-9]{1,3}\\.[0-9]{1,3}\\.[0-9]{1,3}\\.[0-9]{1,3}])|(([a-zA-Z\\-0-9]+\\.)+[a-zA-Z]{2,}))$/')

        let match = email.match(regex)

        return (match.length === email.length)
    }

    verifyPassword(password){
        let regex = new RegExp('^.{8,64}$')

        let match = password.match(regex)

        return (match.length === password.length)
    }
}