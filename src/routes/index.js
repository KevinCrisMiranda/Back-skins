const express = require('express');
const router = express.Router();
const pool = require('../config/database');
const pool2 = require('../config/database2');
const TradeOfferManager = require('steam-tradeoffer-manager');
const verifyToken = require('../function/verifyToken')
const axios = require('axios');
const Mailgen = require('mailgen');
const steaminventory = require('get-steam-inventory');
const processEmail = require('../function/cleanEmail')
const processData = require('../function/cleanData')
const processUrl = require('../function/cleanUrl')
const itemsList = require('../steam/itemsList');
const itemsSell = require('../steam/itemsSell');
const nodemailer = require('nodemailer');
const encontrarCoincidencias = require('../function/coincidencias');
require("dotenv").config()
const jwt = require('jsonwebtoken');

const manager = new TradeOfferManager({
  "domain": "localhost:4000", //your domain API KEY
  "language": "en",
  "pollInterval": 30000,
  "cancelTime": 600000,
  "pendingCancelTime": 600000

});
const crypto = require("crypto");


const userDataNull = {
  steamid: false,
  saldo: '',
  depositado: '',
  url: '',
  tema: 'light'
}

let transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAILBOT, // Tu correo electrónico de Gmail
    pass: process.env.PASSBOT, // Tu contraseña de Gmail
  }
});

//PLANTILLA 
let mailGenerator = new Mailgen({
  theme: 'default',
  product: {
      // Appears in header & footer of e-mails
      name: 'ECUA SKINS',
      link: 'https://mailgen.js/'
  }
});


router.get('/', async (req, res) => {
  return res.json({ saldo: "1", nombre: "", promo: "off" })
});
// RUTAS DE LA APLICACION 
router.post('/saldo', async (req, res) => {
  const { id, profile } = req.body

  await pool.query('SELECT *   FROM usuario WHERE userId=' + id, (err, result) => {

    if (err) {
      console.log("error")
      return res.json({ saldo: "0.00", nombre: "", promo: "off" })
    }


    var nombre = crypto.randomBytes(20).toString('hex');
    if (result.length <= 0) {
      pool.query('INSERT INTO usuario (userId,name_id,saldo,url,code,estado,prom,apostado,depositado,oferta,sesion) VALUES ("' + id + '","' + profile + '",' + 0.00 + ',"","",0,"off",' + 0 + ',' + 0 + ' ,"off","' + nombre + '")', (err, result) => {
        if (err) {
          return res.json({ saldo: "0.00", nombre: "", promo: "off" })
        }
      });
      return res.json({ saldo: "0.00", nombre: nombre, promo: "off" })
    }


    var saldo = result[0].saldo;
    saldo = saldo.toFixed(2)
    let prom = profile.indexOf("ABETSKINS.COM") > -1
    var promo;
    if (prom === true) {
      promo = "on";

    } else {
      promo = "off";
    }

    pool.query("UPDATE usuario Set sesion=?,prom=? WHERE userId=?", [nombre, promo, id], (err, result) => {
      if (err) {
        return res.json({ saldo: "3", nombre: "" })
      } else {

        return res.json({ saldo: saldo, nombre: nombre, promo: promo })
      }
    })


  })

});

// SESIÓN ECUA SKINS 
router.post('/ecu-user', async (req, res) => {
  const { id } = req.body;
  const payload = { id };
  const secret = process.env.JWSEC;
  const options = { expiresIn: '24h' };
  const token = jwt.sign(payload, secret, options);
  await pool2.query('SELECT *  FROM usuarios WHERE steamid=' + id, (err, result) => {

    if (err) return res.json(userDataNull)

    if (result.length <= 0) {
      pool2.query('INSERT INTO usuarios (steamid,saldo,depositado,url,tema) VALUES ("' + id + '",' + 0 + ',' + 0 + ',"' + '' + '","light")', (err) => {
        if (err) {
          console.log(err)
          return res.json(userDataNull)
        }
      });
      return res.json({ steamid: id, saldo: '0.00', depositado: '0.00', url: '', tema: "light", token })
    }

    res.json({ ...result[0], token });
  });

});

// INVENTARIO CLIENTES USUARIOS
router.post('/v1/api/ecu/inventario', verifyToken, async (req, res) => {
  const { id } = req.body;
  let items = [];
  await manager.getUserInventoryContents(id, 570, 2, true, async (err, inventory) => {
    if (err) {
      console.log(err);
      return res.json({})
    }

    if (inventory.length == 0) {
      // Inventory empty
      console.log("CS:GO inventory is empty");
      res.json({})
    }
     inventory.forEach(function (item) {
      items.push({
        name: item.name,
        assetid: item.assetid,
        img: item.icon_url,
      });

    })
    const result = await pool2.query('SELECT * FROM lista')
    const resultItems = await itemsList(items, result)
    items = resultItems.filter(function (el) {
      return el != null;
    });


    items.sort(function (a, b) {

      return b.retiro - a.retiro
      
      });	
    res.json(items)
  });
});

router.post('/v1/api/ecu/inventario-bot', verifyToken, async (req, res) => {
  let botItems = [];
  let userItems = [];

  try {
    const botInventory = await new Promise((resolve, reject) => {
      manager.getUserInventoryContents(process.env.BOTIDS, 570, 2, true, (err, inventory) => {
        if (err) {
          console.log(err);
          reject(err);
        } else {
          resolve(inventory);
        }
      });
    });

    const userInventory = await new Promise((resolve, reject) => {
      manager.getUserInventoryContents(process.env.BOTIDS2, 570, 2, true, (err, inventory) => {
        if (err) {
          console.log(err);
          reject(err);
        } else {
          resolve(inventory);
        }
      });
    });

    if (botInventory.length === 0 && userInventory.length === 0) {
      console.log("Both inventories are empty");
      return res.json({});
    }

    botInventory.forEach(function (item) {
      botItems.push({
        name: item.name,
        assetid: item.assetid,
        img: item.icon_url,
        owner: 'bot-1', // Indicar que este item pertenece al bot
      });
    });

    userInventory.forEach(function (item) {
      userItems.push({
        name: item.name,
        assetid: item.assetid,
        img: item.icon_url,
        owner: 'ramses', // Indicar que este item pertenece al usuario admin
      });
    });

    let allItems = [...botItems, ...userItems];

    const result = await pool2.query('SELECT * FROM lista');
    const resultItems = await itemsList(allItems, result);
    allItems = resultItems.filter(function (el) {
      return el != null;
    });

    allItems.sort(function (a, b) {
      return b.retiro - a.retiro;
    });

    res.json(allItems);
  } catch (error) {
    console.error(error);
    res.json({});
  }
});


// INSERT A BANCOS
router.post('/v1/api/ecu/pay-method', verifyToken, (req, res) => {
  const { id, values, banco } = req.body;
  const cleanJson = processData(values);
  pool2.query('INSERT INTO metodos (`steamid`, `tipo`, `cedula`, `nombre`, `cuenta`,`banco`) VALUES ("' + id + '","' + cleanJson.tipo + '","' + cleanJson.id + '","' + cleanJson.name + '","' + cleanJson.cuenta + '","' + banco + '")', (err) => {
    if (err) {
      console.log(err)
      return res.json(userDataNull)
    }
  });
  res.json(values.name)
})
// INSERT A BINANCE Y AIRTM 
router.post('/v1/api/ecu/pay-method-cripto', verifyToken, (req, res) => {
  const { id, values, banco } = req.body;
  const cleanJson = processEmail(values);
  pool2.query('INSERT INTO metodos (`steamid`, `correo`,`banco`) VALUES ("' + id + '","' + cleanJson.email + '","' + banco + '")', (err) => {
    if (err) {
      console.log(err)
      return res.json(userDataNull)
    }
  });
  res.json(cleanJson)
})

// INSERT A URL TRADE 
router.post('/v1/api/ecu/url', verifyToken, (req, res) => {
  const { id, values } = req.body;
  const cleanJson = processUrl(values);
  pool2.query("UPDATE usuarios Set url=? WHERE steamid=?", [cleanJson.url, id], (err, result) => {
    if (err) {
      res.json({ message: 'Error al agregar URL' })
    } else {
      res.json({ message: 'Exito al agregar URL' })
    }
  })

})
// INSERT A CORREO TRADE 
router.post('/v1/api/ecu/email', verifyToken, (req, res) => {
  const { id, values } = req.body;
  const cleanJson = processEmail(values);
  pool2.query("UPDATE usuarios Set email=? WHERE steamid=?", [cleanJson.email, id], (err, result) => {
    if (err) {
      res.json({ message: 'Error al agregar URL' })
    } else {
      res.json({ message: 'Exito al agregar URL' })
    }
  })

})

// SELECTED USER BANCOS
router.post('/v1/api/ecu/pay-user', verifyToken, (req, res) => {
  const { id, banco } = req.body;
  pool2.query('SELECT * FROM metodos WHERE steamid="' + id + '" AND banco="' + banco + '"', (err, result) => {
    if (err) {
      console.log(err)
      return res.status(300).json('Error Al Cargar Datos')
    }

    res.json({ ...result[0] });
  });
})

//SELCETED USER DATA 
router.post('/v1/api/ecu/data-user', verifyToken, (req, res) => {
  const { id } = req.body;
  pool2.query('SELECT * FROM usuarios WHERE steamid=' + id, (err, result) => {
    if (err) {
      console.log(err)
      return res.status(300).json('Error Al Cargar Datos')
    }
    res.json({ ...result[0] });
  })
})

// VENDER INVENTARIO 
router.post('/v1/api/ecu/vender', verifyToken, async (req, res) => {


  //   const result = await pool2.query('SELECT * FROM lista');
  //   
  //   const [itemsCoin, getItems] = await encontrarCoincidencias(inventory, selectedItems, result)
  //   const saldoSuficiente = saldoUser[0].saldo >= itemsCoin;

  //   if (!saldoSuficiente) {
  //     return res.json({ message: 'Saldo Insuficiente', estado: 'error' });
  //   }

  try {
    const { id, selectedItems, token } = req.body;
    const saldoUser = await pool2.query('SELECT saldo, url FROM usuarios WHERE steamid=' + id);
    if (saldoUser[0].url === '') {
      return res.json({ message: 'Ingresa tu Url', estado: 'error' });
    }
    
    const headers = {
      "Content-type": "application/json; charset=UTF-8",
      "Authorization": 'Bearer ' + token
    };


    const response = await axios.post(process.env.PORTBOT + '/deposit', { id, url: saldoUser[0].url, selectedItems }, { headers });
    if (response.data.estado === 'success') {
      res.json({ message: 'Oferta enviada', estado: 'success' })
    } else {
      res.json({ message: 'Error al enviar oferta', estado: 'error' })
    }
  } catch (error) {
    res.json({ message: 'Error al enviar oferta', estado: 'error' })
  }

})
// COMPRAR BOT INVENTARIO 
router.post('/v1/api/ecu/comprar-bot', verifyToken, async (req, res) => {

  // const { id } = req.body;
  // const result = await pool2.query('SELECT * FROM lista');
  // const saldoUser = await pool2.query('SELECT saldo, url FROM usuarios WHERE steamid=' + id)
  // const [itemsCoin, getItems] = await encontrarCoincidencias(inventory, selectedItems, result)
  // const saldoSuficiente = saldoUser[0].saldo >= itemsCoin;

  // if (!saldoSuficiente) {
  //   return res.json({ message: 'Saldo Insuficiente', estado: 'error' });
  // }
  const { id, selectedItems, token } = req.body;
  
    
  try {
    
    const { id, selectedItems, token } = req.body;
    const saldoUser = await pool2.query('SELECT saldo, url FROM usuarios WHERE steamid=' + id);
    const ramsesItems = selectedItems.filter(item => item.owner === 'ramses');
    const otherItems = selectedItems.filter(item => item.owner !== 'ramses');
    if (saldoUser[0].url === '') {
      return res.json({ message: 'Ingresa tu Url', estado: 'error' });
    }
    const headers = {
      "Content-type": "application/json; charset=UTF-8",
      "Authorization": 'Bearer ' + token
    };

    let responseBot = null;
    let responseRamses = null;
    
    if (otherItems && otherItems.length > 0) {
      responseBot = await axios.post(process.env.PORTBOT + '/retiro', { id, url: saldoUser[0].url, otherItems }, { headers });
    }
    
    if (ramsesItems && ramsesItems.length > 0) {
      responseRamses = await axios.post(process.env.PORTBOT + '/retiro-ramses', { id, url: saldoUser[0].url, ramsesItems }, { headers });
    }

    if ((responseBot && responseBot.data.estado === 'success') || (responseRamses && responseRamses.data.estado === 'success')) {
      if (responseRamses) {
        const dataMessageItems = responseRamses.data.getItems.map(item => ({
         item: item?.market_hash_name,
         assetid: item?.assetid
        }));
        //DATA PLANTILLA 
        let emailResponse = {
          body: {
            name: 'Kevin Miranda',
            intro: `Intercambio <a href="${saldoUser[0].url}" target="_system">Enlace Intercambio</a>`,
            greeting: 'Hola',
            signature: 'Coordialmente',
            table: {
              data: dataMessageItems
            },
            outro: 'Ecua Skins llevando la plataforma de items Dota 2 al siguiente nivel.'
          }
        };
        let htmlEmail = mailGenerator.generate(emailResponse);
        let mailOptions = {
          from: process.env.EMAILBOT,
          to: process.env.EMAIL,
          subject: `Intercambio steam ${responseRamses?.data.id}`,
          html: htmlEmail,
        };
        transporter.sendMail(mailOptions, function (error, info) {
          console.log(error)
          if(error) {
            console.log('Error al Enviar mensaje')
            res.json({ message: 'Error el enviar oferta', estado: 'error' });
          
          }
        })

      }
      res.json({ message: 'Oferta enviada', estado: 'success' });
    } else {
      let errorMessage = 'Error al enviar oferta 1';
      if (responseBot && responseBot.data.message) {
        errorMessage = responseBot.data.message;
      } else if (responseRamses && responseRamses.data.message) {
        errorMessage = responseRamses.data.message;
      }
      res.json({ message: errorMessage, estado: 'error' });
    }
  } catch (error) {
    console.log(error)
    res.json({ message: 'Error al enviar oferta 2', estado: 'error' })
  }

})

// DAOTS TABLA data-table
router.post('/v1/api/ecu/data-table', verifyToken, (req, res) => {
  const { id, page } = req.body; // Agregamos el parámetro "page" para especificar la página actual
  const pageSize = 6; // Especificamos el número de registros que deseamos obtener en cada página
  const offset = (page - 1) * pageSize; // Calculamos el número de registros que debemos omitir en cada página
 console.log(page)
  pool2.query('SELECT COUNT(*) AS total FROM ofertas WHERE userId="' + id + '"', (err, countResult) => {
    if (err) {
      console.log(err)
      return res.status(300).json('Error al cargar datos')
    }

    const total = countResult[0].total; // Obtenemos el número total de registros
    const totalPages = Math.ceil(total / pageSize); // Calculamos el número total de páginas

    pool2.query('SELECT * FROM ofertas WHERE userId="' + id + '"ORDER BY time DESC LIMIT ' + pageSize + ' OFFSET ' + offset, (err, result) => {
      if (err) {
        console.log(err)
        return res.status(300).json('Error al cargar datos')
      }
      res.json({ data: result, totalPages: totalPages, totalElements: total });
    });
  });
})
// ACTUALIZAR SALDO 
// DAOTS TABLA data-table
router.post('/v1/api/ecu/update-saldo', verifyToken, async (req, res) => {
  const { id } = req.body; // Agregamos el parámetro "page" para especificar la página actual
  const result = await pool2.query('SELECT `saldo`, `depositado` FROM `usuarios` WHERE steamid=' +id);
  res.json(result[0]);
})

//RETIRO BANCO
router.post('/v1/api/ecu/retiro-banco', verifyToken, async (req, res) => {
  const { id, valor, idOffer, plataforma } = req.body;
  const result = await pool2.query('SELECT `saldo`, `depositado` FROM `usuarios` WHERE steamid=' +id);
  try {
    if (valor <= result[0]?.saldo) {
      let newSaldo = result[0]?.saldo - valor;
      newSaldo = newSaldo.toFixed(2);
      //DATA PLANTILLA 
      let emailResponse = {
        body: {
          name: 'Kevin Miranda',
          intro: `Retiro de la plataforma ${plataforma}`,
          greeting: 'Hola',
          signature: 'Coordialmente',
          table: {
            data: [
              {
                item: 'Retiro',
                description: plataforma,
                price: `$${valor}`,
              }
            ]
          },
          outro: 'Ecua Skins llevando la plataforma de items Dota 2 al siguiente nivel.'
        }
      };

      const resultNewId = await pool2.query('SELECT MAX(idOfer) + 1 AS nuevo_id FROM ofertas');
      let htmlEmail = mailGenerator.generate(emailResponse);
      let mailOptions = {
        from: process.env.EMAILBOT,
        to: process.env.EMAIL,
        subject: `Retiro de la plataforma ${plataforma} Id:${resultNewId[0]?.nuevo_id}`,
        html: htmlEmail,
      };

      // funcion de enviar email 
      transporter.sendMail(mailOptions, function (error, info) {
        if (error) {
          console.log(error)
          return res.json({ 
            message: "Problema con el servidor al contactar con el metodo de pago", 
            estado: "error", 
            subTitle:"Error de servidor al intentar contactar el método de pago, intentalo más tarde." 
          })
        } else {

          pool2.query("UPDATE usuarios Set saldo=? WHERE steamid=?", [newSaldo, id], (err, result) => {
            if (err) {
              return res.json({
                message: 'Error al actualizar saldo de retiro', 
                estado: 'error',
                subTitle:"Error por parte del servidor al intentar actualizar tu saldo actual, intentalo más tarde." 
              });
            }

            pool2.query('INSERT INTO ofertas (`id`,`tipo`, `userId`, `costo`, `estado`, `plataforma`, idCuenta) VALUES (" ","retiro","' + id + '","' + valor + '","Pendiente", "' + plataforma + '", "' + idOffer + '")', (err) => {
              if (err) {
                console.log(err)
                return res.json({ 
                  message: "Problema con el servidor al retirar", 
                  estado: "error",
                  subTitle:"Error por parte delservidor al retirar tu saldo, intentalo más tarde." 
                })
              }
              return res.json({
                 message: `Retiro exitoso`, 
                 estado: "success", 
                 subTitle:"La transferencia de fondos puede tardar hasta una hora dependiendo del método de retiro que se haya seleccionado." });
            });

          }) 
        }

      });
      
    } else {
      return res.json({ 
        message: 'Saldo Insuficiente', 
        estado: 'error',
        subTitle:"Por el momento tu saldo actual no te permite realizar esta operación de retiro." 
      });
    }

  } catch (error) {
    return res.json({ 
      message: 'Error al retirar', 
      estado: 'error',
      subTitle:"Error inesperado por parte del servidor, intentalo más tarde."  
    });
  }
})

router.post('/v1/api/ecu/deposito-banco', verifyToken, async (req, res) => {
  const { id, valor, idOffer, plataforma } = req.body;
  try {
      //DATA PLANTILLA 
      let emailResponse = {
        body: {
          name: 'Kevin Miranda',
          intro: `Deposito de la plataforma ${plataforma}`,
          greeting: 'Hola',
          signature: 'Coordialmente',
          table: {
            data: [
              {
                item: 'Deposito',
                description: plataforma,
                price: `$${valor}`,
              }
            ]
          },
          outro: 'Ecua Skins llevando la plataforma de items Dota 2 al siguiente nivel.'
        }
      };

      const resultNewId = await pool2.query('SELECT MAX(idOfer) + 1 AS nuevo_id FROM ofertas');
      let htmlEmail = mailGenerator.generate(emailResponse);
      let mailOptions = {
        from: process.env.EMAILBOT,
        to: process.env.EMAIL,
        subject: `Deposito de la plataforma ${plataforma} Id:${resultNewId[0]?.nuevo_id}`,
        html: htmlEmail,
      };

      // funcion de enviar email 
      transporter.sendMail(mailOptions, function (error, info) {
        if (error) {
          console.log(error)
          return res.json({ 
            message: "Problema con el servidor al contactar con el metodo de pago", 
            estado: "error", 
            subTitle:"Error de servidor al intentar contactar el método de pago, intentalo más tarde." 
          })
        } else {
            pool2.query('INSERT INTO ofertas (`id`,`tipo`, `userId`, `costo`, `estado`, `plataforma`, idCuenta) VALUES (" ","deposito","' + id + '","' + valor + '","Pendiente", "' + plataforma + '", "' + idOffer + '")', (err) => {
              if (err) {
                console.log(err)
                return res.json({ 
                  message: "Problema con el servidor al retirar", 
                  estado: "error",
                  subTitle:"Error por parte delservidor al retirar tu saldo, intentalo más tarde." 
                })
              }
              return res.json({
                 message: `Deposito exitoso`, 
                 estado: "success", 
                 subTitle:"La transferencia de fondos puede tardar hasta una hora dependiendo del método de retiro que se haya seleccionado.",
                 idOffert: resultNewId[0]?.nuevo_id,
                });
            });

        }

      });
  } catch (error) {
    return res.json({ 
      message: 'Error al depositar', 
      estado: 'error',
      subTitle:"Error inesperado por parte del servidor, intentalo más tarde."  
    });
  }
})


router.post('/v1/api/ecu/pay-email-deposit', verifyToken, async (req, res) => {
  try {
      //DATA PLANTILLA 
      const { idOferta } = req.body;

      console.log(idOferta)

      let emailResponse = {
        body: {
          name: 'Kevin Miranda',
          intro: `Deposito de la plataforma pago echo Id:${idOferta}`,
          greeting: 'Hola',
          signature: 'Coordialmente',
          outro: 'Ecua Skins llevando la plataforma de items Dota 2 al siguiente nivel.'
        }
      };

      let htmlEmail = mailGenerator.generate(emailResponse);
      let mailOptions = {
        from: process.env.EMAILBOT,
        to: process.env.EMAIL,
        subject: `Deposito pago echo ${idOferta}`,
        html: htmlEmail,
      };

      // funcion de enviar email 
      transporter.sendMail(mailOptions, function (error, info) {
        if (error) {
          console.log(error)
          return res.json({ 
            message: "Problema con el servidor al contactar con el metodo de pago", 
            estado: "error", 
            subTitle:"Error de servidor al intentar contactar el método de pago, intentalo más tarde." 
          })
        } else {
              return res.json({
                 message: `Deposito exitoso`, 
                 estado: "success", 
                 subTitle:"La transferencia de fondos puede tardar hasta una hora dependiendo del método de retiro que se haya seleccionado." 
              });
        }

      });
  } catch (error) {
    console.log(error)
    return res.json({ 
      message: 'Error al depositar', 
      estado: 'error',
      subTitle:"Error inesperado por parte del servidor, intentalo más tarde."  
    });
  }
})

router.post('/v1/api/ecu/deposito-cancel', verifyToken, async (req, res) => {
  const { idOffer } = req.body;
  try {
    pool2.query("UPDATE OFERTAS Set estado=? WHERE idOfer=?", ['Cancelado', idOffer], (err, result) => {
      if (err) {
        return res.json({
          message: 'Error termino tiempo de deposito', 
          estado: 'error',
          subTitle:"Error por parte del servidor al intentar actualizar tu saldo actual, intentalo más tarde." 
        });
      }
      return res.json({
        message: `Deposito Cancelado`, 
        estado: "success", 
        subTitle:"La transferencia se ah cancelado." 
       });
    })
  } catch (error) {
    return res.json({ 
      message: 'Error al depositar', 
      estado: 'error',
      subTitle:"Error inesperado por parte del servidor, intentalo más tarde."  
    });
  }
})

module.exports = router;

