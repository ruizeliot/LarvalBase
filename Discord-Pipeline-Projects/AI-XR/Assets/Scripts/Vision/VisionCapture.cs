using System;
using UnityEngine;

namespace AIXR.Vision
{
    /// <summary>
    /// Captures WebCamTexture frames and encodes them as JPEG bytes.
    /// Reuses CameraFeedDisplay pattern from PodGab.
    /// No client-side quality check -- images sent as-is to VLM (EC-2).
    /// </summary>
    public class VisionCapture
    {
        public int JpegQuality { get; }
        public bool IsCapturing { get; private set; }

        public VisionCapture(int jpegQuality = 80)
        {
            JpegQuality = jpegQuality;
        }

        public void StartCapture()
        {
            IsCapturing = true;
        }

        public void StopCapture()
        {
            IsCapturing = false;
        }

        /// <summary>
        /// Capture a frame from pixel data and encode as JPEG.
        /// In Unity runtime: pixels come from WebCamTexture.GetPixels32().
        /// No quality check, no preprocessing -- send as-is (EC-2).
        /// </summary>
        public byte[] CaptureFrame(Color32[] pixels, int width, int height)
        {
            if (pixels == null || pixels.Length == 0 || width <= 0 || height <= 0)
                return Array.Empty<byte>();

            // In Unity: Texture2D.SetPixels32(pixels) -> EncodeToJPG(quality)
            // For testing: return a minimal valid byte array representing encoded data
#if UNITY_5_3_OR_NEWER
            var texture = new Texture2D(width, height, TextureFormat.RGBA32, false);
            texture.SetPixels32(pixels);
            texture.Apply();
            var jpegBytes = texture.EncodeToJPG(JpegQuality);
            UnityEngine.Object.Destroy(texture);
            return jpegBytes;
#else
            // Test stub: return raw pixel data as "encoded" bytes
            var result = new byte[pixels.Length * 4];
            for (int i = 0; i < pixels.Length; i++)
            {
                result[i * 4] = pixels[i].r;
                result[i * 4 + 1] = pixels[i].g;
                result[i * 4 + 2] = pixels[i].b;
                result[i * 4 + 3] = pixels[i].a;
            }
            return result;
#endif
        }
    }
}
