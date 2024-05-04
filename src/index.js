const express = require('express');
const app = express();
const cors = require('cors');
require("dotenv").config()

// pahts
const morgan = require('morgan');
const path = require('path');
const bodyParser = require('body-parser');
//
app.set('port', process.env.PORT || process.env.PORTSEC);
app.use(cors({origin:[process.env.POINT, process.env.POINT2]}));
//
app.use(bodyParser.urlencoded({extended: false}));
app.use(express.json());

app.use(require('./routes'));
app.use(morgan('dev'));

app.listen(app.get('port'), function() {
    console.log('Server on port');
  });