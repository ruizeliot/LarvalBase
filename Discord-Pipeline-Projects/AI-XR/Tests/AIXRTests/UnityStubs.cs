// Unity API stubs for testing outside Unity Editor.
// These provide minimal type signatures so core logic compiles with dotnet.
// At runtime in Unity, the real UnityEngine types are used instead.

#if !UNITY_5_3_OR_NEWER

namespace UnityEngine
{
    public class Object { public string name = ""; }
    public class MonoBehaviour : Object { }
    public class ScriptableObject : Object { }
    public class AudioClip : Object { public float length; }
    public struct Vector3
    {
        public float x, y, z;
        public Vector3(float x, float y, float z) { this.x = x; this.y = y; this.z = z; }
        public static Vector3 zero => new(0, 0, 0);
    }
    public struct Quaternion
    {
        public float x, y, z, w;
        public static Quaternion identity => new() { w = 1 };
    }
    public struct Color
    {
        public float r, g, b, a;
        public Color(float r, float g, float b, float a = 1f) { this.r = r; this.g = g; this.b = b; this.a = a; }
        public static Color red => new(1, 0, 0);
        public static Color green => new(0, 1, 0);
        public static Color gray => new(0.5f, 0.5f, 0.5f);
        public static Color white => new(1, 1, 1);
    }

    public struct Color32
    {
        public byte r, g, b, a;
        public Color32(byte r, byte g, byte b, byte a) { this.r = r; this.g = g; this.b = b; this.a = a; }
    }

    public static class Debug
    {
        public static void Log(object message) { }
        public static void LogWarning(object message) { }
        public static void LogError(object message) { }
    }

    public static class Application
    {
        public static string streamingAssetsPath => System.IO.Path.Combine(
            System.IO.Directory.GetCurrentDirectory(), "StreamingAssets");
    }

    public static class JsonUtility
    {
        public static string ToJson(object obj, bool prettyPrint = false)
        {
            return Newtonsoft.Json.JsonConvert.SerializeObject(obj,
                prettyPrint ? Newtonsoft.Json.Formatting.Indented : Newtonsoft.Json.Formatting.None);
        }

        public static T FromJson<T>(string json)
        {
            return Newtonsoft.Json.JsonConvert.DeserializeObject<T>(json)!;
        }

        public static void FromJsonOverwrite(string json, object objectToOverwrite)
        {
            Newtonsoft.Json.JsonConvert.PopulateObject(json, objectToOverwrite);
        }
    }

    // Attribute stubs
    public class SerializeField : System.Attribute { }
    public class HeaderAttribute : System.Attribute
    {
        public HeaderAttribute(string header) { }
    }
    public class TooltipAttribute : System.Attribute
    {
        public TooltipAttribute(string tooltip) { }
    }
    public class SerializableAttribute : System.Attribute { }
}

#endif
