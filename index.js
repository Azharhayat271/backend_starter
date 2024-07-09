const express = require("express");
const connectDB = require("./config/connection");
const cors = require('cors');
require("dotenv").config();


const app = express();

app.use(express.json());


const corsOptions = {
  origin: '/*',
  methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
};

app.use(cors(corsOptions));

//connet to mongoDB
connectDB();

const userRoutes = require("./routes/user");

// All routes
app.use("/api/users", userRoutes);



const port = process.env.PORT || 5000;

app.listen(port, () => {
  console.log(`App listening at ${port}`);
});
