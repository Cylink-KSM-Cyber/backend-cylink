const bcrypt = require('bcrypt');

exports.hash = async (string: string) => {
  return await bcrypt.hash(string, 10);
}

exports.compare = async (string: string, hashedString: string) => {
  return await bcrypt.compare(string, hashedString);
}
