const mysql = require('mysql')
const {pool} = require('../database/database')
const session = require('express-session')
const {sess} = require('../session/session')
const path = require('path')
const randomstring = require("randomstring")

async function AutoBronzeDiscount(){
    // Count the number of service id that are eligible for the discount
    const promise = await new Promise((resolve, reject) => {
        let selectQuery = 'SELECT COUNT(service_id) AS num FROM ?? WHERE ?? = ?'
        let query = mysql.format(selectQuery, ["basket", "service_id",1])
        pool.query(query, (err, data) => {
            if (err) {
                console.error(err)
                return
            }
            resolve(data)
        });
    }) 
    if(promise[0].num >= 3){
        return 10;
    }else{
        return 0;
    }
}

async function AutoDiamondDiscount(){
    // Count the number of service id that are eligible for the discount
    const promise = await new Promise((resolve, reject) => {
        let selectQuery = 'SELECT COUNT(service_id) AS num FROM ?? WHERE ?? = ?'
        let query = mysql.format(selectQuery, ["basket", "service_id",5])
        pool.query(query, (err, data) => {
            if (err) {
                console.error(err)
                return
            }
            resolve(data)
        });
    }) 
    if(promise[0].num >= 3){
        return 30;
    }else{
        return 0;
    }
}

async function GenerateDiscountCodes(req, res){
    let codes = [];
    const promise = await new Promise((resolve, reject) => {
        for (let i = 1; i < 6; i++){
            rnd = randomstring.generate(4);
            codes.push(rnd);
            let insertQuery = 'INSERT INTO ?? (??, ??) VALUES (?, ?)'
            let query = mysql.format(insertQuery, ["codes", "code","discount", rnd, 10])
            pool.query(query, (err, response) => {
                if (err) {
                    console.error(err)
                    return
                }
                // rows added
                resolve(response)
            });
        }
    })
    res.status(200).json({"Codes":codes})
}

async function ApplyCode(req, res){
    await CodeExpired() //Checks and removes expired codes
    const code = req.body.code
    const promise = await new Promise((resolve, reject) => {
        let selectQuery = 'SELECT * FROM ?? WHERE ?? = ? AND ?? = ?'
        let query = mysql.format(selectQuery, ["codes", "code",code, "status", 0])
        pool.query(query, (err, data) => {
            if (err) {
                console.error(err)
                return
            }
            resolve(data)
        })
    }) 

    if(promise[0].code == code){
        const prom = new Promise((resolve, reject) =>{
            let selectQuery = 'UPDATE ?? SET ?? = ? WHERE ?? = ?'
            let query = mysql.format(selectQuery, ["codes", "user_id",req.session.userid, "code", promise[0].code])
            pool.query(query, (err, data) => {
                if (err) {
                    console.error(err)
                    return
                }
                resolve(data)
            })
        })
        res.redirect('/basket')
    }else{
        res.redirect('/basket')
    }
}

async function DiscountCodeAvailable(userid){
    const promise = await new Promise((resolve, reject) => {
        let selectQuery = 'SELECT * FROM ?? WHERE ?? = ? AND ?? = ?'
        let query = mysql.format(selectQuery, ["codes", "user_id",userid, "status", 0])
        pool.query(query, (err, data) => {
            if (err) {
                console.error(err)
                return
            }
            resolve(data)
        });
    }) 
    if(Object.keys(promise).length > 0){
        return promise;
    }else{
        return 0;
    }
}

async function CodeExpired(){
    const promise = await new Promise((resolve, reject) => {
        let selectQuery = "SELECT id, DATEDIFF(NOW(), created) AS days FROM ?? WHERE user_id IS NOT NULL AND ?? = ?"
        let query = mysql.format(selectQuery, ["codes", "status", 0])
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
            if (element.days > 90){ // 90 days or 3 months
                const prom = await new Promise((resolve, reject) => {
                    let selectQuery = "DELETE FROM ?? WHERE ?? = ?"
                    let query = mysql.format(selectQuery, ["codes", "id", element.id])
                    pool.query(query, (err, data) => {
                        if (err) {
                            console.error(err)
                            return
                        }
                        resolve(data)
                    });
                })
            }
        })
    }
}

module.exports = {AutoBronzeDiscount, AutoDiamondDiscount, GenerateDiscountCodes, ApplyCode, DiscountCodeAvailable}