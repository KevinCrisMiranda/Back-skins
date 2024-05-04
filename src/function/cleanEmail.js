const Joi = require('joi');

const schema = Joi.object({
    email: Joi.string().required(),
});

function processEmail(data) {
    const { error, value } = schema.validate(data);

    if (error) {
        throw new Error(error.details[0].message);
    }

    const sanitizedData = {
        email: value.email.replace(/<(?:.|\n)*?>/gm, ''),
    };

    return sanitizedData;
}
module.exports = processEmail; 