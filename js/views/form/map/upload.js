define([
    'underscore',
    'jquery',
    'backbone',
    'views/modal/form',
    'views/default/dzone',
    'model/map/bna'
], function(_, $, Backbone, FormModal,
            Dzone, MapBNAModel) {
    var mapUploadForm = FormModal.extend({
        title: 'Upload Shoreline File',
        className: 'modal form-modal upload-form',
        buttons: '<div class="btn btn-danger" data-dismiss="modal">Cancel</div>',

        events: function(){
            /*
            var formModalHash = FormModal.prototype.events;

            delete formModalHash['change input'];
            delete formModalHash['keyup input'];
            formModalHash['change input:not(tbody input)'] = 'update';
            formModalHash['keyup input:not(tbody input)'] = 'update';
            */
            return _.defaults({
                'click .cancel': 'close',
                'click .save': 'proceed'
            }, FormModal.prototype.events);
        },

        initialize: function(options){
            FormModal.prototype.initialize.call(this, options);
        },

        render: function(){
            this.body = _.template('<div id="upload_form"></div>')();
            FormModal.prototype.render.call(this);

            this.dzone = new Dzone({
                maxFiles: 1,
                maxFilesize: webgnome.config.upload_limits.map,
                autoProcessQueue:true,
                //acceptedFiles: '.bna',
                dictDefaultMessage: 'Drop <code>.bna</code> file here to upload (or click to navigate)'
            });
            this.$('#upload_form').append(this.dzone.$el);

            this.listenTo(this.dzone, 'upload_complete', _.bind(this.loaded, this));
        },

        loaded: function(fileList, name){
            $.post(webgnome.config.api + '/map/upload',
                {'file_list': JSON.stringify(fileList),
                 'obj_type': MapBNAModel.prototype.defaults().obj_type,
                 'name': name,
                 'session': localStorage.getItem('session')
                }
            ).done(_.bind(function(response) {
                var map = new MapBNAModel(JSON.parse(response));
                webgnome.model.set('map', map);
                webgnome.model.save();
                this.close();
            }, this)).fail(
                _.bind(this.dzone.reset, this.dzone)
            );
        },
        close: function() {
            if (this.dzone) {
                this.dzone.close();
            }

            FormModal.prototype.close.call(this);
        },

        activateFile: function(filePath) {
            if (this.$('.popover').length === 0) {
                var thisForm = this;

                $.post('/map/activate', {'file-name': filePath})
                .done(function(response){
                    thisForm.loaded(filePath, response);
                });
            }
        }
    });

    return mapUploadForm;
});
