// SeedUsers2.csx — Script de C# para 20 Ejecutivos(as) de Ventas
// Ejecutar con: dotnet script SeedUsers2.csx
// Genera usuarios en AspNetUsers, AspNetUserRoles y Empleados

using Microsoft.AspNetCore.Identity;

var hasher = new PasswordHasher<object>();
var dummy = new object();

var usuarios = new[]
{
    new { nombres = "Ana", apellidos = "Rodríguez Mendoza", email = "ana.rodriguez@rebelqueen.com", pwd = "Ejec1234", dni = "70100001", tel = "987100001", sedeId = 1 },
    new { nombres = "Lucía", apellidos = "Morales Quispe", email = "lucia.morales@rebelqueen.com", pwd = "Ejec1234", dni = "70100002", tel = "987100002", sedeId = 2 },
    new { nombres = "Diego", apellidos = "Castillo Vargas", email = "diego.castillo@rebelqueen.com", pwd = "Ejec1234", dni = "70100003", tel = "987100003", sedeId = 1 },
    new { nombres = "Camila", apellidos = "Flores Huamán", email = "camila.flores@rebelqueen.com", pwd = "Ejec1234", dni = "70100004", tel = "987100004", sedeId = 2 },
    new { nombres = "Javier", apellidos = "Silva Ramos", email = "javier.silva@rebelqueen.com", pwd = "Ejec1234", dni = "70100005", tel = "987100005", sedeId = 1 },
    new { nombres = "Valeria", apellidos = "Torres Alva", email = "valeria.torres@rebelqueen.com", pwd = "Ejec1234", dni = "70100006", tel = "987100006", sedeId = 2 },
    new { nombres = "Mateo", apellidos = "Chávez Romero", email = "mateo.chavez@rebelqueen.com", pwd = "Ejec1234", dni = "70100007", tel = "987100007", sedeId = 1 },
    new { nombres = "Sofía", apellidos = "Herrera Castro", email = "sofia.herrera@rebelqueen.com", pwd = "Ejec1234", dni = "70100008", tel = "987100008", sedeId = 2 },
    new { nombres = "Alejandro", apellidos = "Paredes Rojas", email = "alejandro.paredes@rebelqueen.com", pwd = "Ejec1234", dni = "70100009", tel = "987100009", sedeId = 1 },
    new { nombres = "Daniela", apellidos = "Ríos Vega", email = "daniela.rios@rebelqueen.com", pwd = "Ejec1234", dni = "70100010", tel = "987100010", sedeId = 2 },
    new { nombres = "Gabriel", apellidos = "Navarro Cruz", email = "gabriel.navarro@rebelqueen.com", pwd = "Ejec1234", dni = "70100011", tel = "987100011", sedeId = 1 },
    new { nombres = "Natalia", apellidos = "Gómez Espinoza", email = "natalia.gomez@rebelqueen.com", pwd = "Ejec1234", dni = "70100012", tel = "987100012", sedeId = 2 },
    new { nombres = "Fernando", apellidos = "Mendoza Ortiz", email = "fernando.mendoza@rebelqueen.com", pwd = "Ejec1234", dni = "70100013", tel = "987100013", sedeId = 1 },
    new { nombres = "Carolina", apellidos = "Díaz Soto", email = "carolina.diaz@rebelqueen.com", pwd = "Ejec1234", dni = "70100014", tel = "987100014", sedeId = 2 },
    new { nombres = "Rodrigo", apellidos = "Aguilar Benites", email = "rodrigo.aguilar@rebelqueen.com", pwd = "Ejec1234", dni = "70100015", tel = "987100015", sedeId = 1 },
    new { nombres = "Andrea", apellidos = "Salazar Campos", email = "andrea.salazar@rebelqueen.com", pwd = "Ejec1234", dni = "70100016", tel = "987100016", sedeId = 2 },
    new { nombres = "Sebastián", apellidos = "Cordero Ruiz", email = "sebastian.cordero@rebelqueen.com", pwd = "Ejec1234", dni = "70100017", tel = "987100017", sedeId = 1 },
    new { nombres = "Paula", apellidos = "Guerrero Ponce", email = "paula.guerrero@rebelqueen.com", pwd = "Ejec1234", dni = "70100018", tel = "987100018", sedeId = 2 },
    new { nombres = "Esteban", apellidos = "Vílchez Lozano", email = "esteban.vilchez@rebelqueen.com", pwd = "Ejec1234", dni = "70100019", tel = "987100019", sedeId = 1 },
    new { nombres = "Elena", apellidos = "Miranda Delgado", email = "elena.miranda@rebelqueen.com", pwd = "Ejec1234", dni = "70100020", tel = "987100020", sedeId = 2 },
};

foreach (var u in usuarios)
{
    var hash = hasher.HashPassword(dummy, u.pwd);
    Console.WriteLine($"-- {u.email} / {u.pwd} | {u.nombres} {u.apellidos} (DNI: {u.dni})");
    Console.WriteLine($"-- Hash: {hash}");
    Console.WriteLine();
}
