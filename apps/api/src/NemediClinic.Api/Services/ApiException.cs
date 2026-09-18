using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Filters;

namespace NemediClinic.Api.Services;

/// <summary>
/// Error de negocio lanzado desde un service. El filtro lo traduce al contrato de error
/// del API ({ error }), así el controller queda delgado: recibe, llama al service y responde.
/// </summary>
public class ApiException : Exception
{
    public int StatusCode { get; }

    public ApiException(int statusCode, string message) : base(message)
    {
        StatusCode = statusCode;
    }

    public static ApiException NotFound(string message) => new(StatusCodes.Status404NotFound, message);
    public static ApiException Conflict(string message) => new(StatusCodes.Status409Conflict, message);
    public static ApiException BadRequest(string message) => new(StatusCodes.Status400BadRequest, message);
}

public class ApiExceptionFilter : IExceptionFilter
{
    public void OnException(ExceptionContext context)
    {
        if (context.Exception is not ApiException ex)
            return;

        context.Result = new ObjectResult(new { error = ex.Message }) { StatusCode = ex.StatusCode };
        context.ExceptionHandled = true;
    }
}
