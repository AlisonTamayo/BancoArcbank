package com.arcbank.sucursales.model;

import com.amazonaws.services.dynamodbv2.datamodeling.DynamoDBAttribute;
import com.amazonaws.services.dynamodbv2.datamodeling.DynamoDBDocument;
import lombok.Getter;
import lombok.Setter;

import java.util.Objects;

@DynamoDBDocument
@Getter
@Setter
public class EntidadBancaria {

    @DynamoDBAttribute
    private String nombre;
    @DynamoDBAttribute
    private String ruc;
    @DynamoDBAttribute
    private String estado;

    public EntidadBancaria() {
    }

    @Override
    public boolean equals(Object o) {
        if (this == o)
            return true;
        if (o == null || getClass() != o.getClass())
            return false;
        EntidadBancaria that = (EntidadBancaria) o;
        return Objects.equals(ruc, that.ruc);
    }

    @Override
    public int hashCode() {
        return Objects.hash(ruc);
    }

    @Override
    public String toString() {
        return "EntidadBancaria{" +
                "nombre='" + nombre + '\'' +
                ", ruc='" + ruc + '\'' +
                ", estado='" + estado + '\'' +
                '}';
    }
}
