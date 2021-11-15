const bcrypt = require("bcryptjs");
const JWT = require("jsonwebtoken");
const secret = "nk1lajf7oihela2oh2nsehq5qoo3cbu5ehi7dsfd";
const JWTD = require("jwt-decode");

const hashing = async (value) => {
  try {
    const salt = await bcrypt.genSalt(10);
    const hash = await bcrypt.hash(value, salt);

    return hash;
  } catch (error) {
    console.log("Bcrypt error" + error);
    return error;
  }
};

const hashCompare = async ({password, hashValue}) => {
  try {
    return await bcrypt.compare(password, hashValue);
  } catch (error) {
    return error;
  }
};

const createJWT = async ({username, email}) => {
  return await JWT.sign(
    {
      username,
      email,
    },
    secret,
    {
      expiresIn: "15m",
    }
  );
};

const createJWTlogin = async ({username, email}) => {
  return await JWT.sign(
    {
      username,
      email,
    },
    secret,
    {
      expiresIn: "24h",
    }
  );
};

const authenticate = async (token) => {
  const decode = JWTD(token);
  console.log(decode);
  if (Math.round(new Date() / 1000) <= decode.exp)
  return decode.email;
  else
  return false;
};

module.exports = {hashing, hashCompare, createJWT, createJWTlogin,authenticate};
