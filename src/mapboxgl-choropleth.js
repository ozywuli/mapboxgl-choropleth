// import {$, jQuery} from 'jquery';
import config from '../config';
import chroma from 'chroma-js';

// function getColor(d) {
//     return d > 1000 ? '#800026' :
//            d > 500  ? '#BD0026' :
//            d > 200  ? '#E31A1C' :
//            d > 100  ? '#FC4E2A' :
//            d > 50   ? '#FD8D3C' :
//            d > 20   ? '#FEB24C' :
//            d > 10   ? '#FED976' :
//                       '#FFEDA0';
// }





;(function( $, window, document, undefined ) {
    /**
     * Plugin namespace
     */
    let namespace = {
        pluginName: 'Choropleth'
    };

    /**
     * Default Options
     */
    let defaultOptions = {
        /**
         * Mapbox configuration
         */
        mapboxConfig: {
            container: 'map',
            style: 'mapbox://styles/aosika/cj8tmsx9cdk3m2rqmxbq8gr1b',
            center: [-96, 37.8],
            zoom: 4
        }, // mapbox
    };

    /**
     * Constructor
     */
    namespace['pluginName'] = function( userOptions ) {
        // Combine/merge default and user options
        this.options = $.extend( true, defaultOptions, userOptions );

        /**
         * Init
         */
        this.init();

        /**
         * Controller
         */
        this.controller = {

        }
    }

    /**
     * Prototype
     */
    
    namespace['pluginName'].prototype = {
        /*------------------------------------*\
          STATE
        \*------------------------------------*/
        map: null,

        /**
         * Init
         */
        init() {
            console.log('init');
            this.instantiateMap();
        }, // init()

        /**
         * Instantiate mapbox
         */
        instantiateMap() {
            // Map instance
            let map;
            // Mapbox access token
            mapboxgl.accessToken = config.mapboxAccessToken;
            // Instantiate mapbox
            map = new mapboxgl.Map(this.options.mapboxConfig);

            this.map = map;

            // Map load promise
            new Promise((resolve, reject) => {
                this.map.on('load', this.mapLoaded.bind(this, resolve));
            }).then(this.afterMapLoaded.bind(this, this.map));
        }, // instantiateMap()

        mapLoaded(resolve) {
            // Resolve map load promise
            resolve();

            // Add source for state polygons hosted on Mapbox, based on US Census Data:
            // https://www.census.gov/geo/maps-data/data/cbf/cbf_state.html
            this.map.addSource('states', {
                type: 'geojson',
                data: 'data/stateData.geojson'
            });


            // map.addLayer({
            //     "id": "states-join",
            //     "type": "fill",
            //     "source": "states",
            //     "paint": {
            //         "fill-color": [
            //             'step',
            //             ["get", "density"],
            //             "#FFEDA0",
            //             10, "#FFEDA0",
            //             20, "#FED976",
            //             50, "#FEB24C",
            //             100, "#FD8D3C",
            //             200, "#FC4E2A",
            //             500, "#E31A1C"
            //         ],
            //         "fill-opacity": 0.8
            //     }
            // });

            // this.map.addLayer({
            //     "id": "states-join",
            //     "type": "fill",
            //     "source": "states",
            //     "paint": {
            //         "fill-color": [
            //             'interpolate',
            //             ['linear'],
            //             ['get', 'density'],
            //             10, "#FFEDA0",
            //             20, "#FED976",
            //             50, "#FEB24C",
            //             100, "#FD8D3C",
            //             200, "#FC4E2A",
            //             500, "#E31A1C",
            //             1000, "#BD0026"
            //         ],
            //         "fill-opacity": 0.8
            //     }
            // });

            let scaleStep = [10, 20, 50, 100, 200, 500, 1000];

            function paintLayer() {

                let fillColorArray = [
                    'interpolate',
                    ['linear'],
                    ['get', 'density']
                ];

                chroma.scale(['#FFEDA0','#BD0026']).mode('lch').colors(scaleStep.length).map((color, index) => {
                    fillColorArray.push(scaleStep[index])
                    fillColorArray.push(color);
                })

                console.log(fillColorArray);

                return {
                    "fill-color": fillColorArray,
                    "fill-opacity": 0.8
                }
            }

            this.map.addLayer({
                "id": "states-join",
                "type": "fill",
                "source": "states",
                "paint": paintLayer()
            });


            this.map.on('click', 'states-join', function (e) {
                console.log(e.features);
                console.log(e.features[0].properties.name);
            });

        },

        afterMapLoaded(map) {

        }
    }

    console.log($.fn);


    /*------------------------------------*\
      Export 
    \*------------------------------------*/
    module.exports = namespace['pluginName'];

})( jQuery, window , document );