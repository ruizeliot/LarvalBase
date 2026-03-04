namespace AIXR.Error
{
    /// <summary>
    /// Structured error code following pattern: {BRICK}_{HTTP_CODE|ERROR_TYPE}
    /// </summary>
    public class ErrorCode
    {
        public string Code { get; }
        public string Brick { get; }
        public string ErrorType { get; }

        public ErrorCode(string brick, string errorType)
        {
            Brick = brick.ToUpperInvariant();
            ErrorType = errorType.ToUpperInvariant();
            Code = $"{Brick}_{ErrorType}";
        }

        public override string ToString() => Code;

        public static ErrorCode Timeout(string brick) => new(brick, "TIMEOUT");
        public static ErrorCode Network(string brick) => new(brick, "NETWORK");
        public static ErrorCode Http(string brick, int statusCode) => new(brick, statusCode.ToString());
        public static ErrorCode Auth(string brick) => new(brick, "401");
        public static ErrorCode RateLimit(string brick) => new(brick, "429");
    }
}
