package com.arcbank.sucursales.repository;

import com.arcbank.sucursales.model.Sucursal;
import org.socialsignin.spring.data.dynamodb.repository.EnableScan;
import org.springframework.data.repository.CrudRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
@EnableScan
public interface SucursalRepository extends CrudRepository<Sucursal, String> {

    Optional<Sucursal> findByCodigoUnico(String codigoUnico);

    List<Sucursal> findByUbicacionProvinciaNombre(String provincia);

    List<Sucursal> findByUbicacionCantonNombre(String canton);

    List<Sucursal> findByUbicacionParroquiaNombre(String parroquia);
}
