using System.Diagnostics.CodeAnalysis;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Http;
using Serilog.Context;

namespace Nemedi.CRM.Api.Infrastructure.Middleware;

public class CorrelationIdMiddleware {
	public const string HeaderName = "x-correlation-id";
	private readonly RequestDelegate _next;

	public CorrelationIdMiddleware(RequestDelegate next) {
		_next = next;
	}

	public async Task InvokeAsync(HttpContext context) {
		var correlationId = GetOrCreateCorrelationId(context);

		// Add to response header for client visibility
		context.Response.OnStarting(() => {
			if (!context.Response.Headers.ContainsKey(HeaderName))
				context.Response.Headers.Add(HeaderName, correlationId);
			return Task.CompletedTask;
		});

		// Push to Serilog log context so it's attached to all logs in this request scope
		using (LogContext.PushProperty("CorrelationId", correlationId)) {
			await _next(context);
		}
	}

	private static string GetOrCreateCorrelationId(HttpContext context) {
		if (context.Request.Headers.TryGetValue(HeaderName, out var values)) {
			var headerValue = values.ToString();
			if (!string.IsNullOrWhiteSpace(headerValue))
				return headerValue;
		}
		return Guid.NewGuid().ToString("n");
	}
}

public static class CorrelationIdMiddlewareExtensions {
	public static IApplicationBuilder UseCorrelationId(this IApplicationBuilder app) {
		return app.UseMiddleware<CorrelationIdMiddleware>();
	}
}
