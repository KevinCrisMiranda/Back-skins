const Joi = require('joi');

const schema = Joi.object({
    cuenta: Joi.string().required(),
    id: Joi.string().required(),
    name: Joi.string().required(),
    tipo: Joi.string().required()
});

function processData(data) {
    const { error, value } = schema.validate(data);

    if (error) {
        throw new Error(error.details[0].message);
    }

    const sanitizedData = {
        cuenta: value.cuenta.replace(/<(?:.|\n)*?>/gm, ''),
        id: value.id.replace(/<(?:.|\n)*?>/gm, ''),
        name: value.name.replace(/<(?:.|\n)*?>/gm, ''),
        tipo: value.tipo.replace(/<(?:.|\n)*?>/gm, '')
    };

    return sanitizedData;
}
module.exports =  processData; 