module.exports = class Input{
    verifyUsername(username){
        let regex = new RegExp('^(?=.{4,16}$)(?![_.])(?!.*[_.]{2})[a-zA-Z0-9._]+(?<![_.])$')

        let match = username.match(regex)

        if(match){
            return (match[0].length === username.length)
        }else{
            return false
        }
    }

    verifyEmail(email){
        let regex = new RegExp('/^(([^<>()\\[\\]\\\\.,;:\\s@"]+(\\.[^<>()\\[\\]\\\\.,;:\\s@"]+)*)|(".+"))@((\\[[0-9]{1,3}\\.[0-9]{1,3}\\.[0-9]{1,3}\\.[0-9]{1,3}])|(([a-zA-Z\\-0-9]+\\.)+[a-zA-Z]{2,}))$/')

        let match = email.match(regex)

        if(match){
            return (match[0].length === email.length)
        }else{
            return false
        }
    }

    verifyPassword(password){
        let regex = new RegExp('^.{8,64}$')

        let match = password.match(regex)

        if(match){
            return (match[0].length === password.length)
        }else{
            return false
        }
    }
}