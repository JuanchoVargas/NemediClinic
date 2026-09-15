# ── Build ──────────────────────────────────────────────────────
FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
WORKDIR /src

# Restore primero (capa cacheable): solo sln + csproj
COPY NemediClinic.sln ./
COPY src/NemediClinic.Domain/NemediClinic.Domain.csproj                 src/NemediClinic.Domain/
COPY src/NemediClinic.Application/NemediClinic.Application.csproj       src/NemediClinic.Application/
COPY src/NemediClinic.Infrastructure/NemediClinic.Infrastructure.csproj src/NemediClinic.Infrastructure/
COPY src/NemediClinic.Api/NemediClinic.Api.csproj                       src/NemediClinic.Api/
RUN dotnet restore src/NemediClinic.Api/NemediClinic.Api.csproj

COPY src/ src/
RUN dotnet publish src/NemediClinic.Api/NemediClinic.Api.csproj -c Release -o /app/publish --no-restore

# ── Runtime ────────────────────────────────────────────────────
FROM mcr.microsoft.com/dotnet/aspnet:8.0 AS runtime
WORKDIR /app
COPY --from=build /app/publish .

ENV ASPNETCORE_ENVIRONMENT=Production \
    ASPNETCORE_HTTP_PORTS=8080 \
    DOTNET_RUNNING_IN_CONTAINER=true

EXPOSE 8080

# Usuario no root que trae la imagen oficial (uid 1654)
USER app

ENTRYPOINT ["dotnet", "NemediClinic.Api.dll"]
