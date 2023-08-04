const client = require('twilio')(process.env.TWILIO_ACCOUNTSID, process.env.TWILIO_AUTHTOKEN)

sendOTP = () => {
    client.messages.create({
        body: 'Hello World',
        to: '+919644861883',
        from: '+14708354771'
    }).then(message => console.log(message))
        .catch(error => console.log(error))
}

numberVerified = () => {

}

module.exports = { sendOTP } 