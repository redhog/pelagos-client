#pragma include 'attrmapper';
#pragma include 'app/Visualization/Animation/mercator.glsl';

uniform mat4 mapMatrix;

void main() {
  mapper();
  gl_Position = lonlat2screen(vec2(_longitude, _latitude), mapMatrix);
  gl_PointSize = 2.0;
}
