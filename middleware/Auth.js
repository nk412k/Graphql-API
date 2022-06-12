const jwt = require("jsonwebtoken");

module.exports = (req, res, next) => {
  const authHeader = req.get("Authorization");
  if (!authHeader) {
    req.isAuth=false;
    return next();
  }
  const token = authHeader.split(" ")[1];
  let decodedtoken;
  try {
    decodedtoken = jwt.verify(token, "somesecret");
  } catch (err) {
    req.isAuth = false;
    return next();
  }
  if (!decodedtoken) {
    req.isAuth = false;
    return next();
  }
  req.userId = decodedtoken.userId;
  req.isAuth=true;
  next();
};
