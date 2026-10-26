"use client";

/* eslint-disable @next/next/no-img-element -- MJPEG streams must bypass image optimization. */

import { useEffect, useRef, useState, type CSSProperties } from "react";

type WebGLStreamProps = {
  src: string;
  alt: string;
  className: string;
  style: CSSProperties;
  fit: "cover" | "contain";
  enhanced: boolean;
  onLoad: () => void;
  onError: () => void;
  onEnhancementUnavailable: () => void;
};

const VERTEX_SHADER = `#version 300 es
out vec2 vUv;
void main() {
  vec2 point = vec2(float((gl_VertexID << 1) & 2), float(gl_VertexID & 2));
  vUv = point * 0.5;
  gl_Position = vec4(point * 2.0 - 1.0, 0.0, 1.0);
}`;

// Direction-adaptive 4x4 reconstruction: estimate the local edge tangent from
// luma gradients, then widen the reconstruction kernel along the edge and keep
// it tight across the edge. Neighborhood clamping limits ringing.
const RECONSTRUCTION_SHADER = `#version 300 es
precision highp float;
in vec2 vUv;
uniform sampler2D uImage;
uniform vec2 uSourceSize;
uniform vec2 uOutputSize;
uniform int uFitMode;
out vec4 outColor;
float cubic(float x) {
  x = abs(x);
  if (x < 1.0) return 1.5*x*x*x - 2.5*x*x + 1.0;
  if (x < 2.0) return -0.5*x*x*x + 2.5*x*x - 4.0*x + 2.0;
  return 0.0;
}
float luminance(vec2 uv) {
  return dot(texture(uImage, uv).rgb, vec3(0.299, 0.587, 0.114));
}
vec2 fitUv(vec2 uv) {
  float sourceRatio = uSourceSize.x / uSourceSize.y;
  float outputRatio = uOutputSize.x / uOutputSize.y;
  if (uFitMode == 1) {
    if (sourceRatio > outputRatio) {
      float visible = outputRatio / sourceRatio;
      uv.y = (uv.y - 0.5) / visible + 0.5;
    } else {
      float visible = sourceRatio / outputRatio;
      uv.x = (uv.x - 0.5) / visible + 0.5;
    }
    return uv;
  }
  if (sourceRatio > outputRatio) {
    float visible = outputRatio / sourceRatio;
    uv.x = (uv.x - 0.5) * visible + 0.5;
  } else {
    float visible = sourceRatio / outputRatio;
    uv.y = (uv.y - 0.5) * visible + 0.5;
  }
  return uv;
}
void main() {
  vec2 fittedUv = fitUv(vUv);
  if (any(lessThan(fittedUv, vec2(0.0))) || any(greaterThan(fittedUv, vec2(1.0)))) {
    outColor = vec4(0.0, 0.0, 0.0, 1.0);
    return;
  }
  vec2 uv = fittedUv;
  vec2 position = uv * uSourceSize - 0.5;
  vec2 base = floor(position);
  vec2 fraction = fract(position);
  vec2 centerUv = (base + 0.5) / uSourceSize;
  float west = luminance(centerUv - vec2(1.0 / uSourceSize.x, 0.0));
  float east = luminance(centerUv + vec2(1.0 / uSourceSize.x, 0.0));
  float north = luminance(centerUv - vec2(0.0, 1.0 / uSourceSize.y));
  float south = luminance(centerUv + vec2(0.0, 1.0 / uSourceSize.y));
  vec2 gradient = vec2(east - west, south - north);
  float edgeStrength = clamp(length(gradient) * 4.0, 0.0, 1.0);
  vec2 tangent = length(gradient) > 0.0001 ? normalize(vec2(-gradient.y, gradient.x)) : vec2(1.0, 0.0);
  tangent = normalize(mix(vec2(1.0, 0.0), tangent, edgeStrength));
  vec2 normal = vec2(-tangent.y, tangent.x);
  vec4 sum = vec4(0.0);
  vec4 low = vec4(1.0);
  vec4 high = vec4(0.0);
  float total = 0.0;
  for (int y = -1; y <= 2; y++) {
    for (int x = -1; x <= 2; x++) {
      vec2 sampleOffset = vec2(float(x), float(y)) - fraction;
      vec2 sampleUv = (base + vec2(float(x), float(y)) + 0.5) / uSourceSize;
      vec4 sampleColor = texture(uImage, sampleUv);
      float alongEdge = dot(sampleOffset, tangent);
      float acrossEdge = dot(sampleOffset, normal);
      float weight = cubic(alongEdge * mix(1.0, 0.72, edgeStrength))
        * cubic(acrossEdge * mix(1.0, 1.3, edgeStrength));
      sum += sampleColor * weight;
      total += weight;
      low = min(low, sampleColor);
      high = max(high, sampleColor);
    }
  }
  outColor = vec4(clamp(sum / max(total, 0.0001), low.rgb, high.rgb), 1.0);
}`;

// RCAS-style contrast-adaptive sharpening. Gain tapers in high-contrast regions
// to preserve fine leaf detail without bright halos.
const SHARPEN_SHADER = `#version 300 es
precision highp float;
in vec2 vUv;
uniform sampler2D uImage;
uniform vec2 uTexel;
out vec4 outColor;
void main() {
  vec3 center = texture(uImage, vUv).rgb;
  vec3 north = texture(uImage, vUv + vec2(0.0, -uTexel.y)).rgb;
  vec3 south = texture(uImage, vUv + vec2(0.0, uTexel.y)).rgb;
  vec3 west = texture(uImage, vUv + vec2(-uTexel.x, 0.0)).rgb;
  vec3 east = texture(uImage, vUv + vec2(uTexel.x, 0.0)).rgb;
  vec3 low = min(center, min(min(north, south), min(west, east)));
  vec3 high = max(center, max(max(north, south), max(west, east)));
  vec3 average = (north + south + west + east) * 0.25;
  float contrast = max(max(high.r - low.r, high.g - low.g), high.b - low.b);
  float gain = 0.32 / (1.0 + contrast * 5.0);
  vec3 sharpened = center + (center - average) * gain;
  outColor = vec4(clamp(sharpened, low, high), 1.0);
}`;

function compileShader(gl: WebGL2RenderingContext, type: number, source: string) {
  const shader = gl.createShader(type);
  if (!shader) throw new Error("WebGL shader allocation failed");
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    const message = gl.getShaderInfoLog(shader) || "WebGL shader compilation failed";
    gl.deleteShader(shader);
    throw new Error(message);
  }
  return shader;
}

function createProgram(gl: WebGL2RenderingContext, fragmentSource: string) {
  const vertex = compileShader(gl, gl.VERTEX_SHADER, VERTEX_SHADER);
  const fragment = compileShader(gl, gl.FRAGMENT_SHADER, fragmentSource);
  const program = gl.createProgram();
  if (!program) throw new Error("WebGL program allocation failed");
  gl.attachShader(program, vertex);
  gl.attachShader(program, fragment);
  gl.linkProgram(program);
  gl.deleteShader(vertex);
  gl.deleteShader(fragment);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    const message = gl.getProgramInfoLog(program) || "WebGL program linking failed";
    gl.deleteProgram(program);
    throw new Error(message);
  }
  return program;
}

export default function WebGLStream({
  src,
  alt,
  className,
  style,
  fit,
  enhanced,
  onLoad,
  onError,
  onEnhancementUnavailable,
}: WebGLStreamProps) {
  const imageRef = useRef<HTMLImageElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [fallbackIdentity, setFallbackIdentity] = useState<string | null>(null);
  const streamIdentity = `${src}:${enhanced}`;
  const plainFallback = fallbackIdentity === streamIdentity;

  useEffect(() => {
    if (!enhanced || plainFallback) return;
    const canvas = canvasRef.current;
    const image = imageRef.current;
    if (!canvas || !image) return;

    let gl: WebGL2RenderingContext | null = null;
    let frameId = 0;
    let stopped = false;
    let sourceTexture: WebGLTexture | null = null;
    let intermediateTexture: WebGLTexture | null = null;
    let framebuffer: WebGLFramebuffer | null = null;
    let reconstruction: WebGLProgram | null = null;
    let sharpening: WebGLProgram | null = null;
    let lastFrameAt = 0;

    const fallback = () => {
      if (stopped) return;
      stopped = true;
      cancelAnimationFrame(frameId);
      setFallbackIdentity(streamIdentity);
      onEnhancementUnavailable();
    };
    const handleContextLost = (event: Event) => {
      event.preventDefault();
      fallback();
    };
    canvas.addEventListener("webglcontextlost", handleContextLost);

    try {
      gl = canvas.getContext("webgl2", { alpha: false, antialias: false, powerPreference: "low-power" });
      if (!gl) throw new Error("WebGL2 is not available");
      reconstruction = createProgram(gl, RECONSTRUCTION_SHADER);
      sharpening = createProgram(gl, SHARPEN_SHADER);
      sourceTexture = gl.createTexture();
      intermediateTexture = gl.createTexture();
      framebuffer = gl.createFramebuffer();
      if (!sourceTexture || !intermediateTexture || !framebuffer) throw new Error("WebGL resource allocation failed");

      gl.bindTexture(gl.TEXTURE_2D, sourceTexture);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

      gl.bindTexture(gl.TEXTURE_2D, intermediateTexture);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      const initialWidth = Math.max(1, Math.min(1920, Math.round(canvas.clientWidth * Math.min(window.devicePixelRatio || 1, 1.5))));
      const initialHeight = Math.max(1, Math.min(1080, Math.round(canvas.clientHeight * Math.min(window.devicePixelRatio || 1, 1.5))));
      canvas.width = initialWidth;
      canvas.height = initialHeight;
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, initialWidth, initialHeight, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
      gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);
      gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, intermediateTexture, 0);
      if (gl.checkFramebufferStatus(gl.FRAMEBUFFER) !== gl.FRAMEBUFFER_COMPLETE) {
        throw new Error("WebGL framebuffer is incomplete");
      }
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
      gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, 1);

      const draw = (timestamp: number) => {
        if (stopped) return;
        frameId = requestAnimationFrame(draw);
        if (timestamp - lastFrameAt < 66 || !image.complete || !image.naturalWidth) return;
        lastFrameAt = timestamp;

        try {
          const width = Math.max(1, Math.min(1920, Math.round(canvas.clientWidth * Math.min(window.devicePixelRatio || 1, 1.5))));
          const height = Math.max(1, Math.min(1080, Math.round(canvas.clientHeight * Math.min(window.devicePixelRatio || 1, 1.5))));
          if (canvas.width !== width || canvas.height !== height) {
            canvas.width = width;
            canvas.height = height;
            gl!.bindTexture(gl!.TEXTURE_2D, intermediateTexture);
            gl!.texImage2D(gl!.TEXTURE_2D, 0, gl!.RGBA8, width, height, 0, gl!.RGBA, gl!.UNSIGNED_BYTE, null);
            gl!.bindFramebuffer(gl!.FRAMEBUFFER, framebuffer);
            gl!.framebufferTexture2D(gl!.FRAMEBUFFER, gl!.COLOR_ATTACHMENT0, gl!.TEXTURE_2D, intermediateTexture, 0);
          }

          gl!.activeTexture(gl!.TEXTURE0);
          gl!.bindTexture(gl!.TEXTURE_2D, sourceTexture);
          gl!.texImage2D(gl!.TEXTURE_2D, 0, gl!.RGBA, gl!.RGBA, gl!.UNSIGNED_BYTE, image);
          gl!.viewport(0, 0, width, height);
          gl!.bindFramebuffer(gl!.FRAMEBUFFER, framebuffer);
          gl!.useProgram(reconstruction);
          gl!.uniform1i(gl!.getUniformLocation(reconstruction!, "uImage"), 0);
          gl!.uniform2f(gl!.getUniformLocation(reconstruction!, "uSourceSize"), image.naturalWidth, image.naturalHeight);
          gl!.uniform2f(gl!.getUniformLocation(reconstruction!, "uOutputSize"), width, height);
          gl!.uniform1i(gl!.getUniformLocation(reconstruction!, "uFitMode"), fit === "contain" ? 1 : 0);
          gl!.drawArrays(gl!.TRIANGLES, 0, 3);

          gl!.bindFramebuffer(gl!.FRAMEBUFFER, null);
          gl!.bindTexture(gl!.TEXTURE_2D, intermediateTexture);
          gl!.useProgram(sharpening);
          gl!.uniform1i(gl!.getUniformLocation(sharpening!, "uImage"), 0);
          gl!.uniform2f(gl!.getUniformLocation(sharpening!, "uTexel"), 1 / width, 1 / height);
          gl!.drawArrays(gl!.TRIANGLES, 0, 3);
          canvas.style.opacity = "1";
        } catch {
          // A missing CORS response taints the source and makes texImage2D throw.
          fallback();
        }
      };

      frameId = requestAnimationFrame(draw);
    } catch {
      fallback();
    }

    return () => {
      stopped = true;
      canvas.removeEventListener("webglcontextlost", handleContextLost);
      cancelAnimationFrame(frameId);
      canvas.style.opacity = "0";
      if (gl) {
        if (sourceTexture) gl.deleteTexture(sourceTexture);
        if (intermediateTexture) gl.deleteTexture(intermediateTexture);
        if (framebuffer) gl.deleteFramebuffer(framebuffer);
        if (reconstruction) gl.deleteProgram(reconstruction);
        if (sharpening) gl.deleteProgram(sharpening);
      }
    };
  }, [enhanced, fit, onEnhancementUnavailable, plainFallback, streamIdentity]);

  return (
    <>
      <img
        key={`${src}:${enhanced}:${plainFallback}`}
        ref={imageRef}
        crossOrigin={enhanced && !plainFallback ? "anonymous" : undefined}
        src={src}
        alt={alt}
        onLoad={onLoad}
        onError={() => {
          if (enhanced && !plainFallback) {
            setFallbackIdentity(streamIdentity);
            onEnhancementUnavailable();
            return;
          }
          onError();
        }}
        className={className}
        style={{ ...style, opacity: enhanced && !plainFallback ? 0 : 1 }}
      />
      {enhanced && !plainFallback && (
        <canvas
          ref={canvasRef}
          aria-hidden="true"
          className={className}
          style={{ ...style, pointerEvents: "none" }}
        />
      )}
    </>
  );
}