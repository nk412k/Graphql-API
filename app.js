const express = require("express");
const fs=require('fs');
const bodyParse = require("body-parser");
const mongoose = require("mongoose");
const path = require("path");
const multer = require("multer");
const { graphqlHTTP } = require("express-graphql");
const graphqlSchema = require("./graphql/schema");
const graphqlResolver = require("./graphql/resolver");
const Auth=require('./middleware/Auth');
const {deleteImage}=require('./util/deleteImage');

const app = express();

const fileStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "images");
  },
  filename: (req, file, cb) => {
    cb(null, Math.random() * 99999 + "-" + file.originalname);
  },
});

const fileFilter = (req, file, cb) => {
  if (
    file.mimetype == "image/png" ||
    file.mimetype == "image/jpg" ||
    file.mimetype == "image/jpeg"
  ) {
    cb(null, true);
  } else {
    cb(null, false);
  }
};

app.use(bodyParse.json());
app.use(
  multer({ storage: fileStorage, fileFilter: fileFilter }).single("image")
);
app.use("/images", express.static(path.join(__dirname, "images")));

app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader(
    "Access-Control-Allow-Methods",
    "GET, POST, DELETE, PUT, PATCH"
  );
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  if(req.method==='OPTIONS'){
    return res.sendStatus(200);
  }
  next();
});

app.use(Auth);
app.put('/post-image',(req,res,next)=>{
  if(!req.isAuth){
    throw new Error('unauthenticated');
  }
  if(!req.file){
    return res.status(200).json({message:'file not provided'});
  }
  if(req.body.oldPath){
    deleteImage(req.body.oldPath);
  }
  return res.status(201).json({
    message: "image uploaded",
    filePath: req.file.path.replace('\\','/'),
  });
})

app.use(
  "/graphql",
  graphqlHTTP({
    schema: graphqlSchema,
    rootValue: graphqlResolver,
    graphiql: true,
    customFormatErrorFn(err) {
      if (!err.originalError) {
        return err;
      }
      const data = err.originalError.data;
      const code = err.originalError.code || 500;
      const message = err.message || "An error occurred";
      return { message: message, data: data, status: code };
    },
  })
);

app.use((error, req, res, next) => {
  console.log(error);
  const statusCode = error.statusCode || 500;
  const data = error.data;
  const message = error.message;
  res.status(statusCode).json({ message: message, data: data });
});

mongoose
  .connect(
    "mongodb+srv://Nokhalal:Nokhalal@cluster0.grwrf.mongodb.net/socialbook?retryWrites=true&w=majority"
  )
  .then((result) => {
    const server = app.listen(8080);
  })
  .catch((err) => console.log(err));

