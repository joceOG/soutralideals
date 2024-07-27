const mongoose = require('mongoose');

const GroupeCategorieSchema = mongoose.Schema({
    groupe : []
});

module.exports = mongoose.model('CategorieService', CategorieServiceSchema);