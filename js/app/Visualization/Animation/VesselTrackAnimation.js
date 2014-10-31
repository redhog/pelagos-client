define(["app/Class", "app/Visualization/Animation/Animation"], function(Class, Animation) {
  var VesselTrackAnimation = Class(Animation, {
    name: "VesselTrackAnimation",

    columns: {
      longitude: {type: "Float32", hidden: true, source: {longitude: 1.0}},
      latitude: {type: "Float32", hidden: true, source: {latitude: 1.0}},

      sigma: {type: "Float32", source: {sigma: 1}, min: 0.0, max: 1.0},
      weight: {type: "Float32", source: {weight: 1}, min: 0.0, max: 1.0},

      time: {type: "Float32", hidden: true, source: {datetime: 1.0}},

      filter: {type: "Float32", source: {_: null, timerange: -1.0, active_category: -1.0}}
    },

    selections: $.extend(
      {active_category: {sortcols: ["category"], max_range_count: 3, data: {category: [-1.0/0.0, 1.0/0.0]}, header: {length: 2}}},
      Animation.prototype.selections
    ),

    programSpecs: {
      programTrack: {
        context: "gl",
        vertex: "app/Visualization/Animation/VesselTrackAnimation-vertex.glsl",
        fragment: "app/Visualization/Animation/VesselTrackAnimation-fragment.glsl"
      }
    },

    getDrawMode: function (program) {
      var self = this;
      return program.gl.LINE_STRIP;
    }
  });

  Animation.animationClasses.VesselTrackAnimation = VesselTrackAnimation;

  return VesselTrackAnimation;
});
