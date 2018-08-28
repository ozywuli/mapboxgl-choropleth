// import {$, jQuery} from 'jquery';
import chroma from 'chroma-js';
import getParameterByName from 'woohaus-utility-belt/lib/getParameterByName';
import getCentroid from 'woohaus-utility-belt/lib/getCentroid';
import numberWithCommas from 'woohaus-utility-belt/lib/numberWithCommas';
import checkDevice from 'woohaus-utility-belt/lib/checkDevice';

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
            style: 'mapbox://styles/aosika/cjbepjvcn94182rmrjfnpudra',
            center: [0, 0],
            zoom: 0
        }, // mapbox

        /**
         * Map configuration
         */
        mapConfig: {
            legendReverse: true,
            featureHover: true,
            mapSelector: '.js-choropleth-map',
        },

        /**
         * Controls configuration
         */
        controlsConfig: {
            layerAnchorSelector: '.js-choropleth-layer-anchor'
        },


        /**
         * Feature Click Event Callback
         */
        featureClickEventCallback(event) {

        },

        /**
         * Update Layer Callback
         */
        updateLayerCallback(paramLayer, paramProperty) {
            
        }
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
    }

    /**
     * Prototype
     */
    

    namespace['pluginName'].prototype = {
        /*------------------------------------*\
          STATE
        \*------------------------------------*/
        map: null,
        activeLayer: null,
        activeLayerPropertyKey: null,
        activeLayerPropertyProperties: null,
        activeFeature: null,
        customLayers: [],
        $mapContainer: $('.choropleth-container'),
        mapLegend: 'mapboxgl-choropleth-legend',
        mapElement: document.getElementById('map'),

        /**
         * Keep track of touch time for IOS touch events
         */
        touchTime: null,
        

        /**
         * Init
         */
        init() {
            // console.log('init')
            this.instantiateMap();
        }, // init()


        /**
         * Instantiate mapbox map
         */
        instantiateMap() {
            // Map instance
            let map;
            // Mapbox access token
            mapboxgl.accessToken = this.options.mapboxToken;
            // Instantiate mapbox
            map = new mapboxgl.Map(this.options.mapboxConfig);

            map.doubleClickZoom.disable();
            map.addControl(new mapboxgl.NavigationControl(), 'top-right');

            this.map = map;

            this.createColorScales();

            // Map load promise
            new Promise((resolve, reject) => {
                this.map.on('load', this.mapLoaded.bind(this, resolve));
            }).then(this.afterMapLoaded.bind(this, this.map));
        }, // instantiateMap()


        /**
         * When the map is loaded
         */
        mapLoaded(resolve) {
            // Resolve map load promise
            resolve();

            // Add map layers
            this.addMapLayers();
        }, /// mapLoaded()


        /**
         * After the map is laoded
         */
        afterMapLoaded(map) {
            this.initQueryParamListener();
            this.initFeatureClickEvent();
            this.initLayerAnchorClickEvent();
        }, // afterMapLoaded()

        /**
         * Add Mapbox map layers
         */
        addMapLayers() {
            // console.log('method: addMapLayers');
            let layers = this.map.getStyle().layers;
            // Find the index of the first symbol layer in the map style
            let firstSymbolId;
            for (let i = 0; i < layers.length; i++) {
                if (layers[i].type === 'symbol') {
                    firstSymbolId = layers[i].id;
                    break;
                }
            }
            this.options.mapConfig.layers.forEach((layer, index) => {

                // Add map source
                this.map.addSource(layer.source.id, {
                    type: layer.source.type,
                    data: layer.source.data
                });
                

                // Add layers to map
                this.map.addLayer({
                    "id": layer.id,
                    "type": "fill",
                    "source": layer.source.id,
                    "paint": {
                        "fill-color": this.paintFill(layer.properties[0]),
                        "fill-opacity": 0.8,
                        "fill-outline-color": "#000"
                    },
                    'layout': {
                        'visibility': 'none'
                    }
                }, firstSymbolId);


                // check if touch device. if it's not a touch device, add mouse events
                if (!checkDevice.isTouch()) {
                    this.initMouseEvents(layer);
                } // checkDevice.isTouch()


                // Store all the custom layers
                this.customLayers.push(layer.id);
            });
        }, // addMapLayers

        /**
         * Initialize mouse events
         */
        initMouseEvents(layer) {
            // keep track of last feature
            let lastFeature;

            // mouse enter event
            this.map.on('mouseenter', layer.id, (event) => {
                // turn mouse cursor into a pointer
                this.map.getCanvas().style.cursor = 'pointer';

            });

            // mouse leave event
            this.map.on('mouseleave', layer.id, (event) => {
                this.map.getCanvas().style.cursor = '';

                lastFeature = undefined;
                $('.mapboxgl-choropleth-info-box').remove();
            });

            // mouse move event
            this.map.on('mousemove', layer.id, (event) => {
                let currentFeature = this.map.queryRenderedFeatures(event.point)[0];
                let $mapboxGLInfobox;
                let offsetInfobox;
                let mapboxGlInfoboxWidth;

                // Update the info box only if the hovered element changes
                if (currentFeature !== lastFeature) {
                    // set the lastFeature to the current Feature
                    lastFeature = currentFeature;

                    // remove any previous info boxes
                    if ($('.mapboxgl-choropleth-info-box').length) {
                        $('.mapboxgl-choropleth-info-box').remove();
                    }       

                    // property info string for the info box
                    let featurePropertyString = '';

                    // loop the currentFeature's property object
                    for (let featureProperty in currentFeature.properties) {
                        if (featureProperty !== 'name' && featureProperty !== 'keys') {
                            featurePropertyString += `
                                <div class="mapboxgl-choropleth-info-box__property">
                                    <span class="mapboxgl-choropleth-info-box__property-key">${featureProperty}</span>: <span class="mapboxgl-choropleth-info-box__property-value">${numberWithCommas(currentFeature.properties[featureProperty])}</span>
                                </div>
                            `;    
                        }
                    }                 

                    // append the new info box to map
                    $(this.options.mapConfig.mapSelector).append(`
                        <div class="mapboxgl-choropleth-info-box">
                            <h3 class="mapboxgl-choropleth-info-box__title">${currentFeature.properties.name}</h3>
                            ${featurePropertyString}
                        </div>
                    `)
                }

                $mapboxGLInfobox = $('.mapboxgl-choropleth-info-box');
                mapboxGlInfoboxWidth = parseInt($mapboxGLInfobox.outerWidth());

                // Reposition the info box if it spills over 
                if ( (event.originalEvent.clientX + mapboxGlInfoboxWidth ) > this.mapElement.getBoundingClientRect().right) {
                    offsetInfobox = mapboxGlInfoboxWidth;
                } else {
                    offsetInfobox = 0;
                }

                // Reposition the info box based on mouse cursor's position
                if ($mapboxGLInfobox.length) {
                    $mapboxGLInfobox.css({
                        top: `${event.originalEvent.clientY - parseInt($mapboxGLInfobox.height()) - 32}px`,
                        left: `${event.originalEvent.clientX - offsetInfobox}px`
                    })
                }
            });
        },

        /**
         * Listen to query parameter changes
         */
        initQueryParamListener() {
            // console.log('method: initQueryParamListener');

            this.checkQueryParam();

            window.onpopstate = history.onpushstate = (event) => {
                this.checkQueryParam();
            }

        }, // initQueryParamListener()


        /**
         * Check query params 
         */
        checkQueryParam() {
            let paramLayer = getParameterByName('layer');
            let paramProperty = getParameterByName('property');

            if (paramLayer) {
                if (paramProperty) {
                    this.updateLayer(paramLayer, paramProperty);
                } else {
                    this.updateLayer(paramLayer);
                }
            } else {
                this.updateLayer();
            }
        }, // checkQueryParam()


        /**
         * Update query param
         */
        updateQueryParam(paramLayer, paramProperty) {
            // Get the layer name from the URL
            let queryString = `layer=${paramLayer}`;

            // Get the property name (if it exists) from the URL
            if (paramProperty) {
                queryString += `&property=${paramProperty}`;
            }

            // Construct the new URL from the query string
            let pageUrl = '?' + queryString;
            window.history.pushState('', '', pageUrl);

            // Update layer
            this.updateLayer(paramLayer, paramProperty);
        }, // updateQueryParam()


        /**
         * Preprocess colors to add a color scale
         */
        createColorScales() {
            this.options.mapConfig.layers.map((layer) => {
                let colorScale;

                layer.properties.map((property) => {
                    colorScale = chroma.scale(property.colors).mode('lch').colors(property.step.length);

                    property['colorScale'] = colorScale;
                });

            });
        }, // createColorScales()


        /**
         * Set up the fill for layers
         */
        paintFill(prop) {
            let fillColorArray = [
                'step',
                ['get', prop.key]
            ];

            prop.colorScale.map((color, index) => {
                if (index > 0) {
                    fillColorArray.push(prop.step[index])    
                }

                fillColorArray.push(color);
            })

            return fillColorArray;
        }, // paintFill()


        /**
         * Initialize click events for all features
         */
        initFeatureClickEvent() {
            // Add click event to each custom layer
            this.customLayers.forEach((layer) => {
                // if (checkDevice.isIOS()) {
                //     this.map.on('touchstart', layer, this.featureTouchStartHandler.bind(this));
                //     this.map.on('touchend', layer, this.featureTouchEndHandler.bind(this));
                // } else {
                    this.map.on('click', layer, this.featureClickEventHandler.bind(this));
                // }
            });
        }, // initFeatureClickEvent

        /**
         * 
         */
        featureEventResponse(event) {
            this.activeFeature = event;
            this.options.featureClickEventCallback(event);
        },

        /**
         * 
         */
        featureTouchStartHandler(event) {
            this.touchTime = new Date();
            console.log('touch start');
            
        },

        /**
         * 
         */
        featureTouchEndHandler(event) {
            let diff = new Date() - this.touchTime;
            console.log('touch end initialized');
            console.log(diff);            
            
            if (diff < 150) {
                console.log('touch end condition');
                
                this.activeFeature = event;
                this.options.featureClickEventCallback(event);
            }
        },

        /**
         * Handles the click event for features
         */
        featureClickEventHandler(event) {
            this.featureEventResponse(event);
        }, // featureClickEventHandler


        /**
         * Click event for layer reveals/hide
         */
        initLayerAnchorClickEvent() {
            $('body').on('click', this.options.controlsConfig.layerAnchorSelector, this.layerAnchorClickEventHandler.bind(this))
        }, // initLayerAnchorClickEvent


        /**
         * Handles the anchor event for showing/revealing layers
         */
        layerAnchorClickEventHandler(event) {
            event.preventDefault();
            event.stopPropagation();

            // Get name of clicked layer from anchor
            let clickedLayer = $(event.currentTarget).attr('data-layer');
            let clickedProp = $(event.currentTarget).attr('data-prop');

            this.updateQueryParam(clickedLayer, clickedProp);
        }, // layerAnchorClickEventHandler()


        /**
         * Show user selected layer (active layer)
         */
        revealActiveLayer(activeLayer) {
            // console.log('method: revealActiveLayer');

            this.setActiveLayer(activeLayer);

            // Hide unclicked layers
            this.customLayers.forEach((layer) => {
                if (layer !== activeLayer) {
                    this.map.setLayoutProperty(layer, 'visibility', 'none')
                }
            })

            // Double check visibility of layer
            let visibility = this.map.getLayoutProperty(activeLayer, 'visibility');

            // Reveal layer if it isn't visible
            if (visibility !== 'visible') {
                this.map.setLayoutProperty(activeLayer, 'visibility', 'visible');
            }
        }, // revealActiveLayer


        /**
         * Update layer
         */
        updateLayer(layer, propertyName) {
            // console.log('method: updateLayer');

            if (!layer) {
                layer = this.options.mapConfig.layers[0].id;
            }

            // Reveal this layer
            this.revealActiveLayer(layer);

            // if property isn't passed in
            if (!propertyName) {
                // Set active properties
                this.setActiveProperty(this.findLayer(this.activeLayer).properties[0].key);

                // set property name to the default value (the first object)
                propertyName = this.findLayer(this.activeLayer).properties[0].key;
            } else {
                this.findLayer(this.activeLayer).properties.map((property) => {
                    if (property.key === propertyName) {
                        this.map.setPaintProperty(
                            this.activeLayer, 
                            'fill-color', 
                            this.paintFill(property)
                        );
                        this.setActiveProperty(propertyName);
                    }
                });
            }

            // Set layer filters
            this.map.setFilter(layer, ['has', propertyName]);

            // Update map legend
            this.addMapLegend();

            // Run update layer callback
            this.options.updateLayerCallback(this.activeLayer, propertyName);
        }, // updateLayer()



        /**
         * Set active layer
         */
        setActiveLayer(layer) {
            this.activeLayer = layer;
        },

        /**
         * Find layer
         */
        findLayer(layerName) {
            let foundLayer;
            this.options.mapConfig.layers.map((layer) => {
                if (layer.id === layerName) {
                    foundLayer = layer;
                }
            });
            return foundLayer;
        },

        /**
         * 
         */
        setActivePropertyKey(propertyKey) {
            this.activeLayerPropertyKey = propertyKey;
        },

        /**
         * 
         */
        setActiveKeyProperties() {
            this.findLayer(this.activeLayer).properties.map((property) => {
                if (property.key === this.activeLayerPropertyKey) {
                    this.activeLayerPropertyProperties = property;
                }                    
            });
        },

        /**
         * 
         */
        setActiveProperty(propertyKey) {
            this.setActivePropertyKey(propertyKey);
            this.setActiveKeyProperties(this);
        },

        /**
         * Add legends to the map
         */
        addMapLegend() {
            if ($(`.${this.mapLegend}`).length) {
                $(`.${this.mapLegend}`).remove();
            }

            let colorScale = this.activeLayerPropertyProperties.colorScale;
            let steps = this.activeLayerPropertyProperties.step;

            // Reverse the legend
            if (this.options.mapConfig.legendReverse) {
                colorScale = colorScale.slice().reverse();
                steps = steps.slice().reverse();
            }

            let rows = '';
            let stepsLength = steps.length;


            colorScale.forEach((color, index) => {
                let rowTitle;

                if (this.options.mapConfig.legendReverse) {
                    if (index === 0) {
                        rowTitle = `${steps[index]}+`;
                    } else {
                        rowTitle = `${steps[index]} – ${steps[index - 1]}`;
                    }
                } else {
                    if (index < (stepsLength-1)) {
                        rowTitle = `${steps[index]} – ${steps[index + 1]}`;
                    } else {
                        rowTitle = `${steps[index]}+`;
                    }                    
                }

                rows += `
                    <div class="mapboxgl-choropleth-legend__row">
                        <div class="mapboxgl-choropleth-legend__fill" style="background-color: ${color};"></div>
                        <div class="mapboxgl-choropleth-legend__row-title">
                            ${rowTitle}
                        </div>
                    </div>
                `;
            })

            let legendTitle = `<h3 class="mapboxgl-choropleth-legend__title">${this.activeLayerPropertyProperties.title}</h3>`;

            this.$mapContainer.append(`
                <div class="${this.mapLegend}">
                    <div class="mapboxgl-choropleth-legend__wrapper">
                        ${legendTitle}
                        ${rows}
                    </div>
                </div>
            `)
        }, // addMapLegend()
        


    } // prototype

    // console.log($.fn);




    /*------------------------------------*\
      Export 
    \*------------------------------------*/
    module.exports = namespace['pluginName'];

})( jQuery, window , document );