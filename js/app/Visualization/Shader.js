define(["app/Class", "async", "jQuery"], function(Class, async, $) {
  var Shader = Class({name: "Shader"});

  /* Load array data into gl buffers and bind that buffer to a shader
   * program attribute */
  Shader.programLoadArray = function(gl, glbuffer, arraydata, program) {
    gl.bindBuffer(gl.ARRAY_BUFFER, glbuffer);
    gl.bufferData(gl.ARRAY_BUFFER, arraydata, gl.STATIC_DRAW);
  };

  Shader.programBindArray = function(gl, glbuffer, program, attrname, size, type, stride, offset) {
    if (program.attributes[attrname] == undefined) {
      console.warn(["Attempted to set an non-existent attribute " + attrname + ".", program]);
    } else {
      gl.bindBuffer(gl.ARRAY_BUFFER, glbuffer);
      gl.enableVertexAttribArray(program.attributes[attrname]);
      gl.vertexAttribPointer(program.attributes[attrname], size, type, false, stride || 0, offset || 0);
    }
  };

  Shader.preprocess = function(src, context, cb) {
    // FIXME: Async + $.get(require.toUrl()) stuff

    cb(src.split("\n").map(function (line) {
      if (line.indexOf('#pragma include') == -1) return line;

      var key = line.match(/#pragma include '(.*)';/)[1];
      return context[key];

    }).join("\n"));
  };

  Shader.createShaderProgramFromUrl = function(gl, vertexShaderUrl, fragmentShaderUrl, context, cb) {
    var vertexSrc;
    var fragmentSrc;
    async.series([
      function (cb) { $.get(vertexShaderUrl, function (data) { Shader.preprocess(data, context, function (data) { vertexSrc = data; cb(); }); }, "text"); },
      function (cb) { $.get(fragmentShaderUrl, function (data) { Shader.preprocess(data, context, function (data) { fragmentSrc = data; cb(); }); }, "text"); },
      function (dummy) { cb(Shader.createShaderProgramFromSource(gl, vertexSrc, fragmentSrc)); }
    ]);
  }

  Shader.createShaderProgramFromSource = function(gl, vertexSrc, fragmentSrc) {
      console.log("===={vertex shader}====\n" + vertexSrc +
        "===={fragment shader}====\n" + fragmentSrc);


    // create vertex shader
    var vertexShader = gl.createShader(gl.VERTEX_SHADER);
    gl.shaderSource(vertexShader, vertexSrc);
    gl.compileShader(vertexShader);

    if (!gl.getShaderParameter(vertexShader, gl.COMPILE_STATUS)) {
      throw gl.getShaderInfoLog(vertexShader);
    }

    // create fragment shader
    var fragmentShader = gl.createShader(gl.FRAGMENT_SHADER);
    gl.shaderSource(fragmentShader, fragmentSrc);
    gl.compileShader(fragmentShader);

    if (!gl.getShaderParameter(fragmentShader, gl.COMPILE_STATUS)) {
      throw gl.getShaderInfoLog(fragmentShader);
    }

    // link shaders to create our program
    var program = gl.createProgram();
    program.gl = gl;
    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);
    gl.linkProgram(program);

    gl.useProgram(program);

    // Collect attribute locations to make binding easier in the code using this program
    program.attributes = {};
    for (var i = 0; i < gl.getProgramParameter(program, gl.ACTIVE_ATTRIBUTES); i++) {
      var name = gl.getActiveAttrib(program, i).name;
      program.attributes[name] = gl.getAttribLocation(program, name);
    }

    program.uniforms = {};
    for (var i = 0; i < gl.getProgramParameter(program, gl.ACTIVE_UNIFORMS); i++) {
      var name = gl.getActiveUniform(program, i).name;
      program.uniforms[name] = gl.getUniformLocation(program, name);
    }

    return program;
  };

  Shader.compileMapping = function(srcColsByName, dstNames) {
    var attrDec = Object.keys(srcColsByName).map(function (srcName) {
      return 'attribute float ' + srcName + ';'
    }).join('\n') + '\n';

    var paramDec = dstNames.map(function (dstName) {
      return 'float _' + dstName + ';'
    }).join('\n') + '\n';

    var mappingDec = dstNames.map(function (dstName) {
      return 'uniform float attrmap_' + dstName + '_from_const;\n' +
        Object.keys(srcColsByName).map(function (srcName) {
          return 'uniform float attrmap_' + dstName + '_from_' + srcName + ';'
        }).join('\n');
    }).join('\n') + '\n';

    var mapper = 'void attrmapper() {\n' +
      dstNames.map(function (dstName) {
        return '  _' + dstName + ' = attrmap_' + dstName + '_from_const + \n' +
          Object.keys(srcColsByName).map(function (srcName) {
            return '    attrmap_' + dstName + '_from_' + srcName + ' * ' + srcName
          }).join('+ \n') + ';';
      }).join('\n') +
      '\n}';

    var mapping = attrDec + paramDec + mappingDec + mapper;
    return mapping;
  };

  return Shader;
});
