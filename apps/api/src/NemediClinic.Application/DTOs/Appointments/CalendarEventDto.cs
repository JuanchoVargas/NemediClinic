namespace NemediClinic.Application.DTOs.Appointments;

/// <summary>
/// Forma compatible con FullCalendar (https://fullcalendar.io/docs/event-object).
/// Útil si en el futuro se expone un endpoint que devuelva eventos
/// pre-formateados. Por ahora el frontend mapea AppointmentDto a este shape.
/// </summary>
public class CalendarEventDto
{
    public Guid Id { get; set; }
    public string Title { get; set; } = string.Empty;
    public DateTime Start { get; set; }
    public DateTime End { get; set; }
    public string BackgroundColor { get; set; } = string.Empty;
    public string BorderColor { get; set; } = string.Empty;
    public Dictionary<string, object?> ExtendedProps { get; set; } = new();
}
