package com.arcbank.sucursales.mapper;

import com.arcbank.sucursales.dto.request.SucursalRequest;
import com.arcbank.sucursales.dto.response.SucursalDTO;
import com.arcbank.sucursales.model.*;

import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.Named;

import java.util.Collections;
import java.util.List;
import java.util.stream.Collectors;

@Mapper(componentModel = "spring")
public interface GeoLevelMapper {

    // ── Request → Entity ──
    @Mapping(target = "idSucursal", ignore = true)
    @Mapping(target = "estado", constant = "ACTIVO")
    @Mapping(target = "fechaApertura", expression = "java(java.time.LocalDate.now())")
    @Mapping(target = "entidadBancaria", expression = "java(toEntidadBancaria(request))")
    @Mapping(target = "ubicacion", expression = "java(toUbicacion(request))")
    Sucursal toEntity(SucursalRequest request);

    // ── Entity → DTO ──
    @Mapping(target = "entidadBancaria", source = "entidadBancaria", qualifiedByName = "entidadToDTO")
    @Mapping(target = "ubicacion", source = ".", qualifiedByName = "ubicacionToDTO")
    SucursalDTO toDTO(Sucursal sucursal);

    // ── Custom mapping methods ──

    @Named("entidadToDTO")
    default SucursalDTO.EntidadBancariaDTO entidadToDTO(EntidadBancaria entidad) {
        if (entidad == null)
            return null;
        SucursalDTO.EntidadBancariaDTO dto = new SucursalDTO.EntidadBancariaDTO();
        dto.setNombre(entidad.getNombre());
        dto.setRuc(entidad.getRuc());
        dto.setEstado(entidad.getEstado());
        return dto;
    }

    @Named("ubicacionToDTO")
    default SucursalDTO.UbicacionDTO ubicacionToDTO(Sucursal sucursal) {
        if (sucursal.getUbicacion() == null)
            return null;
        Ubicacion ub = sucursal.getUbicacion();
        SucursalDTO.UbicacionDTO dto = new SucursalDTO.UbicacionDTO();
        dto.setProvincia(ub.getProvincia() != null ? ub.getProvincia().getNombre() : null);
        dto.setCanton(ub.getCanton() != null ? ub.getCanton().getNombre() : null);
        dto.setParroquia(ub.getParroquia() != null ? ub.getParroquia().getNombre() : null);

        if (ub.getFeriados() != null) {
            List<SucursalDTO.FeriadoDTO> feriados = new java.util.ArrayList<>();
            addFeriados(feriados, ub.getFeriados().getProvincia());
            addFeriados(feriados, ub.getFeriados().getCanton());
            addFeriados(feriados, ub.getFeriados().getParroquia());
            dto.setFeriados(feriados);
        } else {
            dto.setFeriados(Collections.emptyList());
        }
        return dto;
    }

    // helper
    default void addFeriados(List<SucursalDTO.FeriadoDTO> target, List<Feriado> source) {
        if (source == null)
            return;
        for (Feriado f : source) {
            SucursalDTO.FeriadoDTO fd = new SucursalDTO.FeriadoDTO();
            fd.setFecha(f.getFecha());
            fd.setDescripcion(f.getDescripcion());
            fd.setTipoFeriado(f.getTipoFeriado());
            fd.setActivo(f.getActivo() != null && f.getActivo());
            target.add(fd);
        }
    }

    // ── Inline builders for toEntity ──

    default EntidadBancaria toEntidadBancaria(SucursalRequest req) {
        EntidadBancaria eb = new EntidadBancaria();
        eb.setNombre(req.getEntidadNombre());
        eb.setRuc(req.getEntidadRuc());
        eb.setEstado("ACTIVO");
        return eb;
    }

    default Ubicacion toUbicacion(SucursalRequest req) {
        Ubicacion ub = new Ubicacion();
        NivelUbicacion prov = new NivelUbicacion();
        prov.setNombre(req.getProvincia());
        ub.setProvincia(prov);

        NivelUbicacion cant = new NivelUbicacion();
        cant.setNombre(req.getCanton());
        ub.setCanton(cant);

        NivelUbicacion parr = new NivelUbicacion();
        parr.setNombre(req.getParroquia());
        ub.setParroquia(parr);
        return ub;
    }
}
