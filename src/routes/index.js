const express = require('express');
const router = express.Router();
const pool = require('../config/database');
const crypto = require("crypto");

router.get('/', async (req, res) => {
	
res.json("Funciona Kevin")
});

router.post('/saldo', async (req, res) => {
    const {id,profile} =req.body
    
    await pool.query('SELECT *   FROM usuario WHERE userId='+id, (err, result) => {
     
        if (err) {
                console.log("error")
              return res.json({saldo:"1",nombre:"",promo:"off"})
            }

            
            var nombre = crypto.randomBytes(20).toString('hex');
            if (result.length<= 0) {
              pool.query('INSERT INTO usuario (userId,name_id,saldo,url,code,estado,prom,apostado,depositado,oferta,sesion) VALUES ("' +id+ '","' +profile+ '",' + 0 + ',"","",0,"off",' + 0 + ',' + 0 + ' ,"off","' +nombre+ '")', (err, result) => {
                if (err) {
                  return res.json({saldo:"2",nombre:"",promo:"off"})
                }
              });
              return res.json({saldo:"0.00",nombre:nombre,promo:"off"})
            }


            var saldo =result[0].saldo;
            saldo = saldo.toFixed(2)
            let prom = profile.indexOf("ABETSKINS.COM") > -1
            var promo;
            if (prom===true) {
              promo = "on";
              
            } else {
              promo = "off";
            }
          
                pool.query("UPDATE usuario Set sesion=?,prom=? WHERE userId=?",[nombre,promo,id], (err, result) => { 
                  if(err){
                    return res.json({saldo:"3",nombre:""})
                  }else{
                    
                    return res.json({saldo:saldo,nombre:nombre,promo:promo})
                  }
                })  
          
          
          })
   
});




module.exports = router;

