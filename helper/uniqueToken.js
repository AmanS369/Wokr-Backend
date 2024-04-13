import jwt from "jsonwebtoken";
function generateTokenId() {
  return jwt.sign({ unique: true }, process.env.SECRET_KEY);
}

export default generateTokenId;
