const path = require('path');

module.exports = {
    entry: './public/js/scroll.js',
    output: {
        path: path.resolve(__dirname, 'public/dist'),
        filename: 'scroll.bundle.js',
    },
    mode: 'production',
};