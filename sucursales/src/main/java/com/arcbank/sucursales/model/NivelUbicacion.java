package com.arcbank.sucursales.model;

import com.amazonaws.services.dynamodbv2.datamodeling.DynamoDBAttribute;
import com.amazonaws.services.dynamodbv2.datamodeling.DynamoDBDocument;
import lombok.Getter;
import lombok.Setter;

import java.util.Objects;

@DynamoDBDocument
@Getter
@Setter
public class NivelUbicacion {

    @DynamoDBAttribute
    private String nombre;
    @DynamoDBAttribute
    private String codigo;

    public NivelUbicacion() {
    }

    @Override
    public boolean equals(Object o) {
        if (this == o)
            return true;
        if (o == null || getClass() != o.getClass())
            return false;
        NivelUbicacion that = (NivelUbicacion) o;
        return Objects.equals(nombre, that.nombre) &&
                Objects.equals(codigo, that.codigo);
    }

    @Override
    public int hashCode() {
        return Objects.hash(nombre, codigo);
    }

    @Override
    public String toString() {
        return "NivelUbicacion{" +
                "nombre='" + nombre + '\'' +
                ", codigo='" + codigo + '\'' +
                '}';
    }
}
