const mongodb = require("mongodb");
const MongoClient = mongodb.MongoClient;
const dbUrl = "mongodb+srv://Yogesh:yogi123456@cluster0.868du.mongodb.net/myFirstDatabase?retryWrites=true&w=majority";

module.exports = {dbUrl, mongodb, MongoClient};
