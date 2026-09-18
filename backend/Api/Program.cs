using Aplicacion.Services;
using Data.Context;
using Data.Repository;
using Data.Services;
using Domain.Interfaces.Repositories;
using Domain.Interfaces.Services;
using Domain.Models;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using Scalar.AspNetCore;
using System.Text;

AppContext.SetSwitch("Npgsql.EnableLegacyTimestampBehavior", true);
var builder = WebApplication.CreateBuilder(args);

// ── 1. CORS ──────────────────────────────────────────────────────────────────
// Permite peticiones desde el frontend (Vite dev + cualquier puerto local)
const string CORS_POLICY = "FrontendPolicy";

builder.Services.AddCors(options =>
{
    options.AddPolicy(CORS_POLICY, policy =>
    {
        policy
            .WithOrigins(
                "http://localhost:5173",
                "http://localhost:5174",
                "https://localhost:5173",
                "https://localhost:5174"
            )
            .AllowAnyHeader()       // Authorization, Content-Type, etc.
            .AllowAnyMethod()       // GET, POST, PUT, DELETE, OPTIONS
            .AllowCredentials();    // Cookies / credenciales
    });
});

// ── 2. DbContext con PostgreSQL ───────────────────────────────────────────────
builder.Services.AddDbContext<AppDBContext>(options =>
    options.UseNpgsql(builder.Configuration.GetConnectionString("DefaultConnection")));

// ── 3. ASP.NET Core Identity ──────────────────────────────────────────────────
builder.Services.AddIdentity<AppUser, Rol>(options =>
{
    options.Password.RequireDigit           = true;
    options.Password.RequiredLength         = 8;
    options.Password.RequireNonAlphanumeric = false;
    options.Password.RequireUppercase       = true;
    options.Password.RequireLowercase       = true;
    options.User.RequireUniqueEmail         = true;
    options.Lockout.DefaultLockoutTimeSpan  = TimeSpan.FromMinutes(5);
    options.Lockout.MaxFailedAccessAttempts = 5;
    options.Lockout.AllowedForNewUsers      = true;
})
.AddEntityFrameworkStores<AppDBContext>()
.AddDefaultTokenProviders();

// ── 4. Autenticacion JWT ──────────────────────────────────────────────────────
var jwtKey = builder.Configuration["Jwt:Key"]
    ?? throw new InvalidOperationException("JWT Key no configurada en appsettings.");

builder.Services.AddAuthentication(options =>
{
    options.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
    options.DefaultChallengeScheme    = JwtBearerDefaults.AuthenticationScheme;
})
.AddJwtBearer(options =>
{
    options.TokenValidationParameters = new TokenValidationParameters
    {
        ValidateIssuer           = true,
        ValidateAudience         = true,
        ValidateLifetime         = true,
        ValidateIssuerSigningKey = true,
        ValidIssuer              = builder.Configuration["Jwt:Issuer"],
        ValidAudience            = builder.Configuration["Jwt:Audience"],
        IssuerSigningKey         = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtKey)),
        ClockSkew                = TimeSpan.Zero
    };
});

// ── 5. Inyeccion de dependencias ──────────────────────────────────────────────
// Repositorios
builder.Services.AddScoped<IEmpleadoRepository, EmpleadoRepository>();
builder.Services.AddScoped<IOportunidadRepository, OportunidadRepository>();
builder.Services.AddScoped<IMarcaRepository, MarcaRepository>();
builder.Services.AddScoped<IAcuerdoMarcoRepository, AcuerdoMarcoRepository>();
builder.Services.AddScoped<IEmpresaRepository, EmpresaRepository>();
builder.Services.AddScoped<ISedeRepository, SedeRepository>();

// Servicios de infraestructura y aplicación
builder.Services.AddScoped<ITokenService, JwtTokenService>();
builder.Services.AddScoped<IAuthService, AuthService>();
builder.Services.AddScoped<IOportunidadService, OportunidadService>();
builder.Services.AddScoped<ISedeService, SedeService>();
builder.Services.AddScoped<IEmpleadoService, EmpleadoService>();
builder.Services.AddScoped<IUsuarioService, UsuarioService>();

// ── 6. Controladores y OpenAPI ────────────────────────────────────────────────
builder.Services.AddControllers();
builder.Services.AddOpenApi();

var app = builder.Build();

// ── 7. Pipeline HTTP ──────────────────────────────────────────────────────────
if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
    app.MapScalarApiReference(options =>
    {
        options.WithOpenApiRoutePattern("/openapi/{documentName}.json");
    });
}

app.UseHttpsRedirection();

// CORS debe ir ANTES de Authentication/Authorization
app.UseCors(CORS_POLICY);

app.UseAuthentication();   // Debe ir ANTES de UseAuthorization
app.UseAuthorization();

app.MapControllers();

// ── 8. Seed de datos (solo Development) ───────────────────────────────────────
if (app.Environment.IsDevelopment())
{
    
}

app.Run();
