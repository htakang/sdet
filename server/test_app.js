const express = require('express');
const app = express();
const session = require('express-session');
const {sess} = require('../session/session');
 
app.use((session(sess)));
const router = require('../routes/routes.js');
//const host = process.env.HOST ||  'localhost';
const port = process.env.PORT || 3001;

app.use(express.json());
app.use(express.urlencoded({
    extended: true
}));
app.use(router);

app.listen(port, () => {
    //console.log(`listening on port ${port}`);
});