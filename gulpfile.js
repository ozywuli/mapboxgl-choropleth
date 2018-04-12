// add this to your gulpfile.js
let gulp = require('gulp');
let GulpJumpstart = require('gulp-jumpstart');

new GulpJumpstart(gulp, {
    pluginName: 'mapboxgl-choropleth',
    standalone: 'Choropleth'
});
