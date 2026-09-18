namespace NemediClinic.Application.DTOs.ClinicalRecords;

/// <summary>Respuesta de POST …/notes: la nota y lo que quedó bajo el mínimo tras descontar.</summary>
public class CreateClinicalNoteResponse
{
    public ClinicalNoteDto Nota { get; set; } = new();
    public List<NemediClinic.Application.DTOs.Inventory.StockAlertaDto> AlertasStock { get; set; } = [];
}

public class ClinicalNoteDto
{
    public Guid Id { get; set; }
    public Guid? AppointmentId { get; set; }
    public Guid EsteticistId { get; set; }
    public string EsteticistNombre { get; set; } = string.Empty;
    public string Procedimiento { get; set; } = string.Empty;
    public string Observaciones { get; set; } = string.Empty;
    /// <summary>Texto libre heredado: solo las notas anteriores al consumo de cabina lo traen.</summary>
    public string? ProductosUsados { get; set; }
    /// <summary>Consumo de cabina de la sesión.</summary>
    public List<NemediClinic.Application.DTOs.Inventory.ClinicalNoteProductDto> Productos { get; set; } = [];
    public List<NemediClinic.Application.DTOs.Files.EvolutionPhotoDto> Fotos { get; set; } = [];
    public DateTime FechaCreacion { get; set; }
}
