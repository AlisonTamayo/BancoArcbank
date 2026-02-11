package com.arcbank.sucursales.service;

import com.arcbank.sucursales.dto.request.SucursalRequest;
import com.arcbank.sucursales.dto.response.SucursalDTO;
import com.arcbank.sucursales.exception.ResourceNotFoundException;
import com.arcbank.sucursales.mapper.GeoLevelMapper;
import com.arcbank.sucursales.model.Sucursal;
import com.arcbank.sucursales.repository.SucursalRepository;
import lombok.AllArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;
import java.util.stream.Collectors;
import java.util.stream.StreamSupport;

@Service
@AllArgsConstructor
@Slf4j
public class SucursalService {

    private final SucursalRepository sucursalRepository;
    private final GeoLevelMapper geoLevelMapper;

    public SucursalDTO create(SucursalRequest request) {
        log.info("Creando sucursal con código {}", request.getCodigoUnico());

        sucursalRepository.findByCodigoUnico(request.getCodigoUnico())
                .ifPresent(s -> {
                    throw new IllegalArgumentException("codigoUnico ya existe: " + request.getCodigoUnico());
                });

        Sucursal sucursal = geoLevelMapper.toEntity(request);
        Sucursal saved = sucursalRepository.save(sucursal);

        return geoLevelMapper.toDTO(saved);
    }

    public SucursalDTO update(String id, SucursalRequest request) {
        log.info("Actualizando sucursal {}", id);

        Sucursal existente = sucursalRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Sucursal no encontrada: " + id));

        existente.setNombre(request.getNombre());
        existente.setDireccion(request.getDireccion());
        existente.setTelefono(request.getTelefono());
        existente.setLatitud(request.getLatitud());
        existente.setLongitud(request.getLongitud());

        Sucursal saved = sucursalRepository.save(existente);
        return geoLevelMapper.toDTO(saved);
    }

    public void delete(String id) {
        log.info("Eliminando sucursal {}", id);
        Sucursal sucursal = sucursalRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Sucursal no encontrada: " + id));
        sucursalRepository.delete(sucursal);
    }

    public SucursalDTO findById(String id) {
        log.info("Buscando sucursal por id {}", id);
        Sucursal sucursal = sucursalRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Sucursal no encontrada: " + id));
        return geoLevelMapper.toDTO(sucursal);
    }

    public SucursalDTO findByCodigoUnico(String codigoUnico) {
        log.info("Buscando sucursal por código {}", codigoUnico);
        Sucursal sucursal = sucursalRepository.findByCodigoUnico(codigoUnico)
                .orElseThrow(() -> new ResourceNotFoundException("Sucursal no encontrada: " + codigoUnico));
        return geoLevelMapper.toDTO(sucursal);
    }

    public List<SucursalDTO> findAll() {
        log.info("Listando todas las sucursales");
        return StreamSupport.stream(sucursalRepository.findAll().spliterator(), false)
                .map(geoLevelMapper::toDTO)
                .collect(Collectors.toList());
    }

    public List<SucursalDTO> findByProvincia(String provincia) {
        log.info("Buscando sucursales por provincia {}", provincia);
        return sucursalRepository.findByUbicacionProvinciaNombre(provincia)
                .stream()
                .map(geoLevelMapper::toDTO)
                .collect(Collectors.toList());
    }

    public List<SucursalDTO> findByCanton(String canton) {
        log.info("Buscando sucursales por cantón {}", canton);
        return sucursalRepository.findByUbicacionCantonNombre(canton)
                .stream()
                .map(geoLevelMapper::toDTO)
                .collect(Collectors.toList());
    }

    public List<SucursalDTO> findByParroquia(String parroquia) {
        log.info("Buscando sucursales por parroquia {}", parroquia);
        return sucursalRepository.findByUbicacionParroquiaNombre(parroquia)
                .stream()
                .map(geoLevelMapper::toDTO)
                .collect(Collectors.toList());
    }

    public List<SucursalDTO.FeriadoDTO> getFeriados(String codigoUnico) {
        log.info("Obteniendo feriados para sucursal {}", codigoUnico);

        Sucursal sucursal = sucursalRepository.findByCodigoUnico(codigoUnico)
                .orElseThrow(() -> new ResourceNotFoundException("Sucursal no encontrada: " + codigoUnico));

        SucursalDTO dto = geoLevelMapper.toDTO(sucursal);

        if (dto.getUbicacion() == null || dto.getUbicacion().getFeriados() == null) {
            return List.of();
        }
        return dto.getUbicacion().getFeriados();
    }
}
