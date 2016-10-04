define([
  "require",
  "app/Class",
  "app/Data/Ajax",
  "app/LoadingInfo",
  "app/Data/CartoDBInfoWindow",
  "app/Visualization/Animation/ObjectToTable",
  "app/Visualization/Animation/Animation",
  "shims/async/main",
  "shims/cartodb/main"
], function(
  require,
  Class,
  Ajax,
  LoadingInfo,
  CartoDBInfoWindow,
  ObjectToTable,
  Animation,
  async,
  cartodb
) {
  var CartoDBAnimation = Class(Animation, {
    name: "CartoDBAnimation",

    destroy: function () {
      var self = this;

      self.layer.remove();
    },

    initGl: function(cb) {
      var self = this;

      var cartoLayer = cartodb.createLayer(
        self.manager.map, self.source.args.url, {infowindow: false}
      ).addTo(
        /* Note: This is does not support adding another layer before cb() is called
         * Make sure to serialize this properly. */
        self.manager.map, self.manager.map.overlayMapTypes.length
      ).on('done', function(layer) {
        self.layer = layer;
      
        if (self.layer.getSubLayers) {
          self.layer.getSubLayers().map(function (subLayer) {
            subLayer.setInteraction(true); // Interaction for that layer must be enabled
            cartodb.vis.Vis.addCursorInteraction(self.manager.map, subLayer);
          });
        }

        if (self.layer.getTimeBounds) {
          // This is a torque layer

          self.manager.visualization.state.events.on({
            time: self.timeChanged.bind(self),
            timeExtent: self.timeChanged.bind(self)
          });

          self.layer.stop();
        }
          
        self.layer.on('featureOver', self.handleMouseOver.bind(self));
        self.layer.on('mouseout', self.handleMouseOut.bind(self));

        self.setVisible(self.visible);

        cb();
      }).on("error", function (err) {
        self.handleError(err);
        self.manager.visualization.data.events.triggerEvent("error", {
          url: self.source.args.url,
          toString: function () {
            return 'Unable to load CartoDB layer ' + this.url;
          }
        });
        cb(err);
      });
    },

    setTime: function (timestamp) {
      var self = this;

      var bounds = self.layer.getTimeBounds();
      self.layer.setStep(
          Math.floor(
              bounds.steps * (timestamp.getTime() - bounds.start) / (bounds.end - bounds.start)));
    },

    timeChanged: function () {
      var self = this;

      var end = self.manager.visualization.state.getValue("time");
      if (end == undefined) return;

      self.setTime(new Date(end.getTime() - self.manager.visualization.state.getValue("timeExtent") / 2.0));
    },

    handleMouseOver: function (event, latlng, pos, data, layerIndex) {
      var self = this;
      self.mouseOver = arguments;
    },
    handleMouseOut: function () {
      var self = this;
      self.mouseOver = undefined;
    },

    /* This is a bit of a hack, working around the normal selection
     * system. But all of this layer is a bit of a hack :) */
    handleClick: function (type, event, latlng, pos, data, layerIndex) {
      var self = this;

      if (type == 'selected') {
        self.manager.events.triggerEvent('info-loading', {});
      }

      var url = "CartoDB://" + self.source.args.url + "?" + JSON.stringify(data);

      LoadingInfo.main.add(url, true);

      new CartoDBInfoWindow(data.cartodb_id, self.layer).fetch(function(info) {
        LoadingInfo.main.remove(url);

        var data = {
          html: info.html,
          report: self.report,
          polygonData: info.data,
          toString: function () { return this.html; }
        };

        var selectionData = {
          latitude: latlng[0],
          longitude: latlng[1]
        };

        self.manager.handleInfo(self, type, undefined, data, selectionData);
      });
    },

    setVisible: function (visible) {
      var self = this;
      self.visible = visible;
      if (visible) {
        self.layer.show();
      } else {
        self.layer.hide();
      }
    },

    initUpdates: function(cb) { cb(); },

    draw: function () {},

    select: function (rowidx, type, replace, event) {
      var self = this;

      if (type != 'selected' && type != 'info') return;

      if (self.mouseOver) {
        self.handleClick.apply(self, [type].concat(Array.prototype.slice.call(self.mouseOver)));
      } else if (type == "selected" && self.selected) {
        self.selected = false;
        self.manager.events.triggerEvent('info', {});
      }
    },

    getSelectionInfo: function (type, cb) {
      var self = this;

      if (type !== undefined) return cb("Not implemented", null);

      var info;
      var title;
      async.series([
        function (cb) {
          Ajax.get(self.source.args.url, {}, function (err, data) {
            if (err) return cb(err);
            title = data.title;
            info = data.description || "";
            cb();
          });
        },
        function (cb) {
          try {
            info = JSON.parse(info);
            cb();
          } catch (e) {
            if (info.indexOf('://') != -1 && info.indexOf('<') == -1) {
              Ajax.get(info, {}, function (err, data) {
                if (err) return cb(err);
                info = JSON.parse(data);
                cb();
              });
            } else {
              info = {'description': info};
              cb();
            }
          }
        }
      ], function (err) {
        if (err) return cb(err);
        if (title) info.title = title;
        info.toString = function () {
          return ObjectToTable(this);
        };
        cb(null, info);
      });
    }
  });
  CartoDBAnimation.layerIndex = 0;

  Animation.animationClasses.CartoDBAnimation = CartoDBAnimation;

  return CartoDBAnimation;
});
