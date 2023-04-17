const mysql = require('mysql')
const {pool} = require('../database/database')
const path = require('path')
const request = require("supertest")
const app = require("../routes/routes")


describe("POST /Add user", () => {
  it("should create a new user",  () => {
    const res = request(app).post("/newUser").send({
      name: "Test user name",
      email: "test@example.com",
      phone: "237670000000",
      password: "12345678",
      cpassword: "12345678"
    });
    console.log(res)
    expect(res.statusCode).toBe(201)
    expect(res.body.name).toBe("Test user name")
  })
})