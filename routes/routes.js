const express = require('express')
const path = require('path')
const router = express.Router()
const {AddUser, VerifyUser} = require('../controllers/userController')
const {AddToBasket, ShowBasketItems, CountBasketItems, RemoveBasketItem, Checkout, Success} = require('../controllers/basketController')
const {GenerateDiscountCodes, ApplyCode} = require('../controllers/discountController')
const session = require('express-session')
const {sess} = require('../session/session')

// GET
router.get('/', function(req,res){
    if(req.session.email === undefined){
        res.status(200).sendFile(path.join(__dirname, '../views/index.html'))
    }else{
        res.status(200).sendFile(path.join(__dirname, '../views/index2.html'))
    }
});

router.get('/basket',ShowBasketItems);

router.get('/countBasket', CountBasketItems)

router.get('/removeItem', RemoveBasketItem)

router.get('/generateCodes', GenerateDiscountCodes)

router.get('/checkout', Checkout)

router.get('/success', Success)

router.get('/login',function(req,res){
    res.sendFile(path.join(__dirname, '../views/login.html'))
});

router.get('/register',function(req,res){
    res.sendFile(path.join(__dirname, '../views/register.html'))
});

router.get('/logout',function(req,res){
    req.session.destroy()
    res.sendFile(path.join(__dirname, '../views/index.html'))
});
//

//POST
router.post('/newUser',AddUser)

router.post('/verifyUser',VerifyUser)

router.post('/addToBasket',AddToBasket)

router.post('/applyCode', ApplyCode)

module.exports = router