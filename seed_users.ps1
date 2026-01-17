# Seed script for Arcbank (Corrected)

# 1. Insert Tipo de Cuenta (db_cuentas)
Write-Host "Inserting Tipo de Cuenta..."
docker exec -i db-cuentas-arcbank2 psql -U postgres -d db_cuentas -c "INSERT INTO tipo_cuenta_ahorro (id_tipo_cuenta, nombre, descripcion, activo, amortizacion, tasa_interes_maxima) VALUES (1, 'AHORROS', 'Cuenta Ahorros Standard', true, 'MENSUAL', 5.0) ON CONFLICT (id_tipo_cuenta) DO NOTHING;"

# 2. Insert Cliente (microcliente)
Write-Host "Inserting Cliente..."
docker exec -i db-clientes-arcbank2 psql -U postgres -d microcliente -c "INSERT INTO cliente (id_cliente, identificacion, clave, nombre_completo, tipo_cliente, tipo_identificacion, estado, fecha_registro) VALUES (1, '1700000000', '123456', 'USUARIO PRUEBAS', 'PERSONA', 'CEDULA', 'ACTIVO', '2025-01-01') ON CONFLICT (id_cliente) DO NOTHING;"

# 3. Insert Persona (microcliente)
Write-Host "Inserting Persona..."
docker exec -i db-clientes-arcbank2 psql -U postgres -d microcliente -c "INSERT INTO persona (id_cliente, nombres, apellidos, fecha_nacimiento, direccion_principal) VALUES (1, 'USUARIO', 'PRUEBAS', '1990-01-01', 'Av. Amazonas') ON CONFLICT (id_cliente) DO NOTHING;"

# 4. Insert Cuenta Ahorro (db_cuentas)
Write-Host "Inserting Cuenta Ahorro..."
docker exec -i db-cuentas-arcbank2 psql -U postgres -d db_cuentas -c "INSERT INTO cuenta_ahorro (id_cliente, id_tipo_cuenta, numero_cuenta, saldo_actual, saldo_disponible, estado, id_sucursal_apertura, fecha_apertura) VALUES (1, 1, '2222220001', 1000.00, 1000.00, 'ACTIVA', 1, '2025-01-01') ON CONFLICT DO NOTHING;"

Write-Host "Seeding completed successfully."
