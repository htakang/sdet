const mysql = require('mysql');
const {pool} = require('../database/database');
const { check } = require('express-validator');
const session = require('express-session');
const {sess} = require('../session/session');
 
function AddUser(req, res){
    check('name')
    .isEmpty()
    .withMessage('You must enter your name')
    check('email')
    .isEmpty()
    .withMessage('Please enter your email')
    .isEmail()
    .withMessage('Please enter a valid email address')
    check('phone')
    .isEmpty()
    .withMessage('Please enter a valid phone number')
    check('password')
    .isEmpty()
    .withMessage('Please enter a password')
    .equals('cpassword')

    const name = req.body.name;
    const email = req.body.email;
    const phone = req.body.phone;
    const password = req.body.password;

    let insertQuery = 'INSERT INTO ?? (??,??,??,??) VALUES (?,?,?,?)';
    let query = mysql.format(insertQuery, ["users", "name", "email","phone", "pwd", name, email, phone, password]);
    pool.query(query, (err, response) => {
        if (err) {
            console.error(err);
            return;
        }
        // rows added
        console.log(response.insertId);
        res.status(201).send('<h2>Successful registration</h2><a href="/login">Login</a>');
    });
}

function VerifyUser(req, res){
    check('email')
    .isEmpty()
    .withMessage('Enter your email address')
    .isEmail()
    .withMessage('Enter a valid email address')
    check('password')
    .isEmpty()
    .withMessage('Enter your password')

    const email = req.body.email;
    const password = req.body.password;

    let selectQuery = 'SELECT * FROM ?? WHERE ?? = ? AND ?? = ?';
    let query = mysql.format(selectQuery, ["users", "email",email , "pwd" , password]);
    
    pool.query(query, (err, data) => {
        if (err) {
            console.error(err);
            return;
        }
        // rows fetch
        if(data[0] === undefined){
            res.send('<h2>Unsuccessful login</h2><a href="/login">Login</a>');
        }else{
            req.session.userid = data[0].id;
            req.session.name = data[0].name;
            req.session.email = data[0].email;
            req.session.phone = data[0].phone;
            req.session.date_created = data[0].date_created;
            res.send('<h2>Successful login</h2><a href="/">View services</a>');
        }
        
    });
    
}

module.exports = {AddUser, VerifyUser};