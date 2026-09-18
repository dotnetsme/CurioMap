# CurioMap API — production image (built via GitHub Actions, run on Fly.io)
FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build
WORKDIR /src
COPY NuGet.config NuGet.config
COPY backend/CurioMap.slnx backend/CurioMap.slnx
COPY backend/src/CurioMap.Api/CurioMap.Api.csproj backend/src/CurioMap.Api/CurioMap.Api.csproj
COPY backend/tests/CurioMap.Api.Tests/CurioMap.Api.Tests.csproj backend/tests/CurioMap.Api.Tests/CurioMap.Api.Tests.csproj
RUN dotnet restore backend/CurioMap.slnx
COPY backend/src backend/src
RUN dotnet publish backend/src/CurioMap.Api/CurioMap.Api.csproj -c Release -o /publish --nologo

FROM mcr.microsoft.com/dotnet/aspnet:10.0 AS runtime
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends curl && rm -rf /var/lib/apt/lists/*
COPY --from=build /publish ./
ENV PORT=8080
ENV ASPNETCORE_URLS=http://+:8080
EXPOSE 8080
HEALTHCHECK --interval=15s --timeout=5s --retries=5 \
  CMD curl -f http://127.0.0.1:8080/health || exit 1
ENTRYPOINT ["dotnet", "CurioMap.Api.dll"]