const express = require('express');
const app = express();
const cors = require('cors');

// pahts
const morgan = require('morgan');
const path = require('path');
const bodyParser = require('body-parser');
//
app.set('port', process.env.PORT || 4001);
app.use(cors({origin:'http://localhost:4000'}));
//
app.use(bodyParser.urlencoded({extended: false}));
app.use(express.json());

app.use(require('./routes'));
app.use(morgan('dev'));

app.listen(app.get('port'), function() {
    console.log('Server on port', app.get('port'));
  });