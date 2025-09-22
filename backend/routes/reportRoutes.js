const express = require('express');
const { createReport } = require('../controller/reportController');

const reportRouter = express.Router();

reportRouter.post('/reports', createReport);

module.exports = reportRouter;


