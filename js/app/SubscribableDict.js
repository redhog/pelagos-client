define(["app/Class", "app/Events", "app/Logging"], function(Class, Events, Logging) {
  return Class({
    name: "SubscribableDict",
    /*
      spec = {
        zoom: {default_value: 3},
        latitude: {default_value: 10.47}
      }
    */
    initialize: function(spec) {
      var self = this;

      self.spec = spec;
      self.values = {};
      self.events = new Events("SubscribableDict");
    },

    validateValue: function(name, spec, value) {
      var self = this;
      if (!spec || value == undefined) return;
      if (spec.type) {
        if (typeof spec.type == "string") {
          if (typeof value != spec.type) {
            throw "Value " + value.toString() + " for " + name + " is not of type " + spec.type;
          }
        } else {
          if (!(typeof value == "object" && value instanceof spec.type)) {
            throw "Value " + value.toString() + " for " + name + " is not an instance of " + spec.type.name;
          }
        }
      }
      if (spec.validate) {
        spec.validate(value)
      }
    },

    setValue: function(name, value) {
      var self = this;
      self.spec && self.validateValue(name, self.spec[name], value);
      var old = self.values[name];
      self.values[name] = value;
      var event = {
        name: name,
        new_value: value,
        old_value: old,
        toString: function () {
          var o = this.old_value != undefined ? this.old_value.toString() : "undefined";
          var n = this.new_value != undefined ? this.new_value.toString() : "undefined";
          return this.name + " = " + o + " -> " + n;
        }
      };
      self.events.triggerEvent(name, event);
      self.events.triggerEvent("set", event);
    },

    getValue: function(name) {
      var self = this;
      if (self.values[name] != undefined) {
        return self.values[name];
      } else {
        return self.spec[name] && self.spec[name].default_value;
      }
    },

    toggleValue: function(name) {
      this.setValue(name, !this.getValue(name));
    },

    incValue: function(name) {
      this.setValue(name, this.getValue(name) + 1);
    },

    decValue: function(name) {
      this.setValue(name, this.getValue(name) - 1);
    }
  });
});
