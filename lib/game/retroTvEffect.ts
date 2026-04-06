import { BlendFunction, Effect } from "postprocessing";
import { Uniform } from "three";

const fragmentShader = `
uniform float barrelStrength;
uniform float vignetteIntensity;
uniform float scanlineIntensity;

void mainImage(const in vec4 inputColor, const in vec2 uv, out vec4 outputColor) {
  vec2 p = uv * 2.0 - 1.0;
  float d = dot(p, p);
  vec2 distorted = p * (1.0 + barrelStrength * d);
  vec2 uv2 = distorted * 0.5 + 0.5;
  if (uv2.x <= 0.0 || uv2.x >= 1.0 || uv2.y <= 0.0 || uv2.y >= 1.0) {
    outputColor = vec4(0.04, 0.04, 0.04, 1.0);
    return;
  }
  vec4 color = texture(inputBuffer, uv2);
  float vig = 1.0 - vignetteIntensity * smoothstep(0.32, 1.5, length(p));
  color.rgb *= max(vig, 0.1);
  float scan = sin(uv.y * 1200.0);
  color.rgb *= 1.0 - scanlineIntensity * (0.5 + 0.5 * scan * scan);
  outputColor = color;
}
`;

export class RetroTvEffect extends Effect {
  constructor({
    barrelStrength = 0.14,
    vignetteIntensity = 0.62,
    scanlineIntensity = 0.11,
  } = {}) {
    super("RetroTvEffect", fragmentShader, {
      blendFunction: BlendFunction.NORMAL,
      uniforms: new Map<string, Uniform>([
        ["barrelStrength", new Uniform(barrelStrength)],
        ["vignetteIntensity", new Uniform(vignetteIntensity)],
        ["scanlineIntensity", new Uniform(scanlineIntensity)],
      ]),
    });
  }
}
