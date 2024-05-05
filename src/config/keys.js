// module.exports = {
//     database:{
//         host: 'localhost',
//         user: 'root',
//         password: '',
//         database: 'copy'
//     }
//     // database:{
//     //     host: 'localhost',
//     //     user: 'root',
//     //     password: 'V1ramses$',
//     //     database: 'abet'
//     // }

// }
require("dotenv").config()
module.exports = {
    database:{
        host:  process.env.DB,
        user:  process.env.USER,
        password: process.env.PASSWORD, 
        database:  process.env.DATABASE 
    }
}      