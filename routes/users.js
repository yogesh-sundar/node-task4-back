var express = require("express");
const nodemailer = require("nodemailer");
var router = express.Router();
const path = require("path");

const { dbUrl, mongodb, MongoClient } = require("../dbConfig");
const {
  hashing,
  hashCompare,
  createJWT,
  createJWTlogin,
  authenticate,
} = require("../library/auth");
const { sender, pwd } = require("../library/oauth");

/* GET users listing. */
router.get("/", function (req, res, next) {
  res.send("Invalid URL");
});

//getting all the users details

router.get("/all", async (req, res) => {
  const client = await MongoClient.connect(dbUrl);
  try {
    const db = await client.db("studentManagement");
    let user = await db.collection("users").find().toArray();

    res.send({
      message: "success",
      Data: user,
    });
  } catch (error) {
    console.log("error");
    res.send({
      message: "Error in DB",
    });
  }
});

// register a user

router.post("/register", async (req, res) => {
  const client = await MongoClient.connect(dbUrl);
  let email = req.body.email;
  try {
    const db = await client.db("studentManagement");
    let user = await db.collection("users").findOne({ email: email });
    if (!user) {
      const hash = await hashing(req.body.password);
      req.body.password = hash;
      let data = await db.collection("users").insertOne(req.body);
      const token = await createJWT({
        userName: req.body.userName,
        email: req.body.email,
      });

      const transport = await nodemailer.createTransport({
        service: "gmail",
        auth: {
          user: sender,
          pass: pwd,
        },
      });

      const confirmation = await transport.sendMail({
        from: "Password reset<yogeshsundar142@gmail.com>",
        to: req.body.email,
        subject: "To activate your account",
        html: `<h1>Email confirmation</h1>
        <h3>hi ${req.body.userName}</h3>
        <p>Kindly confirm your email by clicking below link</p>
        <a href= https://nodejs-task-4.herokuapp.com/users/confirm/${token}>Click here</a>
        <p>This link will get expired within 15 minutes of time</p>`,
      });

      res.send({
        message: "Registraion success",
      });
    } else {
      res.send({
        message: "User already exists and try to login",
      });
    }
  } catch (error) {
    console.log(error);
    res.json({
      message: "Error in DB",
    });
  } finally {
    client.close();
  }
});

//confirming the token

router.get("/confirm/:token", async (req, res) => {
  const client = await MongoClient.connect(dbUrl);
  const token = req.params.token;
  const mail = await authenticate(token);
  try {
    const db = client.db("studentManagement");
    const user = await db.collection("users").findOne({ email: mail });
    if (!user) {
      res.send({
        message: "Invalid Link",
      });
    } else {
      let data = await db
        .collection("users")
        .updateOne({ email: mail }, { $set: { status: "Active" } });
      res.sendFile(path.join(__dirname, "../library/confirmation.html"));
    }
  } catch (error) {
    console.log(error);
    res.send({
      message: "error in DB",
    });
  } finally {
    client.close();
  }
});

//Log in to your account

router.post("/login", async (req, res) => {
  const client = await MongoClient.connect(dbUrl);
  const email = req.body.email;
  const password = req.body.password;
  try {
    const db = await client.db("studentManagement");
    let user = await db.collection("users").findOne({ email: email });
    if (!user) {
      res.send({
        message: "User does not exist",
      });
    } else {
      if (user.status == "Active") {
        const compare = await hashCompare(password, user.password);
        if (compare) {
          const token = await createJWTlogin({
            userName: user.userName,
            email: user.email,
          });
          user = await db
            .collection("users")
            .updateOne({ email: user.email }, { $set: { token: token } });
          res.send({
            token,
            message: "Login succesufully",
          });
        } else {
          res.send({
            message: "Invalid password",
          });
        }
      } else {
        const token = await createJWT({
          userName: user.userName,
          email: user.email,
        });

        const transport = await nodemailer.createTransport({
          service: "gmail",
          auth: {
            user: sender,
            pass: pwd,
          },
        });
        const confirmation = await transport.sendMail({
          from: "Backend <yogeshsundar142@gmail.com>",
          to: user.email,
          subject: "Account activation",
          html: `<h1>Email confirmation</h1>
          <h3>Hi ${user.userName}</h3>
          <p>Kindly confirm your email by clicking below link</p>
          <a href=https://nodejs-task-4.herokuapp.com/users/confirm/${token}>Click here</a>
          <p>This link will get expired within 15 minutes of time</p>`,
        });

        res.send({
          message: "Account activation is require and check your mail",
        });
      }
    }
  } catch (error) {
    console.log(error);
    res.send({
      message: "Error in DB",
    });
  } finally {
    client.close();
  }
});

//password-reset

router.post("/reset-password", async (req, res) => {
  const client = await MongoClient.connect(dbUrl);
  const email = req.body.email;
  try {
    const db = await client.db("studentManagement");
    const user = await db.collection("users").findOne({ email: email });
    if (!user) {
      res.send({
        message: "Invalid mail id",
      });
    } else {
      const token = await createJWT({
        userName: user.userName,
        email: user.email,
      });
      const updateUser = await db
        .collection("users")
        .updateOne({ email: email }, { $set: { token: token } });
      const transport = await nodemailer.createTransport({
        service: "gmail",
        auth: {
          user: sender,
          pass: pwd,
        },
      });
      const resetMail = await transport.sendMail({
        from: "Backend <yogeshsundar142@gmail.com>",
        to: user.email,
        subject: "Resetting a password",
        html: `<h1>Email confirmation</h1>
      <h3>Hi ${user.userName}</h3>
      <p>We received a request to reset the password</p>
      <a href=http://localhost:3000/users/update-password/${token}>Reset password</a>
      <p style="color:blue">This link will get expired within 15 minutes of time</p>`,
      });

      res.send({
        message: "Reset link sent your mail",
      });
    }
  } catch (error) {
    console.log(error);
    res.send({
      message: "error in db",
    });
  } finally {
    client.close();
  }
});

//updating a password

router.post("/update-password/", async (req, res) => {
  const client = await MongoClient.connect(dbUrl);
  const { token, password } = req.body;

  const mail = await authenticate(token);
  if (mail) {
    try {
      const db = await client.db("studentManagement");
      const user = await db.collection("users").findOne({ email: mail });
      if (user && user.token === token) {
        const hash = await hashing(password);
        const data = await db
          .collection("users")
          .updateOne({ email: mail }, { $set: { password: hash, token: "" } });
        res.send({
          message: "Password updated successfully",
        });
      } else {
        res.send({
          message: "Invalid URL",
        });
      }
    } catch (error) {
      console.log(error);
      res.send({
        message: "Error in DB",
      });
    }
  } else {
    res.send({
      message: "Link Expired",
    });
  }
});

module.exports = router;
