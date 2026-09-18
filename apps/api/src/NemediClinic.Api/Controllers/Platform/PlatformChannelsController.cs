using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using NemediClinic.Api.Services;
using NemediClinic.Application.DTOs.Platform;
using NemediClinic.Domain.Enums;

namespace NemediClinic.Api.Controllers.Platform;

[ApiController]
[Route("api/v1/platform/channels")]
[Authorize(Policy = "PlatformAdmin")]
public class PlatformChannelsController : ControllerBase
{
    private readonly ChannelService _service;

    public PlatformChannelsController(ChannelService service) => _service = service;

    [HttpGet]
    public async Task<ActionResult<List<ChannelDto>>> List() => Ok(await _service.ListAsync());

    [HttpGet("{id:guid}")]
    public async Task<ActionResult<ChannelDto>> Get(Guid id) => Ok(await _service.GetAsync(id));

    [HttpPost]
    public async Task<ActionResult<ChannelDto>> Create([FromBody] SaveChannelRequest request)
    {
        var channel = await _service.CreateAsync(request);
        return CreatedAtAction(nameof(Get), new { id = channel.Id }, channel);
    }

    [HttpPut("{id:guid}")]
    public async Task<ActionResult<ChannelDto>> Update(Guid id, [FromBody] SaveChannelRequest request) =>
        Ok(await _service.UpdateAsync(id, request));

    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Delete(Guid id)
    {
        await _service.DeleteAsync(id);
        return NoContent();
    }
}
