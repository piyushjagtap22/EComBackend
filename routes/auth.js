const express = require('express')
const router = express.Router()
const User = require('../models/User')
const VerificationToken = require('../models/verificationToken')
const { body, validationResult } = require('express-validator')
const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')
const fetchuser = require('../middleware/fetchuser')
require("dotenv").config()
const nodemailer = require('nodemailer')
const { isValidObjectId } = require('mongoose')
const JWT_SECRET = process.env.JWT_SECRET
const { generateOTP } = require('../utils/auth')

const { OTPMail, transportObject, verifiedMail } = require('../utils/mail')
const { sendOTP } = require('../utils/sms')

// "/api/auth" Endpoint

//Route 1 : POST: Create a User /signup 
//No Login Required
router.post('/signup', [
    body('name', 'Enter a valid name').isLength({ min: 3 }),
    body('email', 'Enter a valid Email').isEmail()
], async (req, res) => {
    try {
        // If there are errors, return Bad Request and the Error
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.json({
                "status": {
                    "code": 400,
                    "message": "Bad Request"
                },
                "payload": { error: errors.array() }
            });
        }
        // Existing email Check
        let user = await User.findOne({ email: req.body.email })
        if (user) {
            return res.json({
                "status": {
                    "code": 409,
                    "message": "Conflict"
                },
                "payload": { error: "Email already Exist" }
            });
        }

        const newUser = new User({
            name: req.body.name,
            email: req.body.email
        })

        const OTP = generateOTP()
        //Create new VerificationToken Object
        const verificationToken = new VerificationToken({
            owner: newUser._id,
            token: OTP
        })
        user = await verificationToken.save()
        user = await newUser.save()
        console.log(OTP)

        //Sending OTP Mail
        var transport = nodemailer.createTransport(transportObject());
        transport.sendMail(OTPMail(req.body.name, req.body.email, OTP), (err) => {
            if (err) {
                console.log("Error Sending OTP", err)
            }
            else {
                console.log("OTP sent on the Email")
            }
        })

        // const data = {
        //     user: {
        //         id: user.id
        //     }
        // }
        // const authToken = jwt.sign(data, JWT_SECRET)
        res.json({
            "status": {
                "code": 200,
                "message": "OK"
            },
            "payload": {
                id: user.id
            }
        })

    }
    catch (err) {
        console.log(err.message);
        res.status(500).send("I")
        res.json({
            "status": {
                "code": 500,
                "message": "Internal Server Error"
            },
            "payload": {
                error: err
            }
        });
    }
})

//Route 1.1 : POST: Create a Google Acc User /signup 
//No Login Required
router.post('/gsignup', async (req, res) => {
    try {
        // If there are errors, return Bad Request and the Error
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.json({
                "status": {
                    "code": 400,
                    "message": "Bad Request"
                },
                "payload": {
                    error: errors.array()
                }
            });

        }
        // Existing email Check
        let user = await User.findOne({ email: req.body.email })
        if (user) {
            return res.json({
                "status": {
                    "code": 409,
                    "message": "Conflict"
                },
                "payload": {
                    error: 'Email already Exist'
                }
            });


        }
        const salt = await bcrypt.genSalt(10);
        const secPass = await bcrypt.hash(req.body.password, salt)
        const newUser = new User({
            name: req.body.name,
            email: req.body.email,
            password: secPass,
        })

        const OTP = generateOTP()
        //Create new VerificationToken Object
        const verificationToken = new VerificationToken({
            owner: newUser._id,
            token: OTP
        })
        user = await verificationToken.save()
        user = await newUser.save()
        console.log(OTP)

        //Sending OTP Mail
        var transport = nodemailer.createTransport(transportObject());
        transport.sendMail(OTPMail(req.body.name, req.body.email, OTP), (err) => {
            if (err) {
                console.log("Error Sending OTP", err)
            }
            else {
                console.log("OTP send on the Email")
            }
        })

        const data = {
            user: {
                id: user.id
            }
        }
        const authToken = jwt.sign(data, JWT_SECRET)

        res.json({
            "status": {
                "code": 200,
                "message": "OK"
            },
            "payload": {
                authToken
            }
        });

    }
    catch (err) {
        console.log(err.message);
        res.json({
            "status": {
                "code": 500,
                "message": "Internal Server Error"
            },
            "payload": { error: err.message }
        });

    }
})

// Route 2 : POST : Authenticate user /login
// No Login Required
router.post('/login', [
    body('email', 'Enter a valid Email').isEmail()
], async (req, res) => {
    // If there are errors, return Bad Request and the Error
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.json({
            "status": {
                "code": 400,
                "message": "Bad Request"
            },
            "payload": { error: errors.array() }
        });
    }

    const { email } = req.body;

    try {
        let user = await User.findOne({ email })
        if (!user) {
            return res.json({
                "status": {
                    "code": 400,
                    "message": "Bad Request"
                },
                "payload": { error: "Please try to login with correct credentials" }
            });
            
        }
        // const passwordCompare = await bcrypt.compare(password, user.password);
        // if (!passwordCompare) {
        //     return res.status(400).json({ error: "Please try to login with correct credentials" })
        // }

        const OTP = generateOTP()
        //Create/Edit VerificationToken Object

        console.log(OTP)
        let tokenObj = await VerificationToken.findOne({ owner: user.id })
        if (tokenObj) {
            tokenObj.token = OTP;
            await tokenObj.save()

        }
        else {
            const verificationToken = new VerificationToken({
                owner: user.id,
                token: OTP
            })
            await verificationToken.save()
        }

        //Sending OTP Mail
        var transport = nodemailer.createTransport(transportObject());
        transport.sendMail(OTPMail(user.name, user.email, OTP), (err) => {
            if (err) {
                return res.json({
                    "status": {
                        "code": 500,
                        "message": "Internal Server Error, Error Sending OTP"
                    },
                    "payload": { err }
                });
            }
            else {
                console.log("OTP send on the Email")
            }
        })

        const data = {
            user: {
                id: user.id
            }
        }
        // const authToken = jwt.sign(data, JWT_SECRET)
        res.json({
            "status": {
                "code": 200,
                "message": "OK"
            },
            "payload": { id: user.id }
        });
    }
    catch (err) {
        console.log(err)
        res.json({
            "status": {
                "code": 500,
                "message": "Internal Server Error"
            },
            "payload": { error: err }
        });
    }

})


// Route 3 : POST: User details /getuser
//Login Required
router.post('/getuser', fetchuser, async (req, res) => {
    try {
        userId = req.user.id
        const user = await User.findById(userId).select("-password")
        return res.json({
            "status": {
                "code": 200,
                "message": "OK"
            },
            "payload": { user }
        });
    }
    catch (err) {
        console.log(err)
        res.json({
            "status": {
                "code": 500,
                "message": "Internal Server Error"
            },
            "payload": { error: err }
        });
    }
})

// Route 4 : POST: User details /verifycode
//Login Required
router.post('/verifycode', async (req, res) => {
    try {

        const { userId, otp } = req.body
        console.log(userId, otp)
        if (!userId || !otp.trim()) return res.json({
            "status": {
                "code": 401,
                "message": "Unauthorized"
            },
            "payload": {  }
        });
        if (!isValidObjectId(userId)) return res.json({
            "status": {
                "code": 401,
                "message": "Unauthorized"
            },
            "payload": {  }
        });
        const user = await User.findById(userId)
        if (!user) return res.json({
            "status": {
                "code": 401,
                "message": "Unauthorized"
            },
            "payload": {  }
        });
        // if (user.emailVerified) return res.status(401).json({ success: false, error: "User already Verified" })
        const token = await VerificationToken.findOne({ owner: user._id })
        if (!token) return res.json({
            "status": {
                "code": 401,
                "message": "Unauthorized"
            },
            "payload": { error: 'Token Expired' }
        });
        const isMatched = await token.compareToken(otp)
        if (!isMatched) return res.json({
            "status": {
                "code": 401,
                "message": "Unauthorized"
            },
            "payload": { error: "Invalid Verification Code" }
        });
        user.emailVerified = true;

        await VerificationToken.findByIdAndDelete(token._id)
        await user.save()
        var transport = nodemailer.createTransport(transportObject());
        transport.sendMail(verifiedMail(user.name, user.email), (err) => {
            if (err) {
                return res.json({
                    "status": {
                        "code": 500,
                        "message": "Internal Server Error"
                    },
                    "payload": {  error : err}
                });
            }
            else {
                console.log("User Verified")
            }
        })

        const data = {
            user: {
                id: user.id
            }
        }
        const authToken = jwt.sign(data, JWT_SECRET)

        res.json({
            "status": {
                "code": 200,
                "message": "OK"
            },
            "payload": { authToken }
        });
    }

    catch (err) {
        console.log(err)
        res.json({
            "status": {
                "code": 500,
                "message": "Internal Server Error"
            },
            "payload": { error: err }
        });
        
    }
})


module.exports = router