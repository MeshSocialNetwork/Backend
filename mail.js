const nodemailer = require('nodemailer')
const fs = require('fs')

const mail_template = fs.readFileSync('verify_mail_template.html', 'utf-8')

module.exports = class Mail {
    constructor(config) {
        this.config = config

        this.transporter = nodemailer.createTransport({
            host: config.smtpHostname,
            port: config.smtpPort,
            auth: {
                user: config.smtpUsername,
                pass: config.smtpPassword
            },
            tls: {
                rejectUnauthorized: false
            }
        })
    }

    async sendVerificationEmail(email, username, verification){
        let url = `${this.config.url}/api/user/verify-mail?username=${username}&verificationId=${verification}`

        let mail = mail_template
        mail = mail.replaceAll("{USERNAME}", username)
        mail = mail.replaceAll("{VERIFY_MAIL_URL}", url)

        await this.transporter.sendMail({from: this.config.smtpUsername, to: email, subject: 'meshnetwork.app mail verification', html: mail})
    }
}