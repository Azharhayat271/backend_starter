const express= require("express");
const app=express();
const mongoose= require("mongoose");
app.use(express.json());


const cors = require('cors');

const corsOptions = {
  origin: 'http://localhost:3000',
  methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
};
// http://127.0.0.1:5500
app.use(cors(corsOptions));




mongoose.connect('mongodb://localhost:27017/lab')
.then(()=> console.log("connected to mongodb"))
.catch(err=> console.error("Could not connect to mongodb",err))

const port = 5000;

app.listen(port, () => {
  console.log('app listening at 5000');
});






