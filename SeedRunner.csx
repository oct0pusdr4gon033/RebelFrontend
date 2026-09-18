// SeedRunner.csx — Script de C# para generar hashes correctos e insertarlos
// Ejecutar con: dotnet script SeedRunner.csx
// O lo corremos directamente desde un endpoint de la API

using Microsoft.AspNetCore.Identity;

var hasher = new PasswordHasher<object>();
var dummy = new object();

var usuarios = new[]
{
    new { email = "admin@rebelqueen.com",  pwd = "Admin123"  },
    new { email = "laura@rebelqueen.com",  pwd = "Pass1234"  },
    new { email = "pedro@rebelqueen.com",  pwd = "Master123" },
    new { email = "maria@rebelqueen.com",  pwd = "Ejec1234"  },
};

foreach (var u in usuarios)
{
    var hash = hasher.HashPassword(dummy, u.pwd);
    Console.WriteLine($"-- {u.email} / {u.pwd}");
    Console.WriteLine($"-- Hash: {hash}");
    Console.WriteLine();
}
