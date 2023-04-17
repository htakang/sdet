const mysql = require('mysql')
const {pool} = require('../database/database')
const {GetService} = require('../controllers/serviceController')
const {AutoBronzeDiscount, AutoDiamondDiscount, DiscountCodeAvailable} = require('../controllers/discountController')
const session = require('express-session')
const {sess} = require('../session/session')
const path = require('path')

async function AddToBasket(req, res) {
    await RemoveOverdueItems() //Check if some items are overdue and remove them
    const id = req.body.service_id
    if (await AtBasketLimit(req.session.userid) == false){
        let service = await GetService(id)
        let discount = 0;
        let payable = service[0].price - ((discount/100) * service[0].price)
        let insertQuery = 'INSERT INTO ?? (??,??,??,??,??,??) VALUES (?,?,?,?,?,?)'
        let query = mysql.format(insertQuery, ["basket", "service_id", "user_id","price","discount","payable", "name", id, req.session.userid, service[0].price, 0, payable, service[0].name])
        pool.query(query, (err, response) => {
            if (err) {
                console.error(err)
                return
            }
            // rows added
            console.log(response.insertId)
            res.status(200).json({"status":"ok"})
        });
    }else{
        res.status(403).json({"status":"You can only have a maximum of 10 items in your basket"})
    }
}

function ShowBasketItems(req, res){
    let selectQuery = 'SELECT * FROM ?? WHERE ?? = ?';
    let query = mysql.format(selectQuery, ["basket", "user_id",req.session.userid]);
    
    pool.query(query, async (err, data) => {
        if (err) {
            console.error(err)
            return
        }
        
        if(req.session.email === undefined){
            res.sendFile(path.join(__dirname, '../views/basket.html'))
        }else{
            if(Object.keys(data).length > 0){
                let total = 0
                let bronze = 0
                let silver = 0
                let gold = 0
                let platinum = 0
                let diamond = 0;
                let discountType = "none"
                let ordDetails = "";
                res.write('<!DOCTYPE html><html lang="en"><head><link rel="stylesheet" href="https://maxcdn.bootstrapcdn.com/bootstrap/4.3.1/css/bootstrap.min.css" crossorigin="anonymous">')
                res.write('</head><body><div class="container"><div class="row"><div class="col-sm-2"></div><div class="col-sm-8"><h2>Basket</h2>')
                res.write('<div class="jumbotron"><table class="table table-bordered">') 
                res.write('<tr><th>Service Id</th><th>Service</th><th>Price</th><th>Discount</th><th>Payable</th><th>Actions</th></tr>')
                Object.values(data).forEach(element => {
                    total += element.price
                    if(element.service_id == 1){
                        bronze++
                    }else if(element.service_id == 2){
                        silver ++
                    }else if(element.service_id == 3){
                        gold++
                    }else if(element.service_id == 4){
                        platinum++
                    }else if(element.service_id == 5){
                        diamond++
                    }

                    res.write(`<tr id="row_${element.id}"><td>${element.service_id}</td><td>${element.name}</td><td>${element.price}</td><td>${element.discount}</td><td>${element.payable}</td><td>`)
                    res.write(`<a href="/removeItem?id=${element.id}" class="btn btn-outline-danger">Remove</a></td></tr>`)
                })
                let discount = await AutoDiamondDiscount()
                if(discount == 0){
                    discount = await AutoBronzeDiscount()
                }else{
                    discountType = "AutoDiamond"
                }

                if(discount > 0){
                    discountType = "AutoBronze"
                }

                let payable = total - ((discount/100) * total)
                res.write(`<tr><td>Total</td><td></td><td></td><td></td><td>${total}</td><td></td></tr>`)

                if(discount > 0){
                    res.write(`<tr><td>Discount</td><td></td><td></td><td></td><td>${discount}%</td><td></td></tr>`)
                    res.write(`<tr><td>Payable</td><td></td><td></td><td></td><td>${payable}</td><td></td></tr>`)
                    res.write('</table>')
                }else{
                    let Disc = await DiscountCodeAvailable(req.session.userid)
                    if(Disc == 0){
                        res.write('<form method="post" action="/applyCode">')
                        res.write('<p><label>Apply discount code:<input type="text" name="code" class="form-control"><br>')
                        res.write('<button type="submit" class="btn btn-outline-dark">Apply code</button></p>')
                        res.write('</form>')
                    }else{
                        discount = Disc[0].discount
                        payable = total - ((discount/100) * total)
                        discountType = 'DiscountCode'
                        res.write(`<tr><td>Discount code:</td><td>${Disc[0].code}</td><td></td><td></td><td>${discount}%</td><td></td></tr>`)
                        res.write(`<tr><td>Payable</td><td></td><td></td><td></td><td>${payable}</td><td></td></tr>`)
                        res.write('</table>')
                    }

                    req.session.total = total
                    req.session.discountType = discountType
                    req.session.discount = discount
                    req.session.payable = payable
                    
                    if(bronze > 0){
                        ordDetails = ordDetails + " Bronze service:" + bronze
                    }
    
                    if(silver > 0){
                        ordDetails = ordDetails + " Silver service:" + silver
                    }
    
                    if(gold > 0){
                        ordDetails = ordDetails + " Gold service:" + gold
                    }
    
                    if(platinum > 0){
                        ordDetails = ordDetails + " Platinum service:" + platinum
                    }
    
                    if(diamond > 0){
                        ordDetails = ordDetails + " Diamond service:" + diamond
                    }
    
                    req.session.ord_details = ordDetails
                    if(discountType == 'DiscountCode'){
                        req.session.discountCode = Disc[0].code
                    }else{
                        req.session.discountCode = ""
                    }
                }
                res.write('<a href="/checkout" class="btn btn-outline-success">Checkout</a></div>')
                res.write('<p><a href="/">View services</a>') 
                res.write('</div><div class="col-sm-2"></div></div></div></body></html>')
                res.end()
            }else{
                res.sendFile(path.join(__dirname, '../views/basket.html'))
            }
        }
    });
}

async function AtBasketLimit(userid){
    await RemoveOverdueItems(); // Check if some items are overdue and remove them
    // Count the number of service id that are eligible for the discount
    const promise = await new Promise((resolve, reject) => {
        let selectQuery = 'SELECT COUNT(service_id) AS num FROM ?? WHERE ?? = ?'
        let query = mysql.format(selectQuery, ["basket", "user_id",userid])
        pool.query(query, (err, data) => {
            if (err) {
                console.error(err)
                return
            }
            resolve(data)
        });
    }) 
    if(promise[0].num < 10){
        return false;
    }else{
        return true;
    }
}

function CountBasketItems(req, res){
    let selectQuery = 'SELECT * FROM ?? WHERE ?? = ?';
    let query = mysql.format(selectQuery, ["basket", "user_id",req.session.userid]);
    
    pool.query(query, (err, data) => {
        if (err) {
            console.error(err)
            return
        }
        res.status(200).json({"count":Object.keys(data).length})
    })
}

function RemoveBasketItem(req, res){
    const id = req.query.id
    let delQuery = 'DELETE FROM ?? WHERE ?? = ?'
    let query = mysql.format(delQuery, ["basket", "id", id])
    pool.query(query, (err, response) => {
        if (err) {
            console.error(err)
            return
        }
        // rows removed 
        res.redirect('/basket') 
    });
}

async function SetCodeAsUsed(code, userid){
    const promise = await new Promise((resolve, reject) => {
        let updQuery = 'UPDATE ?? SET ?? = ? WHERE ?? = ? AND ?? = ?'
        let query = mysql.format(updQuery, ["codes", "status",1, "user_id", userid, "code", code])
        pool.query(query, (err, data) => {
            if (err) {
                console.error(err)
                return
            }
            resolve(data)
        });
    })
}

async function Checkout(req, res) {
    //Set the code table status to 1 if he used discount code
    let autodisc = "false"
    let discode = "false"
    if(req.session.discountType == "DiscountCode"){
        await SetCodeAsUsed(req.session.discountCode, req.session.userid)
        discode = req.session.discountCode
    }else if(req.session.discountType == "AutoDiamond"){
        autodisc = "Automatic Diamond Discount"
    }else if(req.session.discountType == "AutoBronze"){
        autodisc = "Automatic Bronze discount"
    }
    //Save the checkout information in the purchases table
    const promise = await new Promise((resolve, reject) => {
        let updQuery = 'INSERT INTO ?? (??,??,??,??,??,??,??) VALUES (?,?,?,?,?,?,?)'
        let query = mysql.format(updQuery, ["purchases", "items","total", "discount", "auto_disc","disc_code", "payable", "user_id", req.session.ord_details, req.session.total, req.session.discount, autodisc,discode, req.session.payable, req.session.userid])
        pool.query(query, (err, data) => {
            if (err) {
                console.error(err)
                return
            }
            resolve(data)
            //Success
            //redirect to success page
            res.redirect('/success')
        });
    })
}

async function Success(req, res) {
    const promise = await new Promise((resolve, reject) => {
        let updQuery = 'DELETE FROM ?? WHERE ?? = ?'
        let query = mysql.format(updQuery, ["basket", "user_id", req.session.userid])
        pool.query(query, (err, data) => {
            if (err) {
                console.error(err)
                return
            }
            resolve(data)
            //Success

            //TODO:Send Email to the buyer containing the purchase information
            //Show success page
            res.sendFile(path.join(__dirname, '../views/success.html'))
        });
    })
}

async function RemoveOverdueItems(){
    const promise = await new Promise((resolve, reject) => {
        let selectQuery = "SELECT id, code FROM ?? WHERE DATEDIFF(NOW(), date_added) > '7'" // 7days i.e a week
        let query = mysql.format(selectQuery, ["basket"])
        pool.query(query, (err, data) => {
            if (err) {
                console.error(err)
                return
            }
            resolve(data)
        });
    })
    
    if(Object.keys(promise).length > 0){
        Object.values(promise).forEach(async element => {
            const prom = await new Promise((resolve, reject) => {
                let selectQuery = "DELETE FROM ?? WHERE ?? = ?"
                let query = mysql.format(selectQuery, ["basket", "id", element.id])
                pool.query(query, (err, data) => {
                    if (err) {
                        console.error(err)
                        return
                    }
                    resolve(data)
                });
            })
        })
    }
}

module.exports = {AddToBasket, ShowBasketItems, CountBasketItems, RemoveBasketItem, Checkout, Success}