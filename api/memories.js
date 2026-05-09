const { allowCors, getMemories } = require("./_core");

module.exports = async function handler(req, res) {
  if (allowCors(req, res)) return;

  const memories = await getMemories();
  res.status(200).json(memories);
};