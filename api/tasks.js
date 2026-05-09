const { allowCors, getTasks } = require("./_core");

module.exports = async function handler(req, res) {
  if (allowCors(req, res)) return;

  const tasks = await getTasks();
  res.status(200).json(tasks);
};