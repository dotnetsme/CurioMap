# CurioMap API — production image (built via GitHub Actions, run on Fly.io)
FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build
WORKDIR /src
COPY backend/CurioMap.slnx backend/CurioMap.slnx
COPY backend/src backend/src
COPY backend/tests backend/tests
RUN dotnet build backend/CurioMap.slnx --no-ignore-errors -v q

FROM mcr.microsoft.com/dotnet/sdk:10.0 AS runtime
WORKDIR /app
COPY --from=build /src/backend/src/CurioMap.Api/CurioMap.Api.csproj /app/
COPY --from=build /src/backend/src/CurioMap.Api/bin /app/bin
ENV PORT=8080
EXPOSE 8080
HEALTHCHECK --interval=15s --timeout=5s --retries=5 \
  CMD wget -qO- http://127.0.0.1:8080/health || exit 1
CMD ["dotnet", "run", "--project", "/app/CurioMap.Api.csproj", "--no-build", "--", "--port", "8080"]