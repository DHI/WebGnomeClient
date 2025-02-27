define([
    'jquery',
    'underscore',
    'backbone',
    'model/oil/library',
    'text!templates/oil/gnomeoil.html'
], function($, _, Backbone, OilLib, GnomeOilTemplate){
    'use strict';
	var gnomeOilView = Backbone.View.extend({
		id: 'gnomeOilContainer',

        events: {
            'shown.bs.tab': 'tabRender'
        },

		initialize: function(options){
            if (!_.isUndefined(options.containerClass)) {
                this.containerClass = options.containerClass;
                this.viewName = 'oilInfo';
            } else {
                this.viewName = 'oilLib';
            }

            if (!_.isUndefined(options.infoMode)) {
                options.model.fetch({
                    success: _.bind(function(model){
                        this.model = model;
                        this.render(options);
                    }, this)
                });
            } else {
                this.render(options);
                this.tabRender();
            }
		},

		render: function(options){
			var data = this.dataParse(this.model.attributes);
            var viewName = this.viewName;
            var compiled = _.template(GnomeOilTemplate)({data: data, viewName: viewName});
            this.$el.html(compiled);
		},

        tabRender: function(){
            this.$('.info:visible').tooltip({
                container: '.modal'
            });
        },
        
        kToC: function(k){
        	// Kelvin to Celsius
        	if (k === parseInt(k, 10)) {
        	    return (k - 273).toFixed(1);
            } else {
        	    return (k - 273.15).toFixed(1);
            }
        },

        cToF: function(c){
        	// Celsius to Farenheit
            return ((c * 9.0 / 5.0) + 32.0).toFixed(1);
        },

        kToF: function(k){
        	// Kelvin to Farenheit
        	return this.cToF(this.kToC(k));
        },

        doNotEvaluate: ["estimated"],

        groupAnalysis: ['aromatics_fraction',
			            'polars_fraction',
			            'resins_fraction',
			            'saturates_fraction',
			            'paraffins_fraction',
			            'sulphur_fraction',
			            'benzene_fraction',
			            'wax_content_fraction',
			            'asphaltenes_fraction'],

        tempAttrs: ['density_ref_temps',
		            'kvis_ref_temps',
		            'vapor_temp_k'],

        tempRangeAttrs: ['pour_point_min_k',
			             'pour_point_max_k',
			             'flash_point_min_k',
			             'flash_point_max_k'],

		dataParse: function(oilParam, estimatedObj){
            var oil = $.extend(true, {}, oilParam);

            console.log("entering dataParse()...");

            this.traverseOil("oil", oil, this.processOilNode);
            console.log("completed traversing oil structure...");

            // Set the initial estimated object.
            // We will then pass it on to recursed calls
            if (!estimatedObj && oil.estimated) {
            	estimatedObj = oil.estimated;
            	this.populateTemperatureEstimationFlags(estimatedObj);
            }

        	//for (var attr in oil) {
        		// determine if the attribute is estimated.
        		//if (estimatedObj[attr]) {
        			//oil[attr] = '<code>' + oil[attr] + '</code>';
        		//}
        	//}

            return oil;
		},

		traverseOil: function(parentAttr, o, func) {
		    for (var i in o) {
		        func.apply(this, [parentAttr, o, i]);  

		        if ($.inArray(i, this.doNotEvaluate) >= 0) {
		        	continue;
		        }

		        //f (o[i] !== null && typeof(o[i]) === "object") {
		            //going on step down in the object tree!!
		        	//this.traverseOil(i, o[i], func);
		        //}
		    }
		},

		processOilNode: function(parentAttr, parentObj, key) {
		    // console.log(parentAttr + "[" + key + "] : " + parentObj[key]);

		    this.parseTemperatureRangeData(parentObj, key);
			this.parseTemperatureData(parentObj, key);

		    this.parseGroupAnalysis(parentObj, key);

		    var i = 0;
		    if (parentObj[key] === null) {
            	// When value of oil attribute is null
                parentObj[key] = "--";
            }
            else if (key === 'bullwinkle_fraction')
            {
                parentObj[key] = parentObj[key].toFixed(2);
            }
            else if (key === 'oil_seawater_interfacial_tension_n_m' ||
            		 key === 'oil_water_interfacial_tension_n_m')
            {
               	// convert to cSt
            	parentObj[key] = (parentObj[key] * 1000).toFixed(1);
            }
            else if (key === 'api') {
            	parentObj[key] = parentObj[key].toFixed(1);
            }
            else if (key === 'weathering') {
            	parentObj[key] = parentObj[key].toFixed(2);
            }
            else if (key === 'density_ref_temps') {
                var dens_ref_temps_c = [];
                var dens_ref_temps_f = [];
                for (i = 0; i < parentObj[key].length; i++) {
                    dens_ref_temps_c[i] = this.kToC(parentObj[key][i]);
                    dens_ref_temps_f[i] = this.kToF(parentObj[key][i]);
                }
                parentObj.density_ref_temps_c = dens_ref_temps_c;
                parentObj.density_ref_temps_f = dens_ref_temps_f;
            }
            else if (key === 'kvis_ref_temps') {
                var kvis_ref_temps_c = [];
                var kvis_ref_temps_f = [];
                for (i = 0; i < parentObj[key].length; i++) {
                    kvis_ref_temps_c[i] = this.kToC(parentObj[key][i]);
                    kvis_ref_temps_f[i] = this.kToF(parentObj[key][i]);
                }
                parentObj.kvis_ref_temps_c = kvis_ref_temps_c;
                parentObj.kvis_ref_temps_f = kvis_ref_temps_f;
            }
            else if (key === 'kg_m_3') {
            	parentObj[key] = parentObj[key].toFixed(2);
            }
            else if (key === 'mass_fraction') {
                var saturate_fraction = 0;
                var aromatic_fraction = 0;
                var resin_fraction = 0;
                var asph_fraction = 0;
                for (i = 0; i < parentObj[key].length; i++) {
                    var mass_fraction = parentObj[key][i];
                    if (parentObj.sara_type[i] === 'Saturates') {
                        saturate_fraction = saturate_fraction + mass_fraction;
                    }
                    else if (parentObj.sara_type[i] === 'Aromatics') {
                        aromatic_fraction = aromatic_fraction + mass_fraction;
                    }
                    else if (parentObj.sara_type[i] === 'Resins') {
                        resin_fraction = resin_fraction + mass_fraction;
                    }
                    else if (parentObj.sara_type[i] === 'Asphaltenes') {
                        asph_fraction = asph_fraction + mass_fraction;
                    }
                }
                parentObj.saturate_fraction = saturate_fraction.toFixed(2);
                parentObj.aromatic_fraction = aromatic_fraction.toFixed(2);
                parentObj.resin_fraction = resin_fraction.toFixed(2);
                parentObj.asphaltene_fraction = asph_fraction.toFixed(2);
            }
            else if (key === 'categories') {
                for (i = 0; i < parentObj[key].length; i++) {
                    var parentCategory = parentObj[key][i].parent.name;
                    var childCategory = parentObj[key][i].name;
                    parentObj[key][i] = parentCategory + '-' + childCategory;
                }
            }
		},

		parseTemperatureRangeData: function(oil, attr) {
            if ($.inArray(attr, this.tempRangeAttrs) >= 0) {
            	// we are one of the registered min/max temperature attrs
                if (oil[attr] === null) {
                	// we don't have a value
                	// basically these are min/max pair values, and if
                	// one of them is missing, we just copy from the other
                	// attribute in the pair
                	var other_suffix = "";
                	if (attr.indexOf("_max_k") === attr.length - 6) {
                		other_suffix = "_min_k";
                    }
                	else if (attr.indexOf("_min_k") === attr.length - 6) {
                		other_suffix = "_max_k";
                    }

                    var other_attr = attr.substring(0, attr.length - 6) +
                    				 other_suffix;

                    if (oil[other_attr] === null) {
                    	// neither attribute in the pair have a value
                    	oil[attr] = "--";
                    }
                    else {
                    	oil[attr] = oil[other_attr];
                    }
                }

                // we should have a valid value at this point
                var attr_c = attr.substring(0, attr.length - 2) + '_c';
                var attr_f = attr.substring(0, attr.length - 2) + '_f';
                

                if (oil[attr] === "--") {
                	oil[attr_c] = oil[attr_f] = "--";
                }
                else {
                	oil[attr_c] = this.kToC(oil[attr]);
                	oil[attr_f] = this.kToF(oil[attr]);
                }
            }
        },

		parseTemperatureData: function(obj, key) {
            if ($.inArray(key, this.tempAttrs) >= 0) {
            	// we are one of the registered temperature attrs
                if (obj[key] === null) {
                	obj[key] = "--";
                }

                // we should have a valid value at this point
                var key_c = key.substring(0, key.length - 2) + '_c';
                var key_f = key.substring(0, key.length - 2) + '_f';

                if (obj[key] === "--") {
                	obj[key_c] = obj[key_f] = "--";
                }
                else {
                	obj[key_c] = this.kToC(obj[key]);
                	obj[key_f] = this.kToF(obj[key]);
                }
            }
        },

        populateTemperatureEstimationFlags: function(estimated) {
        	for (var idx in this.tempRangeAttrs) {
        		var attr = this.tempRangeAttrs[idx];
                if (estimated[attr] !== null) {
                	var attr_c = attr.substring(0, attr.length - 2) + "_c";
                	var attr_f = attr.substring(0, attr.length - 2) + "_f";

                	estimated[attr_c] = estimated[attr];
                	estimated[attr_f] = estimated[attr];
                }
        	}
        },

        parseGroupAnalysis: function(oil, attr){
            // Checks if oil attribute is one of the group analysis terms
        	// and if so converts to percent
        	if ($.inArray(attr, this.groupAnalysis) >= 0 &&
        			!_.isNull(oil[attr])) {
        		oil[attr] = Math.round((oil[attr] * 100).toFixed(2));

        		if (isNaN(oil[attr])) {
                    oil[attr] = '--';
        		}
            }
        },
	});

	return gnomeOilView;
});
