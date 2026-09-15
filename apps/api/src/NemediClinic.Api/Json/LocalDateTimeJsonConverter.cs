using System.Globalization;
using System.Text.Json;
using System.Text.Json.Serialization;

namespace NemediClinic.Api.Json;

/// <summary>
/// Regla del sistema: todo DateTime de negocio se maneja en hora local
/// (Bogotá) sin conversión a UTC, en ambas capas.
///
/// Lectura: acepta "yyyy-MM-ddTHH:mm:ss" (sin zona) y lo guarda tal cual
/// como DateTimeKind.Unspecified. Si un cliente envía sufijo "Z" u offset,
/// se convierte a hora local del servidor y se descarta la zona, para que
/// nunca entre un valor UTC "disfrazado" a la base de datos.
///
/// Escritura: siempre "yyyy-MM-ddTHH:mm:ss" sin sufijo "Z". Los campos de
/// auditoría que se generan con DateTime.UtcNow (CreatedAt/UpdatedAt) se
/// convierten a local al serializar.
/// </summary>
public sealed class LocalDateTimeJsonConverter : JsonConverter<DateTime>
{
    private const string Format = "yyyy-MM-dd'T'HH:mm:ss";

    public override DateTime Read(ref Utf8JsonReader reader, Type typeToConvert, JsonSerializerOptions options)
    {
        var raw = reader.GetString();
        if (string.IsNullOrWhiteSpace(raw))
            throw new JsonException("Fecha vacía.");

        // RoundtripKind conserva la zona solo si el texto la trae.
        var parsed = DateTime.Parse(raw, CultureInfo.InvariantCulture, DateTimeStyles.RoundtripKind);

        return parsed.Kind switch
        {
            DateTimeKind.Utc => DateTime.SpecifyKind(parsed.ToLocalTime(), DateTimeKind.Unspecified),
            DateTimeKind.Local => DateTime.SpecifyKind(parsed, DateTimeKind.Unspecified),
            _ => parsed
        };
    }

    public override void Write(Utf8JsonWriter writer, DateTime value, JsonSerializerOptions options)
    {
        var local = value.Kind == DateTimeKind.Utc ? value.ToLocalTime() : value;
        writer.WriteStringValue(local.ToString(Format, CultureInfo.InvariantCulture));
    }
}
