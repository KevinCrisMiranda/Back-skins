const pool = require('../config/database');

function itemsList(items, consulta, bot) {
    let newItems = [];
    items.sort(function (a, b) {
	
        var nameA = a.name.toUpperCase();
        var nameB = b.name.toUpperCase();

        if (nameA < nameB) { return -1; } if (nameA > nameB) {
            return 1;
        }

        return 0;

    });
    
    for (let a = 0; a < items.length; a++) {
        var ind = consulta.length;
        
        for (let i = 0; i < ind; i++) {
    
            if (consulta[i].item == items[a].name) {
                var retiro = consulta[i].retiro;
                var deposito = consulta[i].deposito;
                var dep = deposito.toFixed(2);
                var ret=retiro.toFixed(2);
                newItems[a]={
                   name: items[a].name,
                   assetid: items[a].assetid,
                   img: items[a].img,
                   retiro:ret,
                   deposito:dep,
                   owner: items[a].owner
                }
                ind=-1;
            }
             
         }
    }
    return newItems;
}
module.exports = itemsList;